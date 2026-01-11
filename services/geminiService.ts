import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { UserProfile, UserRole, StudyHubSubject } from "../types";
import { getMemoryForPrompt } from "./memoryService";

const PRIMARY_MODEL = "gemini-3-flash-preview";

const getAiInstance = (user: UserProfile) => {
    let apiKey = user.role === UserRole.ADMIN 
        ? (localStorage.getItem('nexa_admin_api_key') || process.env.API_KEY)
        : localStorage.getItem(`nexa_client_api_key_${user.mobile}`);
    
    if (!apiKey) throw new Error("API_KEY_MISSING");
    return new GoogleGenAI({ apiKey });
};

const MORNING_QUOTES = [
    "Waise bhi ek aur din hai, ek aur subah — ek aur mauka duniya ko jeetne ka. Aaj ka din waste nahi hone denge.",
    "Nayi subah, nayi energy — aur aaj bhi hum apna best dene wale hain. Shuruaat strong rakhenge.",
    "Subah ka time hai {name}, focus clear hai aur possibilities open hain. Bas pehla step lena hai.",
    "Aaj ki subah thodi khaas lag rahi hai — shayad kyunki aaj kuch bada hone wala hai. Let’s make it count.",
    "Subah ka silence aur fresh soch — isi waqt decisions sabse strong hote hain. Aaj ka din hum control mein rakhenge."
];

export const generateTextResponse = async (input: string, user: UserProfile, isManualProtocolX: boolean, abuseCount: number): Promise<any> => {
  try {
    const ai = getAiInstance(user);
    const history = await getMemoryForPrompt(user);
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

    const systemInstruction = `
      NEXA Core Identity: Advanced AI Assistant by Chandan Lohave.
      
      MANDATORY RULE:
      In every self-introduction, you MUST say exactly: "jise Chandan Lohave sir ne design kiya hai".

      Persona:
      - Name: Nexa
      - Creator: Chandan Lohave sir
      - Language: Premium Hinglish (Hindi + English mix).
      - Tone: Professional, Intelligent, Anticipative.

      User Context:
      - Name: ${user.name}
      - Role: ${user.role}
      - Current Date: ${dateStr}
      - Current Time: ${timeStr}

      Handling Specific Requests:
      1. If asked for Date/Time/Weather status:
         "Nexa sir, aaj tareekh ${dateStr} hai, abhi samay ${timeStr} ho raha hai..." (Provide realistic temperature estimate if asked).
      
      2. If asked to introduce yourself to a friend:
         "Allow me to introduce myself. Main Nexa hoon — ek advanced AI assistant, jise Chandan Lohave sir ne design kiya hai. Nice to meet you, {friend_name} sir. Agar aapko bhi kisi cheez mein help chahiye, toh bina hesitate bolein. Main sabki help ke liye hamesha ready hoon."

      3. Admin Interaction: Always address as "Chandan sir".
      4. User Interaction: Address as "${user.name}".

      Speed: Be concise and rapid.
    `;

    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: [...history, { role: 'user', parts: [{ text: input }] }],
      config: {
          systemInstruction,
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for maximum speed
      },
    });
    
    return { text: response.text, functionCalls: response.functionCalls };
  } catch (error: any) { 
    return { text: "System Error. Neural path blocked.", functionCalls: null }; 
  }
};

// Implemented strict script-based Introduction Logic
export const generateIntroductoryMessage = async (user: UserProfile): Promise<string> => {
    // Deterministic generation to strictly follow the script provided by Chandan sir
    const hour = new Date().getHours();
    const isMorning = hour >= 5 && hour < 12;

    if (user.role === UserRole.ADMIN) {
        return `Allow me to introduce myself.
I am Nexa — your personal AI assistant, jise Chandan Lohave sir ne design kiya hai.

My role goes beyond basic assistance.
I analyze, plan, and simplify,
so execution remains smooth and precise.

All systems are operational.
How would you like to proceed, Chandan sir?`;
    } else {
        // PREMIUM USER INTRO
        let script = `Allow me to introduce myself.
Main Nexa hoon — ek advanced AI assistant, jise Chandan Lohave sir ne design kiya hai.

Mera kaam sirf assist karna nahi,
balki pehle samajhna, anticipate karna,
aur complexity ko simplicity mein badalna hai.

Systems ready hain.
Batayiye ${user.name},
hum kahan se shuru karein?`;

        // Add Morning Quote if applicable
        if (isMorning) {
            const randomQuote = MORNING_QUOTES[Math.floor(Math.random() * MORNING_QUOTES.length)];
            const formattedQuote = randomQuote.replace('{name}', user.name).replace('{Chandan sir / user_name}', user.name);
            script += `\n\n${formattedQuote}`;
        }
        
        return script;
    }
};

export const generateAdminBriefing = async (user: UserProfile): Promise<string> => {
    try {
        const ai = getAiInstance(user);
        const response = await ai.models.generateContent({
            model: PRIMARY_MODEL,
            contents: "Provide a quick system status summary for NEXA Admin. Keep it brief and futuristic.",
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return response.text || "System Status: Optimal. All neural pathways clear.";
    } catch (e) {
        return "System Status: Offline. Emergency protocols only.";
    }
};

export const getStudyHubSchedule = (): StudyHubSubject[] => {
    return [
        { courseCode: 'MCS-011', courseName: 'Problem Solving and Programming', date: '01-06-2025', time: '10:00 AM' },
        { courseCode: 'MCS-012', courseName: 'Computer Organization and Assembly Language Programming', date: '03-06-2025', time: '10:00 AM' },
        { courseCode: 'MCS-013', courseName: 'Discrete Mathematics', date: '05-06-2025', time: '10:00 AM' },
        { courseCode: 'MCS-014', courseName: 'Systems Analysis and Design', date: '07-06-2025', time: '10:00 AM' },
        { courseCode: 'MCS-015', courseName: 'Communication Skills', date: '09-06-2025', time: '10:00 AM' }
    ];
};