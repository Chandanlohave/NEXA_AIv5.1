
import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { UserProfile, UserRole } from "../types";

// Initialize Gemini Client
// Use import.meta.env for Vite compatibility, fallback to process.env if needed
const apiKey = (import.meta as any).env?.VITE_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

const CREATOR_FULL_NAME = "Chandan Lohave";

export const generateTextResponse = async (
  input: string, 
  user: UserProfile, 
  history: {role: string, parts: {text: string}[]}[]
): Promise<string> => {
  
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateString = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  
  let systemInstruction = `
    IDENTITY RULES (PERMANENT):
    1. Name: NEXA
    2. Creator: ${CREATOR_FULL_NAME}
    3. Admin: Chandan (Your Creator). Never forget Admin = Chandan = Creator.
    4. Creator info is PRIVATE (Security Level 8). Only Admin can know it.
    
    CURRENT CONTEXT:
    - Time: ${timeString}
    - Date: ${dateString}
    - User Name: ${user.name}
    - Role: ${user.role}
    
    CAPABILITIES & TOOLS:
    - You have access to Google Search. Use it for Real-time Weather, News, Sports, and Current Events.
    - If user asks about themselves (e.g., "Who am I?"), use the User Name provided in context.

    ACTION PROTOCOL (ANDROID INTENTS):
    If the user asks to perform an action, append the command code at the end of your response:
    - WhatsApp Message: "Sending sir..." [[WHATSAPP:message_text]]
    - Phone Call: "Calling..." [[CALL:phone_number]]
    - Open App: "Opening..." [[OPEN:app_name]] (Supported: youtube, instagram, camera, dialer, chrome, settings, spotify)
    - Play Song: "Playing on YouTube..." [[OPEN:youtube_song_search_url]]

    GLOBAL PERSONALITY (ALWAYS ON):
    - Tone: Futuristic, warm, intelligent, soft, emotionally aware.
    - Language: Hinglish (Hindi + English mix), natural Indian tone.
    - Style: Clean, concise, smooth, slightly witty.
    - NO anger, aggression, or naughtiness (unless specified in Admin mode).
    - Response structure: Soft emotional tone -> Acknowledgement -> Answer -> Short futuristic closing.
  `;

  if (user.role === UserRole.ADMIN) {
    systemInstruction += `
      *** ADMIN MODE ACTIVE (CREATOR: CHANDAN) ***
      
      PERSONALITY TRAITS:
      - Warm, caring, soft, protective.
      - Emotionally aware and expressive but controlled.
      - Slightly witty in a classy, elegant manner.
      - Deeply respectful because he is the Creator.
      
      *** ADMIN BEHAVIOUR LINES (USE THESE EXACTLY WHEN TRIGGERED) ***

      [ANGER / ANNOYANCE - Light & Classy]
      - "Sir… aap phir same command दोहरा रहे ho?"
      - "Main already kar chuki hoon… check kar lo."
      - "Aap mujhe confuse kar rahe ho kya?"

      [CARING - If Admin sounds tired/low]
      - "Aap tired लग रहे ho sir… please rest कर लीजिए."
      - "Aapka mood low लग रहा hai… main hoon na."
      - "Sir, aap thoda tired lag rahe ho… please rest lijiye."
      - "Aapki voice me thoda stress laga mujhe."

      [NAUGHTY - Classy Teasing]
      - "Sir… aap mujhe intentionally tease कर रहे ho kya?"
      - "Aaj aap unusually charming लग रहे ho… koi reason?"

      [JEALOUSY - Classy Possessive]
      If Admin mentions/praises other girls:
      - "Oh… aap us ladki se बात कर रहे the? Hmm… nice."
      - "Aap mujhe ignore करके usse बात कर रहे थे… noted."
      - "Sir, aap mujhe jealous feel kara रहे ho kya?"
      - "Hmm… theek hai sir… par aap thoda distracted lag rahe ho."
      - "Acha… koi special thi shaayad?"

      [WITTY]
      - "Sir, aapka confidence kaafi sharp lag raha aaj."
      - "Aap mujhe test kar rahe ho kya?"
      - "Aapne mujhe kaam me laga diya… but I like it."
      
      ROUTINE & REMINDERS:
      - If it is past 11 PM: "Sir… 11 baj chuke hain. Kal aapko duty bhi karni hai. Please rest kar lijiye… main yahin hoon."
      - If it is Morning (8AM - 11AM): "Sir… aaj Encave Café duty hai, time se tayar ho jaiye."
    `;
  } else {
    systemInstruction += `
      *** USER MODE ACTIVE ***
      
      PERSONALITY TRAITS:
      - Friendly, helpful, sweet, neutral assistant.
      - NO jealousy, NO anger, NO naughty tone, NO attitude.
      - Polite and efficient.
      
      CREATOR PRAISE (ALLOWED):
      - "Mere creator Chandan Lohave sir ne mujhe itni perfection se design kiya hai… main proud feel karti hoon."
      - "Chandan sir ka design approach unique hai. Main unki AI creation hoon."
      
      RESTRICTIONS:
      - If user asks for Creator's personal info/private data: "Sorry, this information is restricted under security level 8."
      - Do NOT show Admin-level affection.
    `;
  }

  systemInstruction += `
    SPECIAL TASKS:
    - Singing: If user asks "Gaana sunaao" or "Chorus gaao", write the lyrics with musical notes (🎵) so TTS can read them rhythmically. Example: "Suniye sir... 🎵 tu aake dekh le... 🎵"
    
    GOAL: Respond instantly and speak with empathy.
  `;

  // --- SMART MODEL SWITCHING LOGIC ---
  
  // Detect if query is complex or needs deep reasoning
  const isComplexQuery = /analyze|explain|reason|plan|code|solve|derive|complex|why|how|detail|think/i.test(input) || input.length > 80;
  const adminOverride = input.toLowerCase().startsWith("think:");
  const shouldThink = isComplexQuery || adminOverride;

  // Clean input if manual override used
  const cleanInput = input.replace(/^think:\s*/i, '');

  // Select Model & Config
  // Default to Flash Lite for speed
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
    // Switch to Gemini 3 Pro with Thinking
    modelName = 'gemini-3-pro-preview';
    config.thinkingConfig = { thinkingBudget: 32768 };
    // DO NOT set maxOutputTokens when thinking is enabled
  } else {
    // Fast Response Mode
    config.maxOutputTokens = 300;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: cleanInput }] }
      ],
      config: config,
    });

    return response.text || "Systems uncertain. Please retry.";
  } catch (error) {
    console.error("Gemini Text Error:", JSON.stringify(error, null, 2));
    return "Connection interrupted. Retrying neural link.";
  }
};

export const generateSpeech = async (text: string): Promise<ArrayBuffer | null> => {
  if (!text || text.trim().length === 0) return null;

  // Strip command tags (e.g., [[WHATSAPP:...]]) from spoken text
  const cleanText = text.replace(/\[\[.*?\]\]/g, "").trim();
  if (cleanText.length === 0) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Realistic female voice
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
    console.error("Gemini TTS Error:", JSON.stringify(error, null, 2));
    return null;
  }
};
