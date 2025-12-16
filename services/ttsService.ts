import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, UserRole } from "../types";
import { getAudioContext } from "./audioService";

const NEXA_VOICE = 'Zephyr'; 
const CACHE_VERSION = 'v10_fallback_enabled';

let currentSource: AudioBufferSourceNode | null = null;

const checkApiKey = () => {
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey && customKey.trim().length > 10) return customKey;
  const systemKey = process.env.API_KEY;
  if (systemKey && systemKey !== "undefined" && systemKey.trim() !== '') return systemKey;
  throw new Error("GUEST_ACCESS_DENIED");
};

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert 24k Gemini output to Device AudioContext rate
async function decodePcmAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  // Gemini TTS is 24000Hz fixed
  const geminiSampleRate = 24000; 
  const numChannels = 1;
  const dataInt16 = new Int16Array(data.buffer);
  
  // Create a buffer at 24k. Web Audio API handles the resampling to hardware rate automatically.
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, geminiSampleRate);
  
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    // Normalize Int16 to Float32 [-1.0, 1.0]
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

const playAudioBuffer = (buffer: AudioBuffer, onStart: () => void, onEnd: () => void) => {
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => { onEnd(); currentSource = null; };
    source.start();
    currentSource = source;
    onStart();
};

// Fallback: Use Browser's Native TTS if AI TTS fails
const playNativeTTS = (text: string, onStart: () => void, onEnd: () => void) => {
    if (!('speechSynthesis' in window)) {
        onEnd();
        return;
    }
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    
    // Try to find a good English/Hindi voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('en')) || 
                           voices.find(v => v.lang.includes('en-IN')) ||
                           voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = onStart;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;

    window.speechSynthesis.speak(utterance);
};

const generateAndPlay = async (user: UserProfile, text: string, cacheKey: string | null, onStart: () => void, onEnd: () => void) => {
    stop();
    
    // IMPORTANT: Get the globally unlocked AudioContext
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) { console.error("TTS Resume Error", e); }
    }

    // Cache Check
    if (cacheKey) {
        const fullKey = `${cacheKey}_${NEXA_VOICE}_${CACHE_VERSION}`;
        const cachedAudio = localStorage.getItem(fullKey);
        if (cachedAudio) {
             try {
                const audioBytes = decodeBase64(cachedAudio);
                const audioBuffer = await decodePcmAudioData(audioBytes, ctx);
                playAudioBuffer(audioBuffer, onStart, onEnd);
                return;
             } catch (e) { localStorage.removeItem(fullKey); }
        }
    }

    try {
        const apiKey = checkApiKey();
        const ai = new GoogleGenAI({ apiKey });
        
        // --- STRICT PRONUNCIATION ENFORCEMENT ---
        let pronunciationText = text
            .replace(/Lohave/gi, "लोहवे")
            .replace(/Chandan/gi, "चंदन")
            .replace(/NEXA/g, "Nexa");
        
        const now = new Date();
        const currentHour = now.getHours();
        const isNightMode = currentHour >= 23 || currentHour < 4;

        let ttsPrompt = "";
        
        const pronunciationRules = `
        PRONUNCIATION RULES (CRITICAL):
        1. "लोहवे" MUST be pronounced as "Loh-Ha-Vay" (लो-ह-वे). Ensure the 'Ha' and 'Ve' are distinct. DO NOT say "Lohe".
        2. "चंदन" MUST be pronounced as "Chun-Dun".
        3. Speak naturally in Hinglish.
        `;
        
        if (user.role === UserRole.ADMIN) {
            ttsPrompt = `
            Act as NEXA, a futuristic AI assistant.
            Target User: Admin (Chandan Lohave).
            TEXT TO SPEAK: "${pronunciationText}"
            INSTRUCTIONS:
            1. LANGUAGE: Hinglish (Hindi + English).
            2. ${pronunciationRules}
            3. TONE:
               ${isNightMode 
                 ? "- MODE: NIGHT (11PM+). Be Flirty, Teasing, Naughty. **DO NOT WHISPER**. Speak clearly." 
                 : "- MODE: DAY. Be Professional, Loyal, Witty, and Confident."}
            4. VOICE STYLE: Female, Realistic, Indian Accent.
            `;
        } else {
             ttsPrompt = `
            Act as NEXA, a professional AI assistant.
            Target User: Guest User.
            TEXT TO SPEAK: "${pronunciationText}"
            INSTRUCTIONS:
            1. LANGUAGE: Hinglish (Hindi + English).
            2. ${pronunciationRules}
            3. TONE: Friendly, Polite, Helpful, Neutral.
            4. VOICE STYLE: Female, Realistic, Indian Accent.
            `;
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: ttsPrompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: NEXA_VOICE } } },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned from Gemini.");

        if (cacheKey) {
            localStorage.setItem(`${cacheKey}_${NEXA_VOICE}_${CACHE_VERSION}`, base64Audio);
        }

        const audioBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodePcmAudioData(audioBytes, ctx);
        playAudioBuffer(audioBuffer, onStart, onEnd);

    } catch (error: any) {
        console.warn("NEXA Voice Engine Failed, Switching to Backup Protocol.", error);
        // CRITICAL FALLBACK: Use Native Browser TTS if Gemini Fails
        playNativeTTS(text, onStart, onEnd);
    }
};

export const speakIntro = async (user: UserProfile, text: string, cacheKey: string, onStart: () => void, onEnd: () => void) => {
    return generateAndPlay(user, text, cacheKey, onStart, onEnd);
};

export const speak = async (user: UserProfile, text: string, onStart: () => void, onEnd: () => void) => {
    return generateAndPlay(user, text, null, onStart, onEnd);
};

export const stop = (): void => {
    // Stop AudioContext Sound
    if (currentSource) {
        try { currentSource.stop(); } catch (e) {}
        currentSource = null;
    }
    // Stop Native TTS
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};