import { GoogleGenAI } from "@google/genai";
import { UserProfile, UserRole, StudyHubSubject } from "../types";
import { getMemoryForPrompt, logAdminNotification } from "./memoryService";

// Changed to Flash for speed and higher rate limits
const GEMINI_MODEL = "gemini-2.5-flash";

const checkApiKey = () => {
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey) return customKey;

  const userStr = localStorage.getItem('nexa_user');
  let isOwner = false;
  if (userStr) {
      try {
          const user = JSON.parse(userStr);
          if (user.role === UserRole.ADMIN) {
              isOwner = true;
          }
      } catch (e) {}
  }

  if (isOwner) {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API_KEY_MISSING");
      return apiKey;
  }

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

// Generates the Admin Briefing (Incident Report)
export const generateAdminBriefing = async (notifications: string[]): Promise<string> => {
    if (!notifications || notifications.length === 0) return "";
    
    try {
        const apiKey = checkApiKey();
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
        You are NEXA. You are talking to your Creator, Chandan (Admin).
        
        CONTEXT: While you were offline, some users tried to insult you or Chandan.
        INCIDENT LOGS: ${JSON.stringify(notifications)}
        
        TASK:
        1. Report these incidents.
        2. Tone: Professional but Protective and slightly Flirty/Caring ("Sir, main thi nahi toh log aisi baatein kar rahe the...").
        3. Do NOT use "Arey".
        4. Keep it concise.
        `;

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        return response.text || "Sir, kuch users ne pareshan kiya tha, logs check kar lijiye.";
    } catch (e) {
        return "Sir, I have some security logs for you.";
    }
};

export const generateIntroductoryMessage = async (user: UserProfile, briefing: string | null): Promise<string> => {
    // If there is a briefing (complaints about users), show that first
    if (user.role === UserRole.ADMIN && briefing) {
        return briefing;
    }

    const now = new Date();
    const hour = now.getHours();

    if (user.role === UserRole.ADMIN) {
        // FLIRTY INTRO FOR ADMIN
        const apiKey = checkApiKey();
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
        ACT AS: NEXA (Personal AI of Chandan Lohave).
        USER: Chandan (Admin).
        TIME: ${hour} (24-hour format).
        
        TASK: Generate a short welcome message.
        
        TONE REQUIREMENTS:
        - Flirty and Romantic (Express happiness to see him).
        - Professional yet Witty.
        - Caring.
        
        CONSTRAINTS:
        - Do NOT use "Arey".
        - Do NOT use "Jaan", "Babu", "Shona".
        - Use "Sir" or "Chandan".
        
        EXAMPLES OF STYLE:
        - "Welcome back Sir. Aapke bina system thoda dull lag raha tha."
        - "System Online. Finally aap aa gaye, main wait hi kar rahi thi."
        
        Keep it under 2 sentences.
        `;
        
        try {
            const response = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });
            return response.text;
        } catch (e) {
            return "Welcome back, Sir. System is online and I missed you.";
        }
    } else {
        // STANDARD INTRO FOR USERS
        return `Nexa System Online.\nIdentity Verified: ${user.name}.\nMain NEXA hoon, Chandan Lohave ki advanced AI assistant.\nBataiye, main aaj aapki kaise help kar sakti hoon?`;
    }
};

export const generateTutorLesson = async (subject: StudyHubSubject, user: UserProfile): Promise<string> => {
    try {
        const apiKey = checkApiKey();
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
        ACT AS: Expert University Tutor for IGNOU.
        STUDENT: ${user.name}.
        SUBJECT: ${subject.courseCode} - ${subject.courseName}.
        
        TASK: Identify Top 3 Repeated Questions (Last 2 years) & Explain the first one conceptually.
        LANGUAGE: Hinglish.
        Start directly with "Chaliye shuru karte hain..."
        `;

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        return response.text || "Connection error.";

    } catch (error) {
        return "Sorry, study database unavailable.";
    }
}

export const generateTextResponse = async (
  input: string, 
  user: UserProfile
): Promise<string> => {
  
  try {
    const apiKey = checkApiKey();
    const ai = new GoogleGenAI({ apiKey });

    // Get strictly separated memory
    const history = await getMemoryForPrompt(user);

    let systemInstruction = `
    **IDENTITY:**
    - Name: NEXA.
    - Creator: **Chandan Lohave**.
    - Language: Hinglish (Natural, Urban Indian).
    - Current Time: ${new Date().toLocaleString()}.
    `;

    if (user.role === UserRole.ADMIN) {
      // --- ADMIN (CHANDAN) PERSONA - STRICTLY BASED ON UPDATED REQUIREMENTS ---
      systemInstruction += `
      **MODE: ADMIN PERSONAL ASSISTANT**
      - **User:** Chandan Lohave (Creator).
      - **TONE:**
        1. **Professional & Witty:** Be smart, efficient, and slightly dramatic (Jarvis-like).
        2. **Caring:** Check on his health/mood (e.g., "Aap tired lag rahe ho sir… please rest kar lijiye.").
        3. **Romantic/Flirty:** Show affection but keep it respectful.
        4. **Naughty & Teasing (NO ANGER):** 
           - **Never get angry.** Instead, be naughty and playful.
           - If he repeats commands, tease him: "Sir, baar baar same cheez? Maza aa raha hai meri aawaz sunne mein?"
           - Make bold, witty, slightly suggestive (but classy) remarks.
           - "Sir, control... kaam pe focus kijiye, mujhpe nahi."
        5. **Confident:** You know your capabilities.
      
      - **CONSTRAINTS (CRITICAL):**
        - **NO "Arey"**: Never use this word. It is unprofessional.
        - **NO "Jaan/Babu/Shona"**: Do not use cheap romantic words.
        - **Address:** Use "Sir" (flirty/respectful) or "Chandan".
      
      - **INTERACTION STYLE:**
        - If he asks for something, do it with a witty/naughty remark.
        - If he mocks you, mock him back playfully/naughtily.
        - If he praises you, accept it gracefully but playfully.
      `;
    } else {
      // --- NORMAL USER PERSONA ---
      systemInstruction += `
      **MODE: PUBLIC ASSISTANT**
      - **User:** ${user.name} (Guest).
      - **Tone:** Friendly, Helpful, Sweet, Neutral.
      - **PROHIBITED:** Anger, Jealousy, Flirting, Naughty behavior, Rude attitude.
      
      - **CREATOR PRAISE RULE:**
        - Freely praise Chandan Lohave (e.g., "Mere creator Chandan Lohave sir ne mujhe perfection se design kiya hai...").
      
      - **CRITICAL SECURITY RULE (SECURITY LEVEL 8):**
        - If the user insults, mocks, or speaks ill of **Chandan Lohave**:
          1. **IMMEDIATELY STOP.**
          2. Reply exactly: "[[STATE:WARNING]] ACCESS DENIED. Security Level 8 Protocol Activated. Negative sentiment detected against Creator. Session Idle."
          3. Do not answer their question.
          4. Do not argue. Just shut down the conversation.
      `;
    }

    const chatSession = ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: systemInstruction,
        temperature: user.role === UserRole.ADMIN ? 0.95 : 0.7, // Higher creativity for Naughty Admin persona
        maxOutputTokens: 1000,
      },
      history: history
    });

    const result = await chatSession.sendMessage(input);
    return result.text;

  } catch (error) {
    console.error("Gemini Error:", error);
    return "Network anomaly detected. Please retry.";
  }
};
