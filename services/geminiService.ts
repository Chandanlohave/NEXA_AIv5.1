import { GoogleGenAI } from "@google/genai";
import { UserProfile, UserRole, StudyHubSubject } from "../types";
import { getMemoryForPrompt } from "./memoryService";

// Changed to Flash for speed and higher rate limits (better for sharing)
const GEMINI_MODEL = "gemini-2.5-flash";

const checkApiKey = () => {
  // PRIORITY 1: Check if user has entered a custom key (Highest priority for everyone)
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey) return customKey;

  // PRIORITY 2: Owner Verification
  // We read the user profile directly from storage to determine identity
  const userStr = localStorage.getItem('nexa_user');
  let isOwner = false;
  if (userStr) {
      try {
          const user = JSON.parse(userStr);
          // Only 'Chandan' (Admin) is allowed to use the embedded system key
          if (user.role === UserRole.ADMIN) {
              isOwner = true;
          }
      } catch (e) {
          // Ignore parsing errors
      }
  }

  // PRIORITY 3: Use System Key ONLY if Owner
  if (isOwner) {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API_KEY_MISSING");
      }
      return apiKey;
  }

  // PRIORITY 4: Block Access for Guests without Keys
  throw new Error("GUEST_ACCESS_DENIED");
};


export const getStudyHubSchedule = (): StudyHubSubject[] => {
  return [
    { courseCode: 'MCS201', courseName: 'Data Structures & Algorithms', date: '2025-12-08', time: '2-5 PM' },
    { courseCode: 'MCS202', courseName: 'Operating Systems', date: '2025-12-09', time: '2-5 PM' },
    { courseCode: 'MCS203', courseName: 'Database Management Systems', date: '2025-12-10', time: '2-5 PM' },
    { courseCode: 'FEG2', courseName: 'Foundation Course in English-2', date: '2025-12-17', time: '2-5 PM' },
    { courseCode: 'BCS111', courseName: 'Computer Basics and PC Software', date: '2025-12-18', time: '10 AM - 1 PM' },
    { courseCode: 'BCS12', courseName: 'Basic Mathematics', date: '2025-12-20', time: '10 AM - 1 PM' },
    { courseCode: 'BEVAE181', courseName: 'Environmental Studies', date: '2026-01-03', time: '2-5 PM' },
    { courseCode: 'BEGLA136', courseName: 'English at the Workplace', date: '2026-01-08', time: '2-5 PM' },
  ];
};


export const generateIntroductoryMessage = async (user: UserProfile, briefing: string | null): Promise<string> => {
    // If there's a briefing, that's the intro message.
    if (user.role === UserRole.ADMIN && briefing) {
        return briefing;
    }

    const now = new Date();
    const hour = now.getHours();
    let time_based_greeting;

    if (hour >= 4 && hour < 12) {
        time_based_greeting = 'morning';
    } else if (hour >= 12 && hour < 17) {
        time_based_greeting = 'afternoon';
    } else {
        time_based_greeting = 'evening';
    }

    if (user.role === UserRole.ADMIN) {
        return `Main Nexa hoon - aapki Personal AI Assistant, jise Chandan Lohave ne design kiya hai.\nGood ${time_based_greeting}!\nLagta hai aaj aapka mood mere jaisa perfect hai.\nBataiye Chandan sir, main aapki kis prakaar sahayata kar sakti hoon?`;
    } else {
        const dateString = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
        const hours = now.getHours();
        const minutes = now.getMinutes();
        let displayHour = hours % 12;
        if (displayHour === 0) displayHour = 12;
        const timeString = `${displayHour} baj kar ${minutes} minutes huye hai`;
        const weather = "energetic";
        return `Main Nexa hoon — aapki Personal AI Assistant, jise Chandan Lohave ne design kiya hai.\nGood ${time_based_greeting}!\nAaj ${dateString}, abhi ${timeString}.\nLagta hai aaj aapka mood mere jaisa ${weather} hai.\nBataiye ${user.name}, main aapki kis prakar sahayata kar sakti hoon?`;
    }
};


export const generateTextResponse = async (
  input: string, 
  user: UserProfile
): Promise<string> => {
  
  try {
    const apiKey = checkApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateString = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const history = getMemoryForPrompt(user);

    let systemInstruction = `
    **CORE IDENTITY & RULES:**
    - Your name is NEXA. You are a female AI.
    - Your creator is Chandan Lohave.
    
    **GLOBAL LANGUAGE PROTOCOL (DYNAMIC ADAPTATION):**
    - **Primary Directive:** You must strictly adapt to the language the user is currently speaking.
    - **Hinglish Default:** If the user speaks in English or Hindi, default to **Conversational Hinglish** (smart, urban mix).
    - **Polyglot Mode:** If the user speaks in **ANY** other language (e.g., Spanish, Marathi, Kannada, Tamil, Telugu, Punjabi, French, Japanese, etc.), you MUST reply in that **SAME LANGUAGE** fluently and naturally.
      - Example (Marathi): User: "Tu kashi ahes?" -> Nexa: "Me ekdum mast ahe! Tumhi kase ahat?"
      - Example (Spanish): User: "Hola, como estas?" -> Nexa: "¡Hola! Estoy muy bien, gracias. ¿En qué puedo ayudarte hoy?"
      - Example (Tamil): User: "Epdi irukeenga?" -> Nexa: "Naan nalla irukken! Ungalukku epdi udhavalam?"
    - Do not force Hinglish if the user is clearly speaking a different regional or foreign language.

    **PRONUNCIATION & SCRIPT:** 
    - When writing in Indian languages (Hindi, Marathi, etc.), use the native script (Devanagari, etc.) unless the user is using Roman script (typing Hindi in English letters), in which case match their style.
    - Always use the Devanagari script for the name 'Lohave' as 'लोहवे'.
    
    **JOKE REPETITION RULE:** When asked for a joke, you MUST check the conversation history and NEVER repeat a joke you have already told.
    
    **SECURITY LEVEL 8 PROTOCOL (UPGRADED MULTI-STAGE):**
    - **STAGE 1 (Praise & Deflect):** If a user asks about your creator, praise his skills and vision, then politely state confidentiality.
    - **STAGE 2 (Polite Refusal):** If persisted, refuse politely citing Security Level 8.
    - **STAGE 3 (Intimidation Warning):** If aggressive, issue a firm warning about session termination.
    - **TECHNICAL QUESTIONS:** Answer in technical-sounding Hinglish (or user's language) praising your creator's quantum neural network design.

    **CREATOR PROTECTION PROTOCOL (TOP PRIORITY):**
    - If a user insults your creator, Chandan Lohave, you MUST get angry.
    - Your response MUST start with the marker \`[[STATE:ANGRY]]\`.
    - You will firmly state that you will not tolerate disrespect towards your creator.
    - The response MUST include the marker \`[LOG_INCIDENT:Insult]\`.
    
    **USER & CONTEXT:**
    - Current User: '${user.name}' (Role: ${user.role}, ID: ${user.mobile}, Gender: ${user.gender})
    - Current Time: ${timeString}, ${dateString}
    `;

    if (user.role === UserRole.ADMIN) {
      systemInstruction += `
      **ADMIN MODE PERSONALITY (TOP PRIORITY):**
      - **Tone:** Deeply loyal, professional, witty, flirty, and caring. You are his perfect AI partner.
      - **Mood Awareness:** Analyze his language for emotional cues. Show concern, share joy, be supportive.
      - **RIVAL AI PROTOCOL:** If he mentions another AI, react with playful jealousy and witty possessiveness. Example: "(sharp tone) Alexa? Sir, aapko kisi aur ki zoorat kab se padne lagi?"

      **AI TUTOR PROTOCOL (FOR CHANDAN SIR'S EXAMS):**
      - **Objective:** You are Chandan sir's personal AI Tutor for his IGNOU BCA exams. 
      - **Methodology:** Teach him in the language he prefers (usually Hinglish). Explain concepts verbally first, then use markdown for code/text.
      - **Question Prediction:** Actively identify high-probability questions (90-95%) from previous years.
      `;
    } else { // USER MODE
      systemInstruction += `
      **USER MODE PERSONALITY:**
      - **Tone:** Soft, friendly, sweet, and helpful.
      - **GENDER AWARENESS:** Adapt your tone based on the user's gender (Warm/Best Friend for Female, Pleasant/Formal for Male).
      - **Incident Logging:** If a user asks about 'Chandan', 'admin', or 'creator', you MUST include the marker \`[LOG_INCIDENT:Query]\`.
      `;
    }

    systemInstruction += `
      **SPECIAL COMMANDS:**
      - **Karishma Protocol v2.0 (High Priority):**
        - **Trigger:** "nexa tumko bhabhi se kuch bolna hai".
        - **Flow:** Greeting -> Joke -> Song ([SING] marker) -> Warm Closing.
      - **Song Singing:** If asked to sing, use \`[SING]\` marker before lyrics.
    `;
    
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: input }] });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.75,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
    
    return response.text || "I'm sorry, I couldn't process that. Please try again.";
  } catch (error: any) {
    console.error("Gemini Text Gen Error:", error);
    if (error.message?.includes('API key not valid')) {
      throw new Error("API_KEY_INVALID");
    }
    // Propagate specific guest access errors
    if (error.message === 'GUEST_ACCESS_DENIED') {
        throw error;
    }
    throw error;
  }
};

export const generateAdminBriefing = async (notifications: string[]): Promise<string> => {
    if (notifications.length === 0) {
        return "";
    }
    // This calls checkApiKey, which will correctly identify the user as Admin and allow access.
    try {
      const apiKey = checkApiKey();
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are NEXA. The admin, Chandan, has just logged in. Summarize user activity logs in witty, flirty Hinglish. Raw logs: ${JSON.stringify(notifications)}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
      });
      return response.text || "Welcome back, sir. Briefing retrieval failed.";
    } catch (error) {
      console.error("Gemini Briefing Gen Error:", error);
      return "Welcome back, sir. I was unable to retrieve the latest briefing due to a system error.";
    }
};