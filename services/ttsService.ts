import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, ChatMessage } from "../types";
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

    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === "undefined") {
        onEnd("MISSING_API_KEY");
        return;
    }

    const ctx = getAudioContext();
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio");

        const audioBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodePcmAudioData(audioBytes, ctx);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => { onEnd(); currentSource = null; };
        source.start();
        currentSource = source;
        onStart();
    } catch (e) {
        console.error("TTS Error", e);
        playErrorSound();
        onEnd("FAILED");
    }
};

export const stop = (): void => {
    if (currentSource) { currentSource.stop(); currentSource = null; }
};

export const speakIntro = speak;
