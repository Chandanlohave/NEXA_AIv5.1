import { GoogleGenAI } from "@google/genai";
import { UserProfile, UserRole } from "../types";
import { getAudioContext } from "./audioService";

let currentSource: AudioBufferSourceNode | null = null;

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
const speakNative = (text: string, onStart: () => void, onEnd: () => void) => {
    console.warn("TTS: Switching to Native Fallback");
    if (!window.speechSynthesis) {
        onStart();
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
    
    // Tweak to sound slightly more feminine/young if possible
    utterance.pitch = 1.1; 
    utterance.rate = 1.0; 

    utterance.onstart = () => onStart();
    utterance.onend = () => onEnd();
    utterance.onerror = (e) => { console.error("Native TTS Error", e); onEnd(); };

    window.speechSynthesis.speak(utterance);
};

// Helper: Retry logic for API calls
const generateSpeechWithRetry = async (ai: GoogleGenAI, params: any, retries = 1): Promise<any> => {
    try {
        return await ai.models.generateContent(params);
    } catch (e: any) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, 800)); 
            return await generateSpeechWithRetry(ai, params, retries - 1);
        }
        throw e;
    }
};

export const speak = async (user: UserProfile, text: string, onStart: () => void, onEnd: (error?: string) => void) => {
    // 1. Stop previous audio (Gemini or Native)
    if (currentSource) { 
        try { currentSource.stop(); } catch(e) {}
        currentSource = null; 
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
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

    // --- API KEY CHECK ---
    let apiKey: string | null | undefined;
    if (user.role === UserRole.ADMIN) {
        apiKey = localStorage.getItem('nexa_admin_api_key');
        if (!apiKey || apiKey.trim() === '') apiKey = process.env.API_KEY;
    } else {
        apiKey = localStorage.getItem(`nexa_client_api_key_${user.mobile}`);
    }

    // If no key, failover immediately to Native TTS
    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
        speakNative(textForSpeech, onStart, onEnd);
        return;
    }

    const ctx = getAudioContext();
    // Ensure AudioContext is running (Mobile Unlock)
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) { console.error("TTS: Audio resume failed", e); }
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        const response = await generateSpeechWithRetry(ai, {
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: textForSpeech }] }],
            config: {
                responseModalities: ['AUDIO' as any], 
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
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
        
        onStart(); 
        source.start();
        currentSource = source;

    } catch (e: any) {
        console.warn(`Gemini TTS Failed (${e.message}), switching to Native Fallback.`);
        // CRITICAL FALLBACK: Use Native Browser TTS
        speakNative(textForSpeech, onStart, onEnd);
    }
};

export const stop = (): void => {
    if (currentSource) { 
        try { currentSource.stop(); } catch(e) {}
        currentSource = null; 
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
};

export const speakIntro = speak;