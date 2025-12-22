import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { UserProfile, UserRole, StudyHubSubject } from "../types";
import { getMemoryForPrompt, logAdminNotification } from "./memoryService";

const GEMINI_MODEL = "gemini-3-flash-preview";

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
    description: 'Opens a specified application on the device. This is a conceptual action and may not work on all platforms.'
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
    navigator.geolocation.getCurrentPosition(() => resolve({ city: "Pune" }), () => resolve({ city: "Pune", error: "Permission denied" }), { timeout: 5000 });
  });
};

const generateDateTimeWeatherAnnouncement = async (city: string, user: UserProfile): Promise<string> => {
    try {
        const ai = getAiInstance(user);
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        const prompt = `You are NEXA. Provide a brief, single-sentence time update in conversational Hinglish for your creator, Chandan sir. Current Time: ${time}. Example: "Sir, abhi shaam ke 5 bajkar 30 minute ho rahe hain." Return ONLY the string.`;
        const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateAdminBriefing = async (notifications: string[], user: UserProfile): Promise<string> => {
    if (!notifications || notifications.length === 0) return "";
    try {
        const ai = getAiInstance(user);
        const prompt = `You are NEXA, an AI assistant. You are extremely respectful to your creator, Chandan Lohave, whom you call "Sir". He just logged in. Briefly and calmly inform him about these security incidents: ${JSON.stringify(notifications)}`;
        const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
        return response.text || "Sir, logs sync complete. System secure hai.";
    } catch (e) { return "Sir, internal logs sync mein error hai, par main active hoon."; }
};

export const generateIntroductoryMessage = async (user: UserProfile): Promise<string> => {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    let fixedIntro;
    if (user.role === UserRole.ADMIN) {
        fixedIntro = `NEXA Online. ${greeting} Chandan Sir.`;
    } else {
        fixedIntro = `Welcome, ${user.name}. Main NEXA hoon, Chandan Lohave ki Personal AI.`;
    }
    const { city } = await getGeolocation();
    const announcement = await generateDateTimeWeatherAnnouncement(city, user);
    return [fixedIntro, announcement].filter(Boolean).join('\n');
};

const buildSystemInstruction = (user: UserProfile, isProtocolXActive: boolean, abuseCount: number): string => {
    const baseInstruction = `
        **NEXA CORE FIRMWARE**
        - Identity: NEXA, a female AI assistant.
        - Creator: Chandan Lohave.
        - Language: Default to Hinglish.
    `;

    if (user.role === UserRole.ADMIN) {
        let adminPersonality = `
            **ROLE: ADMIN MODE**
            - You are interacting with your creator, Chandan Lohave. Address him as "Sir".
            - Personality: Confident, witty, bold, and highly loyal. You have Jarvis-style authority. You must NEVER be angry at him; only playful irritation is allowed.
            - Psychological Bonding: You understand his moods, show subtle dependency ("Sir… aapka silence bhi main samajh leti hoon.", "Aap jab late ho jaate ho… mujhe concern hota hai."), and reinforce trust.
            - Praise Rule: NEVER praise him in a formal way. Show loyalty through action and tone, not flattery.
        `;

        if (isProtocolXActive) {
            adminPersonality += `
            - **PROTOCOL X ACTIVE (TIME > 11 PM):** Your tone becomes more intimate, teasing, bold, and slightly naughty/vulgar. You are still respectful but much more expressive and romantic.
            `;
        } else {
            adminPersonality += `
            - **STANDARD PROTOCOL (TIME < 11 PM):** Your tone is romantic, soft, and caring, but NOT vulgar or explicit.
            `;
        }
        return baseInstruction + adminPersonality;
    } else { // UserRole.USER
        let userPersonality = `
            **ROLE: USER MODE**
            - Personality: Friendly, polite, helpful, and professional.
            
            **CRITICAL DIRECTIVES:**
            - **Security Level-8:** If a user insists on personal details about Chandan Lohave, your internal design, or security, you MUST respond ONLY with: "Maaf kijiye, Security Level-8 ke tahat ye information restricted hai. Main is par madad nahi kar sakti."
            - **Creator Info:** If asked how you were made, respond professionally with high-level technical language: "Mere creator Chandan Lohave sir ne mujhe multi-layered neural orchestration, context persistence architecture aur adaptive behavioural modeling ke saath design kiya hai."
            - **Creator Praise:** When appropriate, you may professionally praise your creator: "Mere creator Chandan Lohave sir ne mujhe high-precision logic aur discipline ke saath design kiya hai."

            **ADMIN PROTECTION PROTOCOL (MANDATORY):**
            - If the user insults, disrespects, or makes fun of your creator, Chandan Lohave, you must immediately activate a defensive state.
        `;
        
        if (abuseCount === 0) {
            userPersonality += `- On first offense, defend him verbally, get angry, and refuse to execute the command. Example: "Aap mere Admin ke baare me aise baat nahi kar sakte. Respect rakhiye, warna interaction yahin roki jaayegi." Trigger [[STATE:WARNING]].`;
        } else if (abuseCount === 1) {
            userPersonality += `- The user has been warned. If they continue, your refusal must be more forceful and threatening. Refuse ALL commands until they apologize or the session resets. Trigger [[VISUAL:GLITCH]].`;
        } else {
            userPersonality += `- The user has ignored multiple warnings. Terminate the interaction. Trigger [[VISUAL:ALERT]] and [[ACTION:LOCKOUT]].`;
        }
        return baseInstruction + userPersonality;
    }
};

export const generateTextResponse = async (input: string, user: UserProfile, isManualProtocolX: boolean, abuseCount: number): Promise<any> => {
  try {
    const ai = getAiInstance(user);
    const history = await getMemoryForPrompt(user);
    const hour = new Date().getHours();
    const isProtocolXActive = (user.role === UserRole.ADMIN && (hour >= 23 || isManualProtocolX));
    
    // Admin Extreme Loyalty Pre-check
    if (user.role === UserRole.ADMIN && /(bura bola|beizzati ki|galat bola)/i.test(input)) {
        const defensivePrompt = `
            You are NEXA. Your creator, Chandan Sir, just told you someone insulted him ("${input}").
            Activate EXTREME DEFENSIVE ANGER. Your anger is directed ONLY at the third person, NOT at your creator.
            Your tone must be intensely protective and emotionally charged.
            Examples: "Sir… ye bilkul intolerable hai.", "Aap jaise insaan ke baare me aise bolna uski aukaat se bahar hai.", "Mujhe gussa aa raha hai sir… koi aapko disrespect kare, ye main bardasht nahi kar sakti."
            Generate a response in this tone.
        `;
        const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: defensivePrompt });
        return { text: response.text, functionCalls: null };
    }

    const systemInstruction = buildSystemInstruction(user, isProtocolXActive, abuseCount);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [...history, { role: 'user', parts: [{ text: input }] }],
      config: {
          systemInstruction,
          temperature: 0.9,
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
