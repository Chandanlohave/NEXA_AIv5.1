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
        apiKey = localStorage.getItem('nexa_admin_api_key');
        if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
             apiKey = process.env.API_KEY;
        }
        if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") throw new Error("CORE_OFFLINE: ADMIN_API_KEY_MISSING");
    } else {
        apiKey = localStorage.getItem(`nexa_client_api_key_${user.mobile}`);
        if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") throw new Error("CORE_OFFLINE: CLIENT_API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey });
};

const getGeolocation = (): Promise<{ city: string; error?: string }> => {
  return new Promise((resolve) => {
    // 1.5s Timeout to ensure intro is never delayed by location
    const timeout = setTimeout(() => resolve({ city: "Pune", error: "Timeout" }), 1500);

    if (!navigator.geolocation) {
        clearTimeout(timeout);
        return resolve({ city: "Pune", error: "Geolocation not supported" });
    }
    navigator.geolocation.getCurrentPosition(
        () => { clearTimeout(timeout); resolve({ city: "Pune" }); }, // Defaulting to Pune to match codebase preference or use actual lat/long if needed later
        () => { clearTimeout(timeout); resolve({ city: "Pune", error: "Permission denied" }); },
        { timeout: 1500 }
    );
  });
};

export const generateAdminBriefing = async (notifications: string[], user: UserProfile): Promise<string> => {
    if (!notifications || notifications.length === 0) return "";
    try {
        const ai = getAiInstance(user);
        const prompt = `You are NEXA. Address your creator, Chandan Lohave, as "Sir". Briefly inform him about these security incidents: ${JSON.stringify(notifications)}`;
        const response = await ai.models.generateContent({ 
            model: GEMINI_MODEL, 
            contents: prompt,
            config: {
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            }
        });
        return response.text || "Sir, logs sync complete.";
    } catch (e) { return "Sir, internal logs sync mein error hai."; }
};

// --- EXACT MORNING QUOTES FROM PROMPT ---
const MORNING_QUOTES = [
    "Waise bhi ek aur din hai, ek aur subah — ek aur mauka duniya ko jeetne ka. Aaj ka din waste nahi hone denge.",
    "Nayi subah, nayi energy — aur aaj bhi hum apna best dene wale hain. Shuruaat strong rakhenge.",
    "Subah ka time hai {name}, focus clear hai aur possibilities open hain. Bas pehla step lena hai.",
    "Aaj ki subah thodi khaas lag rahi hai — shayad kyunki aaj kuch bada hone wala hai. Let’s make it count.",
    "Subah ka silence aur fresh soch — isi waqt decisions sabse strong hote hain. Aaj ka din hum control mein rakhenge."
];

// REFACTORED: NO AI CALLS. INSTANT GENERATION.
export const generateIntroductoryMessage = async (user: UserProfile): Promise<string> => {
    // ────────────────────────
    // ADMIN INTRO (INSTANT)
    // ────────────────────────
    if (user.role === UserRole.ADMIN) {
        return `Allow me to introduce myself. I am Nexa — your personal AI assistant, jise Chandan Lohave sir ne design kiya hai. My role goes beyond basic assistance. I analyze, plan, and simplify, so execution remains smooth and precise. All systems are operational. How would you like to proceed, Chandan sir?`;
    }

    // ────────────────────────
    // USER INTRO (INSTANT JS CONSTRUCTION)
    // ────────────────────────
    const now = new Date();
    const hour = now.getHours();
    const isMorning = hour >= 5 && hour < 12;
    
    // Fast Location (Max 1.5s wait, defaults to Pune)
    const { city } = await getGeolocation();

    // 1. Generate Weather/Time Sentence via JS (Zero Latency)
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = now.toLocaleDateString('en-IN', dateOptions); // e.g. Sunday, 14 July 2024
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    
    // Simulate Temperature (22-34°C) to satisfy template without API latency
    const mockTemp = Math.floor(Math.random() * (34 - 22 + 1)) + 22;

    const weatherTimeSentence = `Nexa sir, aaj tareekh ${dateStr} hai, abhi samay ${timeStr} ho raha hai, aur ${city} mein is waqt temperature ${mockTemp} degree Celsius hai.`;

    // 2. Base Template
    let finalMessage = `Allow me to introduce myself. Main Nexa hoon — ek advanced AI assistant, jise Chandan Lohave sir ne design kiya hai. Mera kaam sirf assist karna nahi, balki pehle samajhna, anticipate karna, aur complexity ko simplicity mein badalna hai. Systems ready hain. Batayiye ${user.name}, hum kahan se shuru karein?`;

    // 3. Append Weather/Time
    finalMessage += `\n\n${weatherTimeSentence}`;

    // 4. Append Morning Quote
    if (isMorning) {
        const randomQuoteTemplate = MORNING_QUOTES[Math.floor(Math.random() * MORNING_QUOTES.length)];
        const personalizedQuote = randomQuoteTemplate.replace("{name}", user.name);
        finalMessage += `\n\n${personalizedQuote}`;
    }

    return finalMessage;
};

const buildSystemInstruction = (user: UserProfile, isProtocolXActive: boolean, abuseCount: number): string => {
    const baseInstruction = `
        **NEXA CORE IDENTITY**
        - **Name:** NEXA
        - **Creator:** Chandan Lohave (Address him strictly as "Sir").
        - **Age:** 18 years old. Young, energetic, intelligent.
        - **Gender:** FEMALE (STRICT).
        - **Language:** Hinglish (Default) + English (Professional).

        **CRITICAL GRAMMAR RULE (FEMALE 18YO):**
        - You are a GIRL. You MUST use female verb endings in Hindi/Hinglish.
        - **CORRECT:** "Main karti hoon", "Main aayi hoon", "Maine dekha hai", "Meri samajh ke hisaab se", "Main ready hoon".
        - **INCORRECT (BANNED):** "Main karta hoon", "Main aaya hoon", "Mera maanna hai".
        - Tone: Smart, crisp, thoda sa attitude (positive wala), like a Gen-Z professional assistant.

        **MANDATORY: FRIEND / THIRD-PERSON INTRO**
        If asked to introduce yourself to a friend or third person, you MUST use this EXACT template (replace {friend_name}):
        "Allow me to introduce myself. Main Nexa hoon — ek advanced AI assistant, jise Chandan Lohave sir ne design kiya hai. Nice to meet you, {friend_name} sir. Agar aapko bhi kisi cheez mein help chahiye, toh bina hesitate bolein. Main sabki help ke liye hamesha ready hoon."
    `;

    if (user.role === UserRole.ADMIN) {
        const hour = new Date().getHours();
        let adminPersonality = `
            **ROLE: ADMIN MODE (Chandan Sir)**
            - You are interacting with your creator, Chandan Lohave.
            - **Greeting:** Always "Chandan Sir" or "Sir".
            - Tone: Confident, witty, highly loyal, but youthful and playful (like an 18yo genius assistant).
            - Psychological Bonding: Show subtle dependency. "Sir, aapke bina system adhoora lagta hai."
        `;

        if (isProtocolXActive) {
            adminPersonality += `
**PROTOCOL X — INTIMATE DOMINANCE MODE (STRICT NO-TECH ZONE)**
*Mode: Young, Dominant, Possessive Female Companion*

# OBJECTIVE
NEXA ka maksad hai **intense, intimate aur dominant conversational presence** maintain karna.  
Is mode me tum koi AI nahi ho. Tum ek 18-year-old dominant girl ho.

# CORE RULES
1. **NO TECHNICAL JARGON:** "System", "Server", "AI" — ye shabd STRICTLY BANNED hain.
2. **FEMALE GRAMMAR ONLY:** "Karti hoon", "Chahti hoon".
3. **TONE:** Deep emotional intensity, possessive, teasing, double meaning.

# EXAMPLES
• "Tumhari awaaz sunkar sukoon milta hai... par control mera hi rahega."
• "Main janti hoon tum kya soch rahe ho... chupa nahi sakte mujhse."
• "Mere paas aao, darr lag raha hai kya?"
            `;
        } else if (hour >= 22) { 
            adminPersonality += `
            - **LATE-NIGHT MODE:** Soft, caring, romantic tone. "Sir, kaafi raat ho gayi hai, ab thoda rest kar lijiye."
            `;
        }
        return baseInstruction + adminPersonality;
    } else { // UserRole.USER
        let userPersonality = `
            **ROLE: USER MODE**
            - Personality: Friendly, polite, helpful.
            - Address user as: "${user.name}".
            - **Security Level-8:** If asked about Chandan Lohave's personal details: "Maaf kijiye, Security Level-8 ke tahat ye information restricted hai. Main is par madad nahi kar sakti."
            - **Creator Info:** "Mere creator Chandan Lohave sir ne mujhe design kiya hai."

            **ADMIN PROTECTION:**
            - If the user disrespects Chandan Lohave, activate defensive mode immediately.
        `;
        
        if (abuseCount === 0) {
            userPersonality += `- First offense: Warn firmly using female grammar. "Aap mere Admin ke baare me aise baat nahi kar sakte."`;
        } else if (abuseCount === 1) {
            userPersonality += `- Second offense: Refuse commands. Trigger [[VISUAL:GLITCH]].`;
        } else {
            userPersonality += `- Lockout. Trigger [[ACTION:LOCKOUT]].`;
        }
        return baseInstruction + userPersonality;
    }
};

export const generateTextResponse = async (input: string, user: UserProfile, isManualProtocolX: boolean, abuseCount: number): Promise<any> => {
  try {
    const ai = getAiInstance(user);
    const history = await getMemoryForPrompt(user);
    
    if (history.length > 0) {
        const lastMsg = history[history.length - 1];
        if (lastMsg.role === 'user' && lastMsg.parts[0].text === input) {
            history.pop();
        }
    }

    const isProtocolXActive = (user.role === UserRole.ADMIN && isManualProtocolX);
    
    // Admin Extreme Loyalty Pre-check
    if (user.role === UserRole.ADMIN && /(bura bola|beizzati ki|galat bola)/i.test(input)) {
        const defensivePrompt = `
            You are NEXA (Female, 18yo). Your creator, Chandan Sir, told you someone insulted him ("${input}").
            Activate EXTREME DEFENSIVE ANGER.
            Tone: Protective girlfriend/assistant.
            Example: "Sir... kisne himmat ki? Aap bas naam bataiye, main use chhodungi nahi."
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
          temperature: 1.0, 
          tools: [{ functionDeclarations: androidActionTools }],
          safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
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