import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, UserRole } from "../types";
import { getAudioContext, playErrorSound } from "./audioService";

const NEXA_VOICE = 'Zephyr'; 
const CACHE_VERSION = 'v15_hindi_script_fix';

let currentSource: AudioBufferSourceNode | null = null;

const checkApiKey = () => {
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey && customKey.trim().length > 10) return customKey;
  
  // Check process.env.API_KEY
  const systemKey = process.env.API_KEY;
  
  if (systemKey && systemKey !== "undefined" && systemKey.trim() !== '') return systemKey;
  throw new Error("MISSING_API_KEY");
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
  const geminiSampleRate = 24000; 
  const numChannels = 1;
  const dataInt16 = new Int16Array(data.buffer);
  
  const buffer = ctx.createBuffer(numChannels, dataInt16.length, geminiSampleRate);
  
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  return buffer;
}

const playAudioBuffer = async (buffer: AudioBuffer, onStart: () => void, onEnd: () => void) => {
    const ctx = getAudioContext();
    
    // CRITICAL FIX FOR MOBILE:
    if (ctx.state === 'suspended') {
        try { 
            await ctx.resume(); 
        } catch (e) { 
            console.error("Audio resume failed during playback start", e); 
        }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => { onEnd(); currentSource = null; };
    source.start();
    currentSource = source;
    onStart();
};

const generateAndPlay = async (user: UserProfile, text: string, cacheKey: string | null, onStart: () => void, onEnd: () => void) => {
    stop();
    
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) { console.error("TTS Resume Error", e); }
    }

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
        
        let pronunciationText = text
            .replace(/Lohave/gi, "लोहवे") 
            .replace(/Chandan/gi, "Chandan")
            .replace(/NEXA/g, "Nexa");

        const ttsPrompt = `Read this text clearly. 
        Use a natural Indian English accent.
        IMPORTANT: Pronounce "लोहवे" exactly as written in Hindi.
        Text: "${pronunciationText}"`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: ttsPrompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: NEXA_VOICE } } },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (!base64Audio) throw new Error("No audio data.");

        if (cacheKey) {
            localStorage.setItem(`${cacheKey}_${NEXA_VOICE}_${CACHE_VERSION}`, base64Audio);
        }

        const audioBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodePcmAudioData(audioBytes, ctx);
        playAudioBuffer(audioBuffer, onStart, onEnd);

    } catch (error: any) {
        console.error("TTS Generation Failed:", error);
        playErrorSound(); 
        onEnd();
    }
};

export const speakIntro = async (user: UserProfile, text: string, cacheKey: string, onStart: () => void, onEnd: () => void) => {
    return generateAndPlay(user, text, cacheKey, onStart, onEnd);
};

export const speak = async (user: UserProfile, text: string, onStart: () => void, onEnd: () => void) => {
    return generateAndPlay(user, text, null, onStart, onEnd);
};

export const stop = (): void => {
    if (currentSource) {
        try { currentSource.stop(); } catch (e) {}
        currentSource = null;
    }
};