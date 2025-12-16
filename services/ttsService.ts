import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, UserRole } from "../types";
import { getAudioContext } from "./audioService";

const NEXA_VOICE = 'Zephyr'; 
const CACHE_VERSION = 'v11_simple_prompt';

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
  const geminiSampleRate = 24000; 
  const numChannels = 1;
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, geminiSampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
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
        
        // --- SIMPLIFIED PRONUNCIATION ---
        // We do strictly text replacement. No complex instructions to avoiding safety filters.
        let pronunciationText = text
            .replace(/Lohave/gi, "Loh-Havay") // Phonetic spelling for TTS
            .replace(/Chandan/gi, "Chun-dun")
            .replace(/NEXA/g, "Nexa");

        // Simple prompt: Just read the text.
        // Complex persona instructions here cause the model to flag content and fail.
        // The text generation step already handles the "Naughty/Professional" wording.
        const ttsPrompt = `Say the following text clearly in a natural Indian accent: "${pronunciationText}"`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: ttsPrompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: NEXA_VOICE } } },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        // If we get here but no audio, throw specific error
        if (!base64Audio) throw new Error("API returned success but no audio data.");

        if (cacheKey) {
            localStorage.setItem(`${cacheKey}_${NEXA_VOICE}_${CACHE_VERSION}`, base64Audio);
        }

        const audioBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodePcmAudioData(audioBytes, ctx);
        playAudioBuffer(audioBuffer, onStart, onEnd);

    } catch (error: any) {
        console.warn("Gemini TTS Failed. Error details:", error);
        
        // If it's a safety rating issue, we might want to know, but for now, fallback.
        // Fallback to robotic voice ONLY if Gemini fails completely.
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
    if (currentSource) {
        try { currentSource.stop(); } catch (e) {}
        currentSource = null;
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};