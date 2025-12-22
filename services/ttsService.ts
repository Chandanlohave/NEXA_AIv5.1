import { GoogleGenAI } from "@google/genai";
import { UserProfile } from "../types";
import { getAudioContext, playErrorSound } from "./audioService";

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

// Helper: Calculate how long the HUD should spin if audio fails (Visual Fallback)
const calculateVisualDuration = (text: string) => {
    const words = text.split(' ').length;
    // Average speaking rate ~150 words per minute => ~2.5 words per second
    return Math.min(Math.max((words / 2.5) * 1000, 2000), 10000);
};

// RETRY LOGIC: Critical for "First Intro Skip" issue
// The model often fails on the very first cold request. Retrying fixes this.
const generateSpeechWithRetry = async (ai: GoogleGenAI, params: any, retries = 2): Promise<any> => {
    try {
        return await ai.models.generateContent(params);
    } catch (e: any) {
        if (retries > 0) {
            console.log(`TTS: Generation attempt failed. Retrying... (${retries} left)`);
            await new Promise(r => setTimeout(r, 800)); // Wait 800ms before retry
            return await generateSpeechWithRetry(ai, params, retries - 1);
        }
        throw e;
    }
};

export const speak = async (user: UserProfile, text: string, onStart: () => void, onEnd: (error?: string) => void) => {
    // 1. Stop previous audio
    if (currentSource) { 
        try { currentSource.stop(); } catch(e) {}
        currentSource = null; 
    }
    
    // If text is truly empty, just finish immediately
    if (!text || text.trim().length === 0) {
        onEnd();
        return;
    }

    const apiKey = user.role === 'ADMIN' 
        ? (localStorage.getItem('nexa_admin_api_key') || process.env.API_KEY)
        : localStorage.getItem(`nexa_client_api_key_${user.mobile}`);

    // Fallback if no key (Simulate speech visually)
    if (!apiKey || apiKey === "undefined") {
        onStart(); 
        setTimeout(() => onEnd(), calculateVisualDuration(text));
        return;
    }

    // --- TEXT PRE-PROCESSING ---
    // 1. Remove markdown
    let textForSpeech = text.replace(/[*#_`~]/g, '');

    // 2. PRONUNCIATION FIX (Critical)
    // Force "Lohave" to be pronounced as "लोहवे"
    // Force "Chandan" to be pronounced as "चंदन" to fix "Chendan" accent
    textForSpeech = textForSpeech
        .replace(/Lohave/gi, 'लोहवे')
        .replace(/Chandan/gi, 'चंदन');

    // 3. Remove Emojis & Special Symbols to prevent API choke
    textForSpeech = textForSpeech.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
                                 .replace(/[^\w\s\u0900-\u097F.,!?'"-]/g, '') 
                                 .trim();
    
    // If cleaning removed everything, fallback visually on original text length
    if (!textForSpeech) {
        onStart();
        setTimeout(() => onEnd(), calculateVisualDuration(text));
        return;
    }

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) { console.error("Audio resume failed", e); }
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        // Use Retry Logic here to prevent SILENT_FAIL on first load
        const response = await generateSpeechWithRetry(ai, {
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: textForSpeech }] }],
            config: {
                responseModalities: ['AUDIO' as any], 
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            },
        });

        const candidate = response.candidates?.[0];
        
        // CHECK FOR SAFETY/REFUSAL
        if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
             console.warn(`TTS Warning: Model refused with reason ${candidate.finishReason}.`);
             throw new Error("SILENT_FAIL");
        }

        const base64Audio = candidate?.content?.parts?.[0]?.inlineData?.data;
        
        if (!base64Audio) {
            console.warn("TTS: No audio data returned.");
            throw new Error("SILENT_FAIL");
        }

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
        // Handle failures gracefully without scary console errors
        if (e.message === "SILENT_FAIL") {
             console.warn("TTS: Switched to Visual Mode (Audio Generation Skipped)");
        } else {
             console.warn(`TTS: Network/API Issue (${e.message}). Switched to Visual Mode.`);
        }

        onStart();
        // Fallback: Visual simulation to maintain flow
        setTimeout(() => {
            onEnd(); 
        }, calculateVisualDuration(text));
    }
};

export const stop = (): void => {
    if (currentSource) { 
        try { currentSource.stop(); } catch(e) {}
        currentSource = null; 
    }
};

export const speakIntro = speak;