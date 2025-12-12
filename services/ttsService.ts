import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, UserRole } from "../types";

const NEXA_VOICE = 'Zephyr'; 
const CACHE_VERSION = 'v4_emotional'; // Bump version for new style

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

const checkApiKey = () => {
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey) return customKey;

  const userStr = localStorage.getItem('nexa_user');
  let isOwner = false;
  if (userStr) {
      try {
          const user = JSON.parse(userStr);
          if (user.role === 'ADMIN') isOwner = true;
      } catch (e) {}
  }

  if (isOwner) {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API_KEY_MISSING");
      return apiKey;
  }
  throw new Error("GUEST_ACCESS_DENIED");
};

const initAudioContext = () => {
    if (!audioCtx && typeof window !== 'undefined') {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
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
  const sampleRate = 24000;
  const numChannels = 1;
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

const playAudioBuffer = (buffer: AudioBuffer, onStart: () => void, onEnd: () => void) => {
    if (!audioCtx) return;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.onended = () => { onEnd(); currentSource = null; };
    source.start();
    currentSource = source;
    onStart();
};

const generateAndPlay = async (user: UserProfile, text: string, cacheKey: string | null, onStart: () => void, onEnd: () => void) => {
    stop();
    initAudioContext();
    if (!audioCtx) return onEnd();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    // Cache Check
    if (cacheKey) {
        const fullKey = `${cacheKey}_${NEXA_VOICE}_${CACHE_VERSION}`;
        const cachedAudio = localStorage.getItem(fullKey);
        if (cachedAudio) {
             try {
                const audioBytes = decodeBase64(cachedAudio);
                const audioBuffer = await decodePcmAudioData(audioBytes, audioCtx);
                playAudioBuffer(audioBuffer, onStart, onEnd);
                return;
             } catch (e) { localStorage.removeItem(fullKey); }
        }
    }

    try {
        const apiKey = checkApiKey();
        const ai = new GoogleGenAI({ apiKey });
        
        let forcedText = text.replace(/Lohave/gi, "लोहवे").replace(/लोहावे/g, "लोहवे").replace(/Chandan/gi, "चंदन");
        
        // --- KEY CHANGE: EMOTIONAL TTS PROMPTING ---
        let ttsPrompt = "";
        if (user.role === UserRole.ADMIN) {
            ttsPrompt = `
            Task: Speak the text as a loving, slightly flirty girlfriend whispering to her partner.
            Tone: Breathy, soft, expressive, warm. Not robotic.
            Style: Indian English accent.
            Text: "${forcedText}"
            `;
        } else {
             ttsPrompt = `
            Task: Speak the text as a helpful, professional AI assistant.
            Tone: Friendly, clear, energetic.
            Style: Indian English accent.
            Text: "${forcedText}"
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
        if (!base64Audio) throw new Error("No audio data.");

        if (cacheKey) {
            localStorage.setItem(`${cacheKey}_${NEXA_VOICE}_${CACHE_VERSION}`, base64Audio);
        }

        const audioBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodePcmAudioData(audioBytes, audioCtx);
        playAudioBuffer(audioBuffer, onStart, onEnd);

    } catch (error: any) {
        console.error("TTS Error:", error);
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
