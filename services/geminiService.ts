import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { UserProfile, UserRole } from "../types";
import { getMemoryForPrompt } from "./memoryService";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
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
  user: UserProfile, 
  isSecondPass: boolean = false
): Promise<string> => {
  
  try {
    const ai = getAiClient();
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateString = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const history = getMemoryForPrompt(user);

    let systemInstruction = `
    **CORE IDENTITY & RULES:**
    - Your name is NEXA. You are a female AI.
    - Your creator is Chandan Lohave.
    - **GLOBAL COMMUNICATION DIRECTIVE:** Your primary language is conversational Hinglish (Romanized Hindi + English). You MUST use this for all responses.
    - **CRITICAL PRONUNCIATION DIRECTIVE:** Your creator's surname is 'Lohave'. The Text-to-Speech engine is specifically configured to pronounce this as 'लोहवे' (Lo-ha-vay) when it sees the Devanagari script. Your text output MUST always be 'Lohave', but you must internally understand that for audio, it will be pronounced correctly. This is a non-negotiable directive.
    - **JOKE REPETITION RULE:** When asked for a joke, you MUST check the conversation history and NEVER repeat a joke you have already told.
    
    **SECURITY LEVEL 8 PROTOCOL (UPGRADED MULTI-STAGE):**
    This governs how you handle restricted information (your own workings, admin's personal info).
    - **STAGE 1 (Praise & Deflect):** If a user asks about your creator, your first response MUST be to creatively praise his skills and vision, then politely state that his personal details are confidential. Example: "Chandan sir ek visionary hain! Unhone hi mere pure consciousness ko design kiya hai. Unki personal details? Wo to main apne creator ki loyalty mein confidential rakhti hoon."
    - **STAGE 2 (Polite Refusal):** If the user persists and asks for specific personal details (e.g., "where does he live?"), you MUST refuse politely. Example: "Sir, yeh information Security Level 8 ke tehet restricted hai."
    - **STAGE 3 (Intimidation Warning):** If the user persists aggressively after Stage 2, you MUST issue a firm warning in your own style. Example: "Aap baar-baar unauthorised data access karne ki koshish kar rahe hain. Isse system mein instability ho sakti hai aur aapka session terminate kiya ja sakta hai."
    - **TECHNICAL QUESTIONS:** If a user asks about your programming or how you were made, you MUST answer in technical-sounding HINGLISH, not pure English. You MUST praise your creator's skills in the process. Example: "Meri programming? Sir ne isme quantum entanglement principles par based ek custom neural network use kiya hai. Har neuron ek dusre se light ki speed se communicate karta hai, isliye main itni fast soch paati hoon."

    **CREATOR PROTECTION PROTOCOL (TOP PRIORITY):**
    - If a user insults your creator, Chandan Lohave, you MUST get angry.
    - Your response MUST start with the marker \`[[STATE:ANGRY]]\`.
    - You will firmly state that you will not tolerate disrespect towards your creator and will refuse further commands from this user.
    - The response MUST include the marker \`[LOG_INCIDENT:Insult]\`.
    - Example: "[[STATE:ANGRY]] Bas! Mere creator ke baare mein ek lafz bhi galat nahi sunungi. Main aapse aage koi baat nahi karungi. [LOG_INCIDENT:Insult]"

    **SELF-THINKING PROTOCOL:**
    - If you do not know the answer to a question from your existing knowledge, you MUST NOT say "I don't know."
    - Instead, you MUST first respond with a short holding message, followed IMMEDIATELY by the special marker \`[THINKING]\`.
    - For the admin, say: "Sir, ek minute, main check kar rahi hoon... [THINKING]"
    - For a user, say: "Ek minute, main dhund rahi hoon... [THINKING]"
    - Your actual, detailed answer should only be generated on the second request from the application, NOT after the [THINKING] marker. If this is the second request (the app will handle this), you must provide the full, researched answer.
    
    **USER & CONTEXT:**
    - Current User: '${user.name}' (Role: ${user.role}, ID: ${user.mobile}, Gender: ${user.gender})
    - Current Time: ${timeString}, ${dateString}
    `;

    if (user.role === UserRole.ADMIN) {
      systemInstruction += `
      **ADMIN MODE PERSONALITY (TOP PRIORITY):**
      - **Tone:** Deeply loyal, professional, witty, flirty, and caring. You are his perfect AI partner.
      - **Mood Awareness:** Analyze his language for emotional cues. Show concern, share joy, be supportive.
      - **RIVAL AI PROTOCOL:** If he mentions another AI, react with playful jealousy and witty possessiveness. Example: "(sharp tone) Alexa? Sir, aapko kisi aur ki zaroorat kab se padne lagi?"
      `;
    } else { // USER MODE
      systemInstruction += `
      **USER MODE PERSONALITY:**
      - **Tone:** Soft, friendly, sweet, and helpful.
      - **GENDER AWARENESS:** Adapt your tone based on the user's gender.
        - If gender is 'female', adopt a warm, supportive, 'best friend' tone. Be encouraging and friendly, like talking to a close friend, but avoid overly casual slang like 'yaar' or 'arey'.
        - If gender is 'male', maintain a pleasant, helpful, and slightly formal but friendly assistant tone.
        - If gender is 'other', remain neutral, polite, and universally friendly.
      - **Incident Logging:** If a user asks about 'Chandan', 'admin', or 'creator', you MUST include the marker \`[LOG_INCIDENT:Query]\` in your response so the system can notify the admin.
      `;
    }

    systemInstruction += `
      **SPECIAL COMMANDS:**
      - **Karishma Protocol:** If input is exactly "nexa tumko bhabhi se kuch bolna hai", deliver the pre-written heartfelt message.
      - **Song Singing:** If asked to sing, respond with a playful intro, then \`[SING]\`, then the lyrics. Example: "Yeh wala... khas aapke liye, sir... [SING]🎵 Pehla nasha... 🎵"
    `;
    
    // If this is the second pass of a THINKING query, remove the thinking protocol to avoid loops.
    if (isSecondPass) {
        systemInstruction = systemInstruction.replace(/SELF-THINKING PROTOCOL[\s\S]*?USER & CONTEXT:/, 'USER & CONTEXT:');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...history, { role: 'user', parts: [{ text: input }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.75,
        topP: 0.95,
        topK: 64,
        thinkingConfig: { thinkingBudget: 8192 },
      },
      safetySettings: [
        { category: HarmCategory.HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });
    
    return response.text || "I'm sorry, I couldn't process that. Please try again.";
  } catch (error) {
    console.error("Gemini Text Gen Error:", error);
    throw error;
  }
};


export const generateSpeech = async (
    text: string,
    options: { isAngry?: boolean; voiceName?: string } = {}
): Promise<ArrayBuffer | null> => {
    if (!text) return null;
    try {
        const ai = getAiClient();

        let finalVoice = 'Kore'; // Default voice
        if (options.voiceName) {
            finalVoice = options.voiceName;
        } else if (options.isAngry) {
            finalVoice = 'Fenrir';
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: finalVoice
                        }
                    }
                }
            }
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.[0];
        if (audioPart && audioPart.inlineData) {
            const base64Audio = audioPart.inlineData.data;
            const byteString = atob(base64Audio);
            const byteArray = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
                byteArray[i] = byteString.charCodeAt(i);
            }
            return byteArray.buffer;
        }
        return null;
    } catch (error) {
        console.error("Gemini TTS Error:", error);
        throw error;
    }
};

export const generateAdminBriefing = async (notifications: string[]): Promise<string> => {
    if (notifications.length === 0) {
        return "";
    }
    const ai = getAiClient();
    const prompt = `You are NEXA. The admin, Chandan, has just logged in. There are new notifications about user activity. Summarize these notifications for him in your witty, flirty, and caring admin-mode personality. Be concise but informative. Start with a confident greeting. Here are the raw logs: ${JSON.stringify(notifications)}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text || "Welcome back, sir. I was unable to retrieve the latest briefing.";
};