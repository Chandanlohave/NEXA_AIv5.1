import { GoogleGenAI, Modality } from "@google/genai";

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

const checkApiKey = () => {
  // PRIORITY 1: Check if user has entered a custom key (Highest priority)
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey) return customKey;

  // PRIORITY 2: Owner Verification
  const userStr = localStorage.getItem('nexa_user');
  let isOwner = false;
  if (userStr) {
      try {
          const user = JSON.parse(userStr);
          // Only 'ADMIN' role gets to use the system key
          if (user.role === 'ADMIN') {
              isOwner = true;
          }
      } catch (e) {}
  }

  // PRIORITY 3: Use System Key ONLY if Owner
  if (isOwner) {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API_KEY_MISSING");
      }
      return apiKey;
  }

  // PRIORITY 4: Block Access
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

async function decodePcmAudioData(
  data: Uint8Array,
  ctx: AudioContext
): Promise<AudioBuffer> {
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

export const speak = async (text: string, onStart: () => void, onEnd: () => void): Promise<void> => {
    stop();
    initAudioContext();
    if (!audioCtx) {
        console.error("AudioContext could not be initialized.");
        onEnd();
        return;
    }
    
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    try {
        const apiKey = checkApiKey();
        const ai = new GoogleGenAI({ apiKey });

        // Updated Prompt: Universal Language Support
        const ttsPrompt = `
        You are a highly advanced multilingual voice engine.
        Task: Read the following text aloud with the correct native accent.
        
        Guidelines:
        1. **Detect Language:** Analyze the text to determine its language (e.g., Hindi, Marathi, Tamil, Spanish, French, English).
        2. **Native Accent:** 
           - If the text is Indian (Hindi, Marathi, Tamil, Telugu, Punjabi, Kannada, etc.) or Hinglish, use a **natural Indian female accent**.
           - If the text is Spanish, use a **native Spanish female accent**.
           - If the text is French, use a **native French female accent**.
           - (Apply this logic for ANY language detected).
        3. **Pronunciation:** Ensure names and regional words are pronounced accurately according to their origin.
        
        CRITICAL PRONUNCIATION RULE: If the name "Lohave" appears, you MUST pronounce it as "Lo-ha-vay" (rhymes with 'way'), NOT "Lo-have". 
        
        Text to speak: "${text}"`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: ttsPrompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from Gemini.");
        }
        
        onStart();

        const audioBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodePcmAudioData(audioBytes, audioCtx);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        
        source.onended = () => {
            onEnd();
            currentSource = null;
        };

        source.start();
        currentSource = source;

    } catch (error: any) {
        console.error("Gemini TTS Error:", error);
        if (error.message?.includes('API key not valid')) {
            throw new Error("API_KEY_INVALID");
        }
        if (error.message !== 'GUEST_ACCESS_DENIED') {
           console.error("TTS failed", error);
        }
        onEnd();
    }
};

export const stop = (): void => {
    if (currentSource) {
        try {
            currentSource.stop();
        } catch (e) {
            console.warn("Could not stop audio source, it may have already finished.", e);
        }
        currentSource = null;
    }
};