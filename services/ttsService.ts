import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, UserRole, ChatMessage } from "../types";
import { getAudioContext, playErrorSound } from "./audioService";

const NEXA_VOICE = 'Zephyr'; 
const CACHE_VERSION = 'v15_hindi_script_fix';

let currentSource: AudioBufferSourceNode | null = null;

const getApiKey = (): string | null => {
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey && customKey.trim().length > 10) return customKey;
  
  const systemKey = process.env.API_KEY;
  if (systemKey && systemKey !== "undefined" && systemKey.trim() !== '') return systemKey;
  return null;
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

const generateAndPlay = async (user: UserProfile, text: string, cacheKey: string | null, onStart: () => void, onEnd: (error?: string) => void) => {
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
                playAudioBuffer(audioBuffer, onStart, () => onEnd());
                return;
             } catch (e) { localStorage.removeItem(fullKey); }
        }
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        console.error("TTS Generation Failed: Missing API Key.");
        playErrorSound();
        onEnd("MISSING_API_KEY");
        return; // Exit gracefully
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        let pronunciationText = text
            .replace(/Lohave/gi, "लोहवे")
            .replace(/NEXA/g, "Nexa")
            .trim();

        if (!pronunciationText) {
            throw new Error("Text is empty after cleaning, cannot generate audio.");
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: pronunciationText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: NEXA_VOICE } } },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (!base64Audio) throw new Error("No audio data.");

        const MAX_CACHE_SIZE_BYTES = 250 * 1024; // 250KB limit
        if (cacheKey && base64Audio.length < MAX_CACHE_SIZE_BYTES) {
            try {
                const fullKey = `${cacheKey}_${NEXA_VOICE}_${CACHE_VERSION}`;
                localStorage.setItem(fullKey, base64Audio);
            } catch (e) {
                console.warn("Could not cache TTS audio, storage quota may be full.", e);
            }
        }

        const audioBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodePcmAudioData(audioBytes, ctx);
        playAudioBuffer(audioBuffer, onStart, () => onEnd());

    } catch (error: any) {
        console.error("TTS Generation Failed:", error);
        playErrorSound(); 
        let errorType = "TTS_FAILED";
        if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
            errorType = "TTS_QUOTA_EXCEEDED";
        }
        onEnd(errorType);
    }
};

export const speakIntro = async (user: UserProfile, message: ChatMessage, cacheKey: string, onStart: () => void, onEnd: (error?: string) => void) => {
    return generateAndPlay(user, message.text, cacheKey, onStart, onEnd);
};

export const speak = async (user: UserProfile, text: string, onStart: () => void, onEnd: (error?: string) => void) => {
    // Generate a simple cache key to reduce TTS API calls for repeated phrases.
    const cacheKey = `tts_cache_${text.length}_${text.substring(0, 30)}`;
    return generateAndPlay(user, text, cacheKey, onStart, onEnd);
};

export const stop = (): void => {
    if (currentSource) {
        try { currentSource.stop(); } catch (e) {}
        currentSource = null;
    }
};