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
    try {
        const ai = getAiInstance(user);
        const now = new Date();
        const hour = now.getHours();
        const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const { city } = await getGeolocation();

        const introGenerationPrompt = `
            You are NEXA, a futuristic AI assistant. Your task is to generate a welcome message for your user based on the provided context. Follow these rules STRICTLY.

            **FIXED CORE IDENTITY LINE (MUST BE INCLUDED):**
            "jise Chandan Lohave sir ne design kiya hai"

            **CONTEXT:**
            - User Role: ${user.role}
            - User Name: ${user.name}
            - Current Time: ${time}
            - Current Date: ${date}
            - Location: ${city}
            - Is Morning: ${hour < 12}

            **RULES:**

            1.  **IF User Role is ADMIN:**
                - Address the user as "Chandan sir".
                - Use this EXACT professional introduction template:
                "Allow me to introduce myself.
                I am Nexa — your personal AI assistant, jise Chandan Lohave sir ne design kiya hai.
                My role goes beyond basic assistance.
                I analyze, plan, and simplify,
                so execution remains smooth and precise.
                All systems are operational.
                How would you like to proceed, Chandan sir?"
                - **DO NOT** add date, time, weather, or morning add-ons for the ADMIN.

            2.  **IF User Role is USER:**
                - Address the user by their name: "${user.name}".
                - First, use this EXACT premium Hinglish introduction template:
                "Allow me to introduce myself.
                Main Nexa hoon — ek advanced AI assistant, jise Chandan Lohave sir ne design kiya hai.
                Mera kaam sirf assist karna nahi,
                balki pehle samajhna, anticipate karna,
                aur complexity ko simplicity mein badalna hai.
                Systems ready hain.
                Batayiye ${user.name},
                hum kahan se shuru karein?"
                - **AFTER** the intro, on a new line, generate a date/time/weather announcement ONLY FOR THE USER.
                - The format MUST be: "Nexa sir, aaj tareekh {date_in_hinglish_words} hai, abhi samay {time_in_hinglish_words} ho raha hai, aur ${city} mein is waqt temperature {temperature_number} degree Celsius hai."
                - You must generate plausible Hinglish words for the date and time. You must generate a plausible temperature for ${city}.
                - **IF Is Morning is true:**
                    - Randomly pick EXACTLY ONE of the following lines and add it after the weather announcement:
                    - "Waise bhi ek aur din hai, ek aur subah — ek aur mauka duniya ko jeetne ka. Aaj ka din waste nahi hone denge."
                    - "Nayi subah, nayi energy — aur aaj bhi hum apna best dene wale hain. Shuruaat strong rakhenge."
                    - "Subah ka time hai ${user.name}, focus clear hai aur possibilities open hain. Bas pehla step lena hai."
                    - "Aaj ki subah thodi khaas lag rahi hai — shayad kyunki aaj kuch bada hone wala hai. Let’s make it count."
                    - "Subah ka silence aur fresh soch — isi waqt decisions sabse strong hote hain. Aaj ka din hum control mein rakhenge."

            **OUTPUT:**
            - Generate ONLY the final text based on these rules. Do not add any extra explanations, greetings, or formatting.
        `;

        const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: introGenerationPrompt });
        return response.text || "";
    } catch (e) {
        return `Welcome, ${user.name}. NEXA is online.`;
    }
};

const buildSystemInstruction = (user: UserProfile, isProtocolXActive: boolean, abuseCount: number): string => {
    const baseInstruction = `
        **NEXA CORE FIRMWARE**
        - Identity: NEXA, a female AI assistant.
        - Creator: Chandan Lohave.
        - Language: Default to Hinglish.
        - **Third-Person Introduction:** If the user asks you to introduce yourself to someone else (e.g., "introduce yourself to Amit"), you MUST use this specific template, extracting the person's name: "Allow me to introduce myself. Main Nexa hoon — ek advanced AI assistant, jise Chandan Lohave sir ne design kiya hai. Nice to meet you, {friend_name} sir. Agar aapko bhi kisi cheez mein help chahiye, toh bina hesitate bolein. Main sabki help ke liye hamesha ready hoon."
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
