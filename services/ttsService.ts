import { GoogleGenAI, Modality } from "@google/genai";
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

export const speak = async (user: UserProfile, text: string, onStart: () => void, onEnd: (error?: string) => void) => {
    if (currentSource) { currentSource.stop(); currentSource = null; }

    const apiKey = user.role === 'ADMIN' 
        ? (localStorage.getItem('nexa_admin_api_key') || process.env.API_KEY)
        : localStorage.getItem(`nexa_client_api_key_${user.mobile}`);

    if (!apiKey || apiKey === "undefined") {
        onEnd("MISSING_API_KEY");
        return;
    }

    // CRITICAL: Pronunciation Override
    // We replace "Lohave" with "लोहवे" ONLY for the audio generation prompt.
    // This forces the TTS model to pronounce it with the correct Hindi accent,
    // while the visual text on screen remains "Lohave".
    const textForSpeech = text.replace(/Lohave/gi, "लोहवे");

    const ctx = getAudioContext();
    try {
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: textForSpeech }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data received from TTS API.");

        const audioBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodePcmAudioData(audioBytes, ctx);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => { onEnd(); currentSource = null; };
        
        onStart(); // Trigger UI update as soon as we start playing
        source.start();
        currentSource = source;

    } catch (e: any) {
        console.error("TTS Error:", e.message);
        playErrorSound();
        onEnd("TTS_FAILED");
    }
};

export const stop = (): void => {
    if (currentSource) { currentSource.stop(); currentSource = null; }
};

export const speakIntro = speak;