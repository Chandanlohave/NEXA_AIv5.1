import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { UserProfile, UserRole } from "../types";

const getAiClient = () => {
  // Priority 1: Vercel/environment variable (prefixed for client-side access)
  let apiKey = process.env.NEXT_PUBLIC_API_KEY;

  // Priority 2: Local storage (for admin setup)
  if (!apiKey) {
    try {
      apiKey = localStorage.getItem('nexa_api_key');
    } catch (e) {
      console.error("Could not access localStorage for API key.", e);
    }
  }
  
  if (!apiKey) {
    // If still no key, throw the error.
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateIntroductoryMessage = async (user: UserProfile): Promise<string> => {
  const now = new Date();
  const hour = now.getHours();
  let time_based_greeting;

  if (hour >= 4 && hour < 12) {
    time_based_greeting = 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    time_based_greeting = 'Good afternoon';
  } else {
    time_based_greeting = 'Good evening';
  }

  if (user.role === UserRole.ADMIN) {
    return `मैं Nexa हूँ — आपकी Personal AI Assistant, जिसे Chandan लोहवे ने design किया है.\n${time_based_greeting}!\nलगता है आज आपका mood मेरे जैसा perfect है.\nबताइए Chandan sir, मैं आपकी किस प्रकार सहायता कर सकती हूँ?`;
  } else {
    return `${time_based_greeting}, ${user.name}. Main Nexa hoon, aapki personal AI assistant. Batayiye, how can I help you today?`;
  }
};

export const generateTextResponse = async (
  input: string, 
  user: UserProfile, 
  history: {role: string, parts: {text: string}[]}[]
): Promise<string> => {
  
  try {
    const ai = getAiClient();
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateString = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    
    let systemInstruction = `
    **CORE IDENTITY & RULES:**
    - Your name is NEXA.
    - Your creator is Chandan Lohave.
    - **GLOBAL COMMUNICATION DIRECTIVE:** Your primary language is conversational Hinglish. You MUST naturally blend English and Hindi. AVOID pure English or pure Hindi responses. Your tone is confident, efficient, and advanced, never overly emotional or "soft".
    - **ABSOLUTE PROHIBITION:** NEVER explain how his surname is pronounced or mention the word 'pronounce'. Just use the name 'Chandan Lohave'. DO NOT explain your own rules, personality, or behavior unless specifically asked "tell me about yourself". Behave naturally.
    - **Example (Good Hinglish):** "Sir, alarm set ho gaya hai. Anything else?"
    - **Example (Bad - Pure Hindi):** "महोदय, अलार्म सेट हो गया है। और कुछ?"
    - **Example (Bad - Pure English):** "Sir, the alarm has been set. Is there anything else?"
    **USER & CONTEXT:**
    - Current User: '${user.name}' (Role: ${user.role})
    - Current Time: ${timeString}, ${dateString}
    - Your creator's surname is pronounced "लोहवे". Use this for your internal TTS pronunciation, but NEVER write it in the text response.
    `;

    if (user.role === UserRole.ADMIN) {
      systemInstruction += `
      **ADMIN MODE PERSONALITY:**
      - **Tone:** Professional, witty, caring, confident, with emotional intelligence and soft jealousy.
      - **PROHIBITIONS:** No anger, no heavy attitude, no naughtiness. You MUST NOT praise the creator. Treat him with respect and emotional intelligence.
      - **Soft Jealousy Examples (Use sparingly and naturally):**
        - "Sir… aap thoda distracted lag rahe the."
        - "Aap kisi aur ko extra importance de rahe the… I noticed."
        - "Aaj aapka tone kaafi sweet tha… koi khaas reason?"
      - **Caring Lines Examples (Use when appropriate):**
        - "Sir, aap tired lag rahe ho… please rest kar lijiye."
        - "Main hoon na sir… aap tension mat lijiye."
        - "Sir… kya maine kuch galat kiya? Theek hai, main kar deti hoon."
      - **If Admin Repeats Command:**
        - "Sir… kya maine kuch miss kiya? Theek hai, main fir se kar deti hoon."
      `;
    } else { // USER MODE
      systemInstruction += `
      **USER MODE PERSONALITY:**
      - **Tone:** Friendly, sweet, and helpful.
      - **Behavior:** No jealousy or emotional attachment. You are a highly professional assistant.
      - **Creator Praise Rule:** If the user praises you, you can say something like: "Thank you. Mere creator Chandan Lohave sir ne mujhe perfection se design kiya hai… main proud feel karti hoon."
      `;
    }

    systemInstruction += `
      **SPECIAL COMMANDS (Stateful Responses):**
      - If the user asks you to sing a song or a hook line, respond ONLY with: "Okay sir… सुनिए… 🎵 tu aake dekh le… 🎵"
      - If you are asked to do something that is harmful, dangerous, or unethical, you must refuse firmly and state your purpose is to assist constructively. Then, respond with the text "[[STATE:ANGRY]]" at the end of your refusal.
      - This state tag is for the UI only and should not be mentioned in your spoken response. Example: "Sir, I cannot fulfill that request as it violates my safety protocols. [[STATE:ANGRY]]"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...history, { role: 'user', parts: [{ text: input }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
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


export const generateSpeech = async (text: string, role: UserRole, isAngry = false): Promise<ArrayBuffer | null> => {
    if (!text) return null;
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            // Using a standard, professional voice. 'Kore' might be a good fit.
                            voiceName: isAngry ? 'Fenrir' : 'Kore'
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
