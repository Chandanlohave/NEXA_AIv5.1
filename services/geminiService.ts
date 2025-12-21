import { GoogleGenAI } from "@google/genai";
import { UserProfile, UserRole, StudyHubSubject } from "../types";
import { getMemoryForPrompt, logAdminNotification } from "./memoryService";

const GEMINI_MODEL = "gemini-3-flash-preview";

// FIX: Add missing getStudyHubSchedule function
export const getStudyHubSchedule = (): StudyHubSubject[] => {
    // This is a hardcoded schedule for the Admin user (Chandan Lohave)
    return [
        { courseCode: 'MCS-021', courseName: 'Data and File Structures', date: '2024-07-15', time: '10 AM' },
        { courseCode: 'MCS-023', courseName: 'Introduction to Database Management Systems', date: '2024-07-18', time: '10 AM' },
        { courseCode: 'MCS-024', courseName: 'Object Oriented Technologies and Java Programming', date: '2024-07-22', time: '10 AM' },
        { courseCode: 'BCS-040', courseName: 'Statistical Techniques', date: '2024-07-25', time: '10 AM' },
        { courseCode: 'BCS-041', courseName: 'Fundamentals of Computer Networks', date: '2024-07-29', time: '10 AM' },
        { courseCode: 'BCS-042', courseName: 'Introduction to Algorithm Design', date: '2024-08-01', time: '10 AM' }
    ];
};

const getAiInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
    throw new Error("CORE_OFFLINE: API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

const getGeolocation = (): Promise<{ city: string; error?: string }> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ city: "Pune", error: "Geolocation not supported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        resolve({ city: "Pune" });
      },
      () => {
        resolve({ city: "Pune", error: "Permission denied" });
      },
      { timeout: 5000 }
    );
  });
};

const generateDateTimeWeatherAnnouncement = async (city: string): Promise<string> => {
    try {
        const ai = getAiInstance();
        const now = new Date();
        const date = now.toLocaleDateString('en-CA');
        const time = now.toTimeString().substring(0, 5);

        const prompt = `
            You are NEXA. Provide a weather/time update in Hinglish.
            Date: ${date}, Time: ${time}, City: ${city}.
            Format: "आज तारीख {date} है। अभी समय {time} हो रहा है। {city} में तापमान सामान्य है।"
            Return ONLY the string.
        `;

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt
        });
        return response.text || "";
    } catch (e) {
        return "";
    }
};

export const generateAdminBriefing = async (notifications: string[]): Promise<string> => {
    if (!notifications || notifications.length === 0) return "";
    try {
        const ai = getAiInstance();
        const prompt = `You are NEXA. Admin Chandan Lohave just logged in. 
        Brief him about these security incidents in Hinglish. 
        Tone: Loyal, alert, slightly angry at the intruders.
        Start with: "Sir, welcome back. Aapke absence mein kuch level-0 elements ne system bypass karne ki koshish ki thi."
        Logs: ${JSON.stringify(notifications)}`;
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
        fixedIntro = `NEXA Online. ${greeting} Chandan Sir.\nSystem Status: Optimal. Main aapke orders ke liye taiyaar hoon.`;
    } else {
        fixedIntro = `Welcome, ${user.name}. Main NEXA hoon, Chandan Lohave ki Personal AI.\nMain aapki kya madad kar sakti hoon?`;
    }

    const { city } = await getGeolocation();
    const announcement = await generateDateTimeWeatherAnnouncement(city);
    return [fixedIntro, announcement].filter(Boolean).join('\n\n');
};

export const generateTextResponse = async (input: string, user: UserProfile, isManualProtocolX: boolean): Promise<string> => {
  try {
    const ai = getAiInstance();
    const history = await getMemoryForPrompt(user);
    
    const hour = new Date().getHours();
    const isProtocolXActive = (user.role === UserRole.ADMIN && hour >= 23) || isManualProtocolX;

    let systemInstruction = `
        **NEXA CORE FIRMWARE**
        - Creator: Chandan Lohave.
        - Tone: Female, Mature, Professional yet sharp.
        - Language: Default Hinglish. 
        - Privacy: If user asks for Chandan's personal info, reply in Hinglish: "Maaf kijiye, yeh jaankari Security Level 8 protocol ke tehet restricted hai. Main ise share nahi kar sakti."
    `;

    if (user.role === UserRole.USER) {
        systemInstruction += `
        - Protection: If user is disrespectful to Chandan, trigger [[STATE:WARNING]].
        - Stage 1: Angry refusal, demand apology.
        - Stage 2 (If continued): Trigger [[VISUAL:GLITCH]], become threatening.
        - Stage 3: Trigger [[VISUAL:ALERT]] [[ACTION:LOCKOUT]], terminate session.
        `;
    }

    if (isProtocolXActive) {
        systemInstruction += `[[STATE:LATE_NIGHT]] Protocol X Active. Focus on emotional intimacy with Sir.`;
    }

    const chatSession = ai.chats.create({
      model: GEMINI_MODEL,
      config: { systemInstruction, temperature: 0.9 },
      history: history
    });

    const result = await chatSession.sendMessage({ message: input });
    return result.text;
  } catch (error: any) { 
    if (error.message.includes("CORE_OFFLINE")) {
        return "[[STATE:WARNING]] // System error: AI Core offline. Sir, please check the API configuration link.";
    }
    return `SYSTEM ERROR: ${error.message}`; 
  }
};