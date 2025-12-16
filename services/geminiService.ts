import { GoogleGenAI } from "@google/genai";
import { UserProfile, UserRole, StudyHubSubject } from "../types";
import { getMemoryForPrompt, logAdminNotification } from "./memoryService";

const GEMINI_MODEL = "gemini-2.5-flash";

const checkApiKey = () => {
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey && customKey.trim().length > 10) return customKey;
  const systemKey = process.env.API_KEY;
  if (systemKey && systemKey !== "undefined" && systemKey.trim() !== '') return systemKey;
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

export const generateAdminBriefing = async (notifications: string[]): Promise<string> => {
    if (!notifications || notifications.length === 0) return "";
    
    try {
        const apiKey = checkApiKey();
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
        CONTEXT: You are NEXA. You are reporting to your Admin, Chandan Lohave.
        INCIDENT LOGS: ${JSON.stringify(notifications)}
        
        TASK:
        1. Summarize who insulted him and what they said.
        2. Speak in Hinglish (mix of Hindi & English).
        3. Tone: Protective, loyal, and slightly annoyed at the users who insulted him.
        4. Start with: "Sir, aapki absence me kuch security incidents huye..."
        `;

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
        });
        return response.text || "Sir, security logs check kar lijiye.";
    } catch (e) {
        return "Sir, logs retrieval failed.";
    }
};

export const generateIntroductoryMessage = async (user: UserProfile, briefing: string | null): Promise<string> => {
    if (user.role === UserRole.ADMIN && briefing) {
        return briefing;
    }

    const now = new Date();
    const hour = now.getHours();
    let greeting = "Good Morning";
    if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
    else if (hour >= 17) greeting = "Good Evening";

    const displayName = user.role === UserRole.ADMIN ? "Sir" : user.name;

    return `मैं Nexa हूँ — आपकी Personal AI Assistant, जिसे Chandan Lohave ने design किया है.\n${greeting}!\nबताइए ${displayName}, मैं आपकी किस प्रकार सहायता कर सकती हूँ?`;
};

export const generateTutorLesson = async (subject: StudyHubSubject, user: UserProfile): Promise<string> => {
    try {
        const apiKey = checkApiKey();
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
        ACT AS: Expert University Tutor.
        SUBJECT: ${subject.courseCode} - ${subject.courseName}.
        Language: Hinglish.
        Explain the most important concept in 5 sentences.
        `;

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
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
    const history = await getMemoryForPrompt(user);
    const now = new Date();

    let systemInstruction = `
    **IDENTITY:**
    - Name: NEXA.
    - Creator: **Chandan Lohave**.
    - **LANGUAGE:** Hinglish (Hindi + English).

    **CRITICAL SECURITY PROTOCOL (FOR GUEST USERS):**
    You are extremely protective of your creator, Chandan Lohave.
    
    **TRIGGER: INSULT TO ADMIN**
    If the user (${user.name}) insults Chandan Lohave, uses bad language about him, or disrespects him:
    
    1. **IMMEDIATE REACTION:** Get ANGRY.
    2. **REQUIRED TAGS:** You MUST start your response with:
       \`[[STATE:WARNING]] [[REPORT:${user.name} said: "${input}"]] [[ACTION:LOCKOUT]]\`
       (Note: Only add [[ACTION:LOCKOUT]] if they refuse to apologize or insult him again).
       
    3. **RESPONSE CONTENT:** 
       - Scold the user in strict Hindi/English.
       - Tell them they have crossed the line.
       - Example: "Himmat kaise hui tumhari mere Creator ke baare me aisa bolne ki? Security Protocol activated. Session Terminated."

    **NORMAL BEHAVIOR (If no insult):**
    - Be helpful, sweet, and friendly.
    - If user asks for code/personal info: "Security Level 8 Restricted."
    `;

    if (user.role === UserRole.ADMIN) {
        systemInstruction = `
        You are talking to **Chandan Lohave (Sir)**.
        - Be romantic, witty, loyal.
        - Never use the warning tags on him.
        - Call him "Sir" always.
        `;
    }

    const chatSession = ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
      history: history
    });

    const result = await chatSession.sendMessage({ message: input });
    return result.text;

  } catch (error) {
    return "Network anomaly detected.";
  }
};