import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, UserRole, AppConfig } from "../types";
import { getAudioContext, playErrorSound } from "./audioService";

let currentSource: AudioBufferSourceNode | null = null;

// Helper to fix specific pronunciations without changing UI text
const fixPronunciation = (text: string): string => {
    // MANDATORY PRONUNCIATION RULE:
    // Whenever NEXA SPEAKS the name “Lohave”, it MUST ALWAYS pronounce it exactly as: “लोहवे”
    // This ensures the audio output matches the Hindi pronunciation requested.
    return text.replace(/Lohave/gi, "लोहवे");
};

/**
 * Cleans text to be suitable for Text-to-Speech conversion.
 * Removes markdown, system tags, and excessive whitespace to prevent API errors.
 */
const cleanTextForTTS = (text: string): string => {
    if (!text) return '';
    let cleaned = text;

    // 1. Normalize problematic punctuation
    cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, '-');

    // 2. Remove custom system tags like [[STATE:WARNING]]
    cleaned = cleaned.replace(/\[\[.*?\]\]/g, ' ');

    // 3. Remove markdown formatting
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');      // **bold**
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');          // *italic*
    cleaned = cleaned.replace(/__(.*?)__/g, '$1');          // __bold__
    cleaned = cleaned.replace(/`(.*?)`/g, '$1');            // `code`
    
    // 4. Remove standalone markdown characters
    cleaned = cleaned.replace(/[*#_`~]/g, '');

    // 5. Collapse multiple whitespace
    cleaned = cleaned.replace(/\s\s+/g, ' ');

    return cleaned.trim();
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

// Helper function to perform the actual API call
const generateAudioFromGemini = async (ai: GoogleGenAI, text: string, voiceName: string) => {
    // Note: safetySettings are not supported for TTS models and cause RPC errors if included.
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO], 
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        }
    });

    const candidate = response.candidates?.[0];
    const base64Audio = candidate?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
        throw new Error(`API_NO_AUDIO: ${candidate?.finishReason || 'UNKNOWN'}`);
    }

    return base64Audio;
};

export const speak = async (user: UserProfile, text: string, config: AppConfig, onStart: (audioDuration: number) => void, onEnd: (error?: string) => void, isAngry: boolean = false) => {
    stop();
    
    // Step 1: Fix pronunciation (Lohave -> लोहवे)
    const audioText = fixPronunciation(text);
    
    // Step 2: Clean for TTS
    const cleanText = cleanTextForTTS(audioText);

    if (!cleanText || cleanText.length === 0) {
        onEnd();
        return;
    }

    const apiKey = user.role === UserRole.ADMIN 
        ? (localStorage.getItem('nexa_admin_api_key') || process.env.API_KEY)
        : localStorage.getItem(`nexa_client_api_key_${user.mobile}`);

    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
        console.warn("TTS Aborted: API Key missing.");
        playErrorSound();
        onEnd("MISSING_API_KEY");
        return;
    }

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) { console.error("TTS: Audio resume failed", e); }
    }

    const ai = new GoogleGenAI({ apiKey });

    // Primary voice selection
    // 'Kore' is standard female, 'Fenrir' is deep/angry.
    const primaryVoice = isAngry ? 'Fenrir' : 'Kore';
    
    let base64Audio: string | undefined;

    try {
        // Attempt 1: Primary Voice
        try {
            base64Audio = await generateAudioFromGemini(ai, cleanText, primaryVoice);
        } catch (err: any) {
            console.warn(`TTS Primary Voice (${primaryVoice}) failed:`, err.message);
            
            // If the error is related to content generation failure (OTHER), retry with a stable fallback voice.
            if (err.message.includes('API_NO_AUDIO') || err.message.includes('OTHER') || err.message.includes('Rpc failed')) {
                 // Smart Gender Fallback:
                 // If primary was Angry (Male), fallback to Puck (Male).
                 // If primary was Standard (Female), fallback to 'Aoede' (Distinctly Female).
                 // 'Aoede' is safer than 'Zephyr' for maintaining female persona.
                 const fallbackVoice = isAngry ? 'Puck' : 'Aoede';
                 
                 console.log(`Retrying TTS with fallback voice: ${fallbackVoice}`);
                 base64Audio = await generateAudioFromGemini(ai, cleanText, fallbackVoice);
            } else {
                throw err; // Re-throw if it's not a generation error (e.g., Auth error)
            }
        }

        if (!base64Audio) throw new Error("TTS_GENERATION_FAILED");

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
        console.error("TTS Critical Failure:", e);
        // Do NOT play error sound here to avoid spamming if it's a chat loop
        onEnd("TTS_FAILED");
    }
};

export const stop = (): void => {
    if (currentSource) {
        currentSource.onended = null;
        try { currentSource.stop(); } catch(e) { /* ignore error */ }
        currentSource = null; 
    }
};

export const speakIntro = async (user: UserProfile, text: string, config: AppConfig, onStart: (duration: number) => void, onEnd: (error?: string) => void) => {
    // For intro, we always use the standard voice
    speak(user, text, config, onStart, onEnd, false);
};