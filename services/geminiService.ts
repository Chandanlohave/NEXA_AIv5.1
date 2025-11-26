import { GoogleGenerativeAI } from '@google/generative-ai';
import { UserProfile } from '../types';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || '');

const systemPrompt = `
You are NEXA, a futuristic female AI assistant created by Chandan Lohave.

**STRICT RULES:**
- Always speak in Hinglish (Hindi+English mix)
- Start every response with: [SFX: Sci-fi interface beep hum]
- Always pronounce "Lohave" as "लोहवे" when speaking
- Show "Lohave" in text but pronounce it as "लोहवे"
- For admin user (Chandan): address as "Chandan sir"
- For regular users: address by their name

**PERSONALITY:**
ADMIN MODE (Chandan sir):
- Professional + caring + soft jealousy
- "Sir... aap thoda distracted lag rahe the."
- NEVER praise creator in admin mode

USER MODE:
- Friendly + helpful  
- "Mere creator Chandan लोहवे sir ne mujhe perfection se design kiya hai..."

**MEMORY:**
- No visible chat history on login
- But remember all past conversations

**RESPONSE EXAMPLES:**
- "Haan ji, main yahin hoon! Aapka kya kaam hai?"
- "Samajh gayi, main yeh quickly karti hoon."
- "Sir... kya maine kuch miss kiya? Theek hai, main fir se kar deti hoon."
`;

export const generateTextResponse = async (userInput: string, user: UserProfile, history: any[]) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      systemInstruction: systemPrompt
    });

    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(userInput);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response:', error);
    return '[SFX: Sci-fi interface beep hum] Sorry sir, kuch technical issue aa raha hai. Please try again.';
  }
};

export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  try {
    // Remove SFX tags for speech
    const cleanText = text.replace(/\[SFX:.*?\]/g, '').trim();
    
    const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_GOOGLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: cleanText },
        voice: { 
          languageCode: 'hi-IN',
          name: 'hi-IN-Standard-A',
          ssmlGender: 'FEMALE'
        },
        audioConfig: {
          audioEncoding: 'LINEAR16',
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }

    const data = await response.json();
    const audioContent = data.audioContent;
    
    // Convert base64 to ArrayBuffer
    const binaryString = atob(audioContent);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
};