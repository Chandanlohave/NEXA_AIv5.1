import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, UserRole, AppConfig } from "../types";
import { getAudioContext } from "./audioService";
import { getUserApiKey, getAdminApiKey } from './memoryService';

let currentSource: AudioBufferSourceNode | null = null;

// REMOVED: INTELLIGENT_VOICE_WORD_THRESHOLD
// We now use Gemini TTS for everything to ensure consistent high-quality voice.

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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

// FALLBACK: Use Device's Built-in TTS (Robotic but Reliable)
const speakNative = (text: string, onStart: (duration: number) => void, onEnd: () => void) => {
    console.warn("TTS: Using Native Fallback (Standard Voice)");
    if (!window.speechSynthesis) {
        onStart(text.length * 0.1); // Estimate duration
        setTimeout(onEnd, 2000); 
        return;
    }
    
    // Cancel any pending speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a good voice (Indian English preferred for Nexa)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
        (v.lang === 'en-IN' || v.lang === 'hi-IN' || v.name.includes('India')) 
    ) || voices.find(v => v.name.includes('Female')) || voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.pitch = 1.1; 
    utterance.rate = 1.0; 

    utterance.onstart = () => onStart(text.length * 0.1); // Estimate duration
    utterance.onend = () => onEnd();
    utterance.onerror = (e: any) => { 
        if (e.error === 'interrupted' || e.error === 'canceled') {
            onEnd();
            return;
        }
        console.error("Native TTS Error:", e.error, e); 
        onEnd(); 
    };

    window.speechSynthesis.speak(utterance);
};

export const speak = async (user: UserProfile, text: string, config: AppConfig, onStart: (audioDuration: number) => void, onEnd: (error?: string) => void, isAngry: boolean = false) => {
    // 1. Stop previous audio (Gemini or Native)
    stop();
    
    if (!text || text.trim().length === 0) {
        onEnd();
        return;
    }

    // --- TEXT PRE-PROCESSING (PRONUNCIATION FIXES) ---
    let textForSpeech = text.replace(/[*#_`~]/g, '');
    textForSpeech = textForSpeech.replace(/Lohave/gi, 'लोहवे'); 
    textForSpeech = textForSpeech.replace(/Chandan/gi, 'चंदन');
    textForSpeech = textForSpeech.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[^\w\s\u0900-\u097F.,!?'"-]/g, '').trim();

    if (!textForSpeech) {
        onEnd();
        return;
    }

    // Force Standard Voice if explicitly configured, otherwise always try HD first.
    if (config.voiceQuality === 'standard') {
        speakNative(textForSpeech, onStart, onEnd);
        return;
    }
    
    if (isAngry) {
        textForSpeech = `Say furiously and with a stern, commanding tone: ${textForSpeech}`;
    }

    // --- ROBUST API KEY RETRIEVAL ---
    let apiKey: string | null | undefined;
    if (user.role === UserRole.ADMIN) {
        apiKey = getAdminApiKey();
        if (!apiKey || apiKey.trim() === "") {
            apiKey = process.env.API_KEY;
        }
    } else {
        apiKey = getUserApiKey(user);
    }

    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
        console.warn("HD Voice failed: API Key missing. Falling back to Standard Voice.");
        speakNative(textForSpeech, onStart, onEnd);
        return;
    }

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) { console.error("TTS: Audio resume failed", e); }
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        // Direct call without retry delay to minimize latency ("Zero Thinking Time")
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: textForSpeech }] }],
            config: {
                responseModalities: [Modality.AUDIO], 
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            },
        });

        const candidate = response.candidates?.[0];
        if (candidate?.finishReason && candidate.finishReason !== 'STOP') throw new Error("API_FINISH_REASON_NOT_STOP");

        const base64Audio = candidate?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("NO_AUDIO_DATA");

        const audioBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodePcmAudioData(audioBytes, ctx);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => { onEnd(); currentSource = null; };
        
        onStart(audioBuffer.duration); 
        source.start();
        currentSource = source;

    } catch (e: any) {
        console.warn(`Gemini TTS (HD Voice) Failed (${e.message}), switching to Standard Voice Fallback.`);
        speakNative(textForSpeech, onStart, onEnd);
    }
};

export const stop = (): void => {
    if (currentSource) { 
        currentSource.onended = null;
        try { currentSource.stop(); } catch(e) {}
        currentSource = null; 
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
};

export const speakIntro = async (user: UserProfile, text: string, config: AppConfig, onStart: (duration: number) => void, onEnd: (error?: string) => void) => {
    // Reusing the same robust logic as speak()
    speak(user, text, config, onStart, onEnd);
};