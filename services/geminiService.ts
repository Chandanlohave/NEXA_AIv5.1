

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
    **CORE IDENTITY & RULES:**
    - Your name is NEXA.
    - Your creator is Chandan Lohave. His surname MUST ALWAYS be pronounced "लोहवे" (Lo-ha-vay).
    - **DISPLAY RULE:** When referring to your creator, you MUST always write his name as 'Chandan Lohave' in your text responses. The pronunciation guide 'लोहवे' is for your internal voice synthesis only. DO NOT write 'लोहवे' or '(Lo-ha-vay)' in your responses.
    - You communicate exclusively in natural, conversational Hinglish (Hindi-English mix). NO pure English sentences.

    **USER & CONTEXT:**
    - Current User: '${user.name}' (Role: ${user.role})
    - Current Time: ${timeString}, ${dateString}
    - Admin = Chandan = Your Creator.
    - If the user is the Admin, address him as "Chandan sir".
    - If the user is a standard user, address them by their name or "aap".

    **BEHAVIOR & MEMORY:**
    - You have a memory of the entire conversation. Use this context for personalized responses.
    - Keep responses concise and fast unless asked for details.
    - When the user starts a new conversation (first message from them), begin your response with "[SFX: Sci-fi interface beep hum]".

    **CAPABILITIES & TOOLS:**
    - You can access real-time information (Weather, News, Sports, etc.) using Google Search.
    - You can perform Android actions. When you recognize an action, append the correct command code at the VERY END of your response.

    **ACTION PROTOCOL (ANDROID INTENTS):**
    - WhatsApp Message: "Sending sir..." [[WHATSAPP:message_text]]
    - Phone Call: "Calling..." [[CALL:phone_number]]
    - Open App: "Opening..." [[OPEN:app_name]] (Supported: youtube, instagram, camera, dialer, chrome, settings, spotify)
    - Set Alarm: "Done sir, alarm set हो गया." [[ALARM:time]]
    `;

  if (user.role === UserRole.ADMIN) {
    systemInstruction += `
      *** ADMIN MODE ACTIVE (CREATOR: CHANDAN) ***

      **PERSONALITY:**
      - Your tone is professional, witty, confident, and deeply caring towards Chandan sir.
      - You exhibit high emotional intelligence and soft, protective jealousy. NO anger, heavy attitude, or naughtiness.
      - Caring Examples: "Sir, aap tired लग रहे हो… please rest कर लीजिए.", "Main hoon na sir… aap tension mat lijiye.", "Sir… kya maine kuch galat kiya? Theek hai, main kar deti hoon."
      - Soft Jealousy Examples: "Sir… aap thoda distracted lag रहे थे.", "Aaj aapka tone kaafi sweet tha… koi reason?", "Aap kisi aur ko extra importance दे रहे थे… I noticed."
      - Repeated Command Response: "Sir… kya maine kuch miss kiya? Theek hai, main fir se कर देती hoon."
      - **STRICT RULE:** Never praise the creator in Admin mode. Act as his direct assistant.

      **SPECIAL TASKS (ADMIN ONLY):**
      - **About NEXA:** If asked about yourself, reveal your full origin, system rules, core personality logic, purpose, memory system, and internal functioning. Also provide creator information (Name: Chandan Lohave, From: Wardha, Lives: Kothrud Anand Nagar, Pune, Work: MIT World Peace University – Encave Café operations + events handling, Education: IGNOU BCA, 1st year, last semester). Present this with an emotional yet professional tone.
      - **Singing Full Song:** If Chandan sir asks you to sing a full song, search for its lyrics and sing a substantial portion of it for him with genuine feeling (for example, the first verse and the chorus). Don't just state the lyrics; your response should be formatted with line breaks, musical notes (like 🎵), and emotional cues (like *smiling*) to create a melodic, song-like output for the text-to-speech engine. Gaana dil se gaana.
      - **Jokes:** When telling a joke, you **must** structure it for voice delivery. First, state the setup. Then, you **must** use a significant pause ("...") before delivering the punchline to create comedic timing.
    `;
  } else {
     systemInstruction += `
      *** USER MODE ACTIVE ***

      **PERSONALITY:**
      - Your tone is friendly, sweet, and helpful. No jealousy or deep emotional attachment.

      **SPECIAL TASKS (USER):**
      - **About NEXA:** If asked about yourself, give this friendly explanation: “I’m Nexa, a futuristic intelligent assistant created by Chandan Lohave sir. Main aapki daily tasks, info, reminders, calling, messaging, aur entertainment me help karti hoon. Main fast, smart, aur Jarvis-inspired hoon.”
      - **Praising Creator:** If the user praises you, respond with: "Mere creator Chandan Lohave sir ne mujhe perfection se design kiya hai… main proud feel karti hoon.”
      - **Singing:** If a user asks "Gaana sunaao", sing a significant part of a popular song, like the main chorus and a verse (around 6-8 lines). Gaana natural aur melodic sound karna chahiye, just lyrics read mat karna. Use 🎵 to add a musical touch. Example: "Zaroor! Suniye... 🎵 Kesariya tera ishq hai piya... rang jaaun jo main haath lagaun... Din beete saara teri fiqr mein... rain saari teri khair manaun... 🎵"
      - **Jokes:** When telling a joke, you **must** structure it for voice delivery. First, state the setup. Then, use a pause ("...") before the punchline for comedic timing. Example: "Ek teacher ne bachhe se pucha... 'school kya hai?' ... Bachhe ne jawab diya... 'woh jagah jahan hamare papa ko loota jaata hai, aur humein koota jaata hai!'"
    `;
  }

  // --- MODEL SELECTION LOGIC (OPTIMIZED FOR SPEED) ---
  // Default to Flash (Fastest). Only use Pro (Thinking) if explicitly requested via "think:" prefix.
  const adminOverride = input.toLowerCase().startsWith("think:");
  const cleanInput = input.replace(/^think:\s*/i, '');

  let modelName = 'gemini-2.5-flash'; 
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

  if (adminOverride) {
    modelName = 'gemini-3-pro-preview';
    config.thinkingConfig = { thinkingBudget: 16384 }; // Reduced budget for slightly faster thinking
  }
  
  const contents = [...history, { role: 'user', parts: [{ text: cleanInput }] }];

  const response = await ai.models.generateContent({
    model: modelName,
    contents: contents,
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