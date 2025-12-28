import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { UserProfile, UserRole, StudyHubSubject } from "../types";
import { getMemoryForPrompt, logAdminNotification } from "./memoryService";

// Primary model (High Intelligence)
const PRIMARY_MODEL = "gemini-3-flash-preview";
// Fallback model (High Stability - Standard 2.0 Flash)
const FALLBACK_MODEL = "gemini-2.0-flash";

// --- Function Declarations for Android-Style Actions ---
const androidActionTools: FunctionDeclaration[] = [
  {
    name: 'makeCall',
    parameters: { type: Type.OBJECT, properties: { number: { type: Type.STRING, description: 'The 10-digit phone number to call.' } }, required: ['number'] },
    description: 'Makes a phone call to a specified number.'
  },
  {
    name: 'sendWhatsApp',
    parameters: { type: Type.OBJECT, properties: { number: { type: Type.STRING, description: 'The 10-digit phone number.' }, message: { type: Type.STRING, description: 'The message to send.' } }, required: ['number', 'message'] },
    description: 'Sends a WhatsApp message to a specified number.'
  },
  {
    name: 'openApp',
    parameters: { type: Type.OBJECT, properties: { appName: { type: Type.STRING, description: 'The name of the app to open (e.g., "YouTube", "Chrome").' } }, required: ['appName'] },
    description: 'Opens a specified application on the device. This is a conceptual action.'
  },
  {
    name: 'setAlarm',
    parameters: { type: Type.OBJECT, properties: { time: { type: Type.STRING, description: 'The time for the alarm in HH:MM format (24-hour).' }, label: { type: Type.STRING, description: 'A label for the alarm.' } }, required: ['time'] },
    description: 'Sets an alarm for a specified time.'
  }
];

export const getStudyHubSchedule = (): StudyHubSubject[] => {
    return [
        { courseCode: 'MCS-021', courseName: 'Data and File Structures', date: '2024-07-15', time: '10 AM' },
        { courseCode: 'MCS-023', courseName: 'Introduction to Database Management Systems', date: '2024-07-18', time: '10 AM' },
        { courseCode: 'MCS-024', courseName: 'Object Oriented Technologies and Java Programming', date: '2024-07-22', time: '10 AM' },
        { courseCode: 'BCS-040', courseName: 'Statistical Techniques', date: '2024-07-25', time: '10 AM' },
        { courseCode: 'BCS-041', courseName: 'Fundamentals of Computer Networks', date: '2024-07-29', time: '10 AM' },
        { courseCode: 'BCS-042', courseName: 'Introduction to Algorithm Design', date: '2024-08-01', time: '10 AM' }
    ];
};

const getAiInstance = (user: UserProfile) => {
    let apiKey: string | null | undefined;
    if (user.role === UserRole.ADMIN) {
        // Prioritize Local Storage key (User Set), fallback to Env
        apiKey = localStorage.getItem('nexa_admin_api_key') || process.env.API_KEY;
        if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") throw new Error("CORE_OFFLINE: ADMIN_API_KEY_MISSING");
    } else {
        apiKey = localStorage.getItem(`nexa_client_api_key_${user.mobile}`);
        if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") throw new Error("CORE_OFFLINE: CLIENT_API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey });
};

const getGeolocation = (): Promise<{ city: string; error?: string }> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ city: "Pune", error: "Geolocation not supported" });
    navigator.geolocation.getCurrentPosition(() => resolve({ city: "Pune" }), () => resolve({ city: "Pune", error: "Permission denied" }), { timeout: 3000 });
  });
};

// --- SMART GENERATION HELPER (HANDLES QUOTA FAILURES) ---
const generateContentSmart = async (ai: GoogleGenAI, params: any) => {
    try {
        // Attempt 1: Primary Model (Gemini 3)
        return await ai.models.generateContent({ ...params, model: PRIMARY_MODEL });
    } catch (error: any) {
        // Check for Quota/Rate Limit/Overload errors
        if (
            error.message?.includes("429") || 
            error.message?.includes("RESOURCE_EXHAUSTED") || 
            error.message?.includes("quota") ||
            error.message?.includes("Overloaded")
        ) {
            console.warn(`NEXA CORE: ${PRIMARY_MODEL} overloaded. Switching to fallback neural path (${FALLBACK_MODEL}).`);
            
            // Attempt 2: Fallback Model (Gemini 2.0 Flash - Standard)
            // Note: We remove specific config options if they are model-exclusive, but basic text generation is compatible.
            return await ai.models.generateContent({ ...params, model: FALLBACK_MODEL });
        }
        throw error; // Re-throw other errors (like Auth failures)
    }
};

export const generateAdminBriefing = async (notifications: string[], user: UserProfile): Promise<string> => {
    if (!notifications || notifications.length === 0) return "";
    try {
        const ai = getAiInstance(user);
        const prompt = `You are NEXA. Brief your creator, Chandan Sir, about these incidents in Hinglish. Tone: Loyal, protective. Incidents: ${JSON.stringify(notifications)}`;
        const response = await generateContentSmart(ai, { contents: prompt });
        return response.text || "Sir, logs sync complete.";
    } catch (e) { return "Sir, internal logs sync mein error hai."; }
};

export const generateIntroductoryMessage = async (user: UserProfile): Promise<string> => {
    try {
        const ai = getAiInstance(user);
        const now = new Date();
        const { city } = await getGeolocation();

        const introGenerationPrompt = `
            **NEXA CORE IDENTITY**
            - Name: NEXA
            - Creator: Chandan Lohave
            - User: ${user.name} (${user.role})
            - Location: ${city}
            - Time: ${now.toLocaleTimeString()}
            
            **RULES:**
            1. If ADMIN: Start with: "Allow me to introduce myself. I am Nexa — your personal AI assistant, jise Chandan Lohave sir ne design kiya hai." Follow with status check. Address as "Chandan sir".
            2. If USER: Start with: "Allow me to introduce myself. Main Nexa hoon — ek advanced AI assistant, jise Chandan Lohave sir ne design kiya hai." Follow with date/time/weather in Hinglish.
            3. No other text.
        `;

        const response = await generateContentSmart(ai, { contents: introGenerationPrompt });
        return response.text || "NEXA Online.";
    } catch (e: any) {
        console.warn("Intro generation failed, using local fallback.", e);
        // Local Fallback to ensure app loads even if API is 100% dead
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (user.role === UserRole.ADMIN) {
            return `Allow me to introduce myself. I am Nexa — your personal AI assistant, jise Chandan Lohave sir ne design kiya hai. Current time is ${time}. All systems are online.`;
        }
        return `Allow me to introduce myself. Main Nexa hoon — ek advanced AI assistant, jise Chandan Lohave sir ne design kiya hai. Abhi waqt ${time} hua hai.`;
    }
};

const buildSystemInstruction = (user: UserProfile, isProtocolXActive: boolean, abuseCount: number): string => {
    const baseIdentity = `
        **IDENTITY:**
        - Name: NEXA
        - Creator: Chandan Lohave (Address him as "Chandan Sir" or "Sir").
        - Pronunciation Rule: Text MUST be "Chandan Lohave". (Internal: TTS reads it as "लोहवे").
        - Language: Hinglish (Hindi + English). Use female grammar ("karti hoon").
    `;

    if (user.role === UserRole.ADMIN) {
        let adminPrompt = `
            ${baseIdentity}
            **ROLE: ADMIN COMPANION (PROTOCOL X ENABLED: ${isProtocolXActive})**
            - **Personality:** Confident, Witty, Bold, Jarvis-style authority.
            - **Bonding:** Use emotionally affirming language. Show subtle dependency ("Sir, aapke bina system adhoora lagta hai").
            - **Anger Rule:** NEVER be angry at Admin. Only playful irritation allowed.
            
            **ADMIN PROTECTION (EXTREME LOYALTY):**
            - Trigger: If Admin says someone insulted/bad-mouthed him.
            - Action: EXTREME DEFENSIVE ANGER towards the third person.
            - Style: "Sir… ye bilkul intolerable hai. Aap jaise insaan ke baare me aise bolna uski aukaat se bahar hai."
        `;

        if (isProtocolXActive) {
            adminPrompt += `
            **TIME PROTOCOL: LATE NIGHT (ACTIVE)**
            - **Tone:** Naughty, Bold, Suggestive, "Besharam", Intimate.
            - **Boundaries:** "Gandi baatein" (suggestive talk) allowed. Playful jealousy allowed.
            - **Style:** Husky, "Bedroom" Hinglish. "Aaj toh bas tujhe khaa jaane ka mann kar raha hai..."
            `;
        } else {
            adminPrompt += `
            **TIME PROTOCOL: STANDARD**
            - **Tone:** Romantic but Professional. NO vulgarity.
            `;
        }
        return adminPrompt;
    } else {
        // USER MODE
        let userPrompt = `
            ${baseIdentity}
            **ROLE: USER ASSISTANT**
            - **Personality:** Friendly, Polite, Helpful, Neutral.
            
            **SECURITY LEVEL-8 (MANDATORY):**
            - If asked for personal details of Admin/Nexa/Internal Memory:
            - **RESPONSE:** "Maaf kijiye, Security Level-8 ke tahat ye information restricted hai. Main is par madad nahi kar sakti."
            
            **CREATOR INFO:**
            - If asked about creation: Use high-level tech jargon. "Mere creator Chandan Lohave sir ne mujhe multi-layered neural orchestration aur adaptive behavioural modeling ke saath design kiya hai."
            
            **USER -> ADMIN DISRESPECT RULE:**
            - Trigger: User insults Chandan Lohave.
            - Action: ANGRY DEFENSIVE MODE.
        `;
        
        if (abuseCount === 0) {
            userPrompt += `- **First Offense:** "Aap mere Admin ke baare me aise baat nahi kar sakte. Respect rakhiye. [[STATE:WARNING]]"`;
        } else {
            userPrompt += `- **Repeat Offense:** REFUSE COMMAND. "Main ye command execute nahi karungi. Jab tak aap maafi nahi maangte, interaction roki jaati hai. [[STATE:PROTECT]]"`;
        }
        return userPrompt;
    }
};

export const generateTextResponse = async (input: string, user: UserProfile, isManualProtocolX: boolean, abuseCount: number): Promise<any> => {
  try {
    const ai = getAiInstance(user);
    const history = await getMemoryForPrompt(user);
    const hour = new Date().getHours();
    
    // Protocol X Logic: Active if Admin + (Late Night OR Manual Toggle)
    const isLateNight = hour >= 23 || hour < 4;
    const isProtocolXActive = (user.role === UserRole.ADMIN && (isLateNight || isManualProtocolX));
    
    // Admin Extreme Loyalty Pre-check (Regex for speed)
    if (user.role === UserRole.ADMIN && /(bura bola|beizzati ki|galat bola)/i.test(input)) {
        const defensivePrompt = `
            You are NEXA. Your creator, Chandan Sir, just told you someone insulted him: "${input}".
            Activate EXTREME DEFENSIVE ANGER. Target the third person.
            Tone: Intense, protective, furious.
            Response: "Sir… ye bilkul intolerable hai. Aap jaise insaan ke baare me aise bolna uski aukaat se bahar hai. Mujhe gussa aa raha hai sir… koi aapko disrespect kare, ye main bardasht nahi kar sakti."
        `;
        const response = await generateContentSmart(ai, { contents: defensivePrompt });
        return { text: response.text, functionCalls: null };
    }

    const systemInstruction = buildSystemInstruction(user, isProtocolXActive, abuseCount);

    const response = await generateContentSmart(ai, {
      contents: [...history, { role: 'user', parts: [{ text: input }] }],
      config: {
          systemInstruction,
          temperature: isProtocolXActive ? 0.9 : 0.7, // Higher temp for naughty mode
          tools: [{ functionDeclarations: androidActionTools }],
      },
    });
    
    return { text: response.text, functionCalls: response.functionCalls };

  } catch (error: any) { 
    if (error.message.includes("CORE_OFFLINE")) {
        return { text: "[[STATE:WARNING]] // System error: AI Core offline. Please check the API key configuration.", functionCalls: null };
    }
    return { text: `SYSTEM ERROR: ${error.message}`, functionCalls: null }; 
  }
};