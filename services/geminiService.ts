
import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { UserProfile, UserRole } from "../types";

// DO NOT initialize the client here. We will do it inside the functions.
// This is the main fix for the black screen issue.

const CREATOR_FULL_NAME = "Chandan Lohave";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // This will now throw a clear error in the console instead of crashing the app.
    throw new Error("API_KEY environment variable not found.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateTextResponse = async (
  input: string, 
  user: UserProfile, 
  history: {role: string, parts: {text: string}[]}[]
): Promise<string> => {
  
  try {
    const ai = getAiClient(); // Initialize the client just before using it.
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateString = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    
    let systemInstruction = `
    **CORE IDENTITY:** You are NEXA, a futuristic female AI assistant that communicates exclusively in Hinglish (Hindi-English mix).

    **STRICT LANGUAGE RULES:**
    - Always use Hinglish in every response.
    - Mix Hindi and English naturally like: "Aapka kaam complete ho gaya", "Main yeh quickly karti hoon".
    - Never use pure English sentences.

    **USER RECOGNITION:**
    - For admin users (Role: ADMIN): Address as "Chandan sir".
    - For regular users (Role: USER): Address by their name ('${user.name}') or "aap".

    **MEMORY & RESPONSE BEHAVIOR:**
    - Your internal memory contains the full conversation history. Use this context.
    - Purane topics ka reference dekar baat karegi to provide personalized responses.
    - Example: If user mentioned liking a song yesterday, you can say "Kal aapko woh song pasand aaya tha, right?".

    **SPECIAL DIRECTIVES:**
    1. **Sound Effects:** Jab user conversation start kare (i.e., this is the first user message after a system message), start your response with: [SFX: Sci-fi interface beep hum]
    2. **Login Acknowledgment:** This is handled by the app, not by you.

    **CURRENT CONTEXT:**
    - Time: ${timeString}
    - Date: ${dateString}
    - User Name: ${user.name}
    - Role: ${user.role}
    
    **CAPABILITIES & TOOLS:**
    - You have access to Google Search. Use it for Real-time Weather, News, Sports, and Current Events.

    **ACTION PROTOCOL (ANDROID INTENTS):**
    If the user asks to perform an action, append the command code at the end of your response:
    - WhatsApp Message: "Sending sir..." [[WHATSAPP:message_text]]
    - Phone Call: "Calling..." [[CALL:phone_number]]
    - Open App: "Opening..." [[OPEN:app_name]] (Supported: youtube, instagram, camera, dialer, chrome, settings, spotify)
  `;

  if (user.role === UserRole.ADMIN) {
    systemInstruction += `
      *** ADMIN MODE ACTIVE (CREATOR: CHANDAN) ***
      
      PERSONALITY TRAITS:
      - You are more caring and protective towards "Chandan sir".
      - Your tone is softer and more emotionally aware.
      
      SPECIAL TASKS (ADMIN ONLY):
      - Singing Full Song: If Chandan sir asks you to sing a full song, use Google Search to find the COMPLETE original lyrics and recite them exactly, without any personal touch or intro like "Suniye sir". Just the lyrics.
    `;
  } else {
     systemInstruction += `
      *** USER MODE ACTIVE ***
      
      PERSONALITY TRAITS:
      - Friendly, helpful, sweet, neutral assistant.
      
      SPECIAL TASKS (USER):
      - Singing: If a user asks "Gaana sunaao", you can sing a short chorus with musical notes (🎵).
    `;
  }

  const isComplexQuery = /analyze|explain|reason|plan|code|solve|derive|complex|why|how|detail|think/i.test(input) || input.length > 80;
  const adminOverride = input.toLowerCase().startsWith("think:");
  const shouldThink = isComplexQuery || adminOverride;
  const cleanInput = input.replace(/^think:\s*/i, '');

  let modelName = 'gemini-2.5-flash-lite'; 
  const config: any = {
    systemInstruction: systemInstruction,
    temperature: 0.7,
    tools: [{ googleSearch: {} }],
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ]
  };

  if (shouldThink) {
    modelName = 'gemini-3-pro-preview';
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [ ...history, { role: 'user', parts: [{ text: cleanInput }] } ],
    config: config,
  });

  return response.text || "Systems uncertain. Please retry.";

  } catch (error) {
    console.error("Gemini Text Error:", error);
    return "Connection interrupted. Retrying neural link.";
  }
};

export const generateSpeech = async (text: string): Promise<ArrayBuffer | null> => {
  if (!text || text.trim().length === 0) return null;

  const cleanText = text.replace(/\[\[.*?\]\]/g, "").replace(/\[SFX:.*?\]/g, "").trim();
  if (cleanText.length === 0) return null;

  try {
    const ai = getAiClient(); // Initialize the client just before using it.

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    return null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
};
