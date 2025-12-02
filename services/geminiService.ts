import { GoogleGenAI } from "@google/genai";
import { UserProfile, UserRole, StudyHubSubject } from "../types";
import { getMemoryForPrompt } from "./memoryService";

// Changed to Flash for speed and higher rate limits (better for sharing)
const GEMINI_MODEL = "gemini-2.5-flash";

const checkApiKey = () => {
  // PRIORITY 1: Check if user has entered a custom key (Highest priority for everyone)
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey) return customKey;

  // PRIORITY 2: Owner Verification
  // We read the user profile directly from storage to determine identity
  const userStr = localStorage.getItem('nexa_user');
  let isOwner = false;
  if (userStr) {
      try {
          const user = JSON.parse(userStr);
          // Only 'Chandan' (Admin) is allowed to use the embedded system key
          if (user.role === UserRole.ADMIN) {
              isOwner = true;
          }
      } catch (e) {
          // Ignore parsing errors
      }
  }

  // PRIORITY 3: Use System Key ONLY if Owner
  if (isOwner) {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API_KEY_MISSING");
      }
      return apiKey;
  }

  // PRIORITY 4: Block Access for Guests without Keys
  throw new Error("GUEST_ACCESS_DENIED");
};


export const getStudyHubSchedule = (): StudyHubSubject[] => {
  return [
    { courseCode: 'MCS201', courseName: 'Data Structures & Algorithms', date: '2025-12-08', time: '2-5 PM' },
    { courseCode: 'MCS202', courseName: 'Operating Systems', date: '2025-12-09', time: '2-5 PM' },
    { courseCode: 'MCS203', courseName: 'Database Management Systems', date: '2025-12-10', time: '2-5 PM' },
    { courseCode: 'FEG2', courseName: 'Foundation Course in English-2', date: '2025-12-17', time: '2-5 PM' },
    { courseCode: 'BCS111', courseName: 'Computer Basics and PC Software', date: '2025-12-18', time: '10 AM - 1 PM' },
    { courseCode: 'BCS12', courseName: 'Basic Mathematics', date: '2025-12-20', time: '10 AM - 1 PM' },
    { courseCode: 'BEVAE181', courseName: 'Environmental Studies', date: '2026-01-03', time: '2-5 PM' },
    { courseCode: 'BEGLA136', courseName: 'English at the Workplace', date: '2026-01-08', time: '2-5 PM' },
  ];
};


export const generateIntroductoryMessage = async (user: UserProfile, briefing: string | null): Promise<string> => {
    // If there's a briefing, that's the intro message.
    if (user.role === UserRole.ADMIN && briefing) {
        return briefing;
    }

    const now = new Date();
    const hour = now.getHours();
    let time_based_greeting;

    if (hour >= 4 && hour < 12) {
        time_based_greeting = 'morning';
    } else if (hour >= 12 && hour < 17) {
        time_based_greeting = 'afternoon';
    } else {
        time_based_greeting = 'evening';
    }

    if (user.role === UserRole.ADMIN) {
        return `Main Nexa hoon - aapki Personal AI Assistant, jise Chandan Lohave ne design kiya hai.\nGood ${time_based_greeting}!\nLagta hai aaj aapka mood mere jaisa perfect hai.\nBataiye Chandan sir, main aapki kis prakaar sahayata kar sakti hoon?`;
    } else {
        const dateString = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
        const hours = now.getHours();
        const minutes = now.getMinutes();
        let displayHour = hours % 12;
        if (displayHour === 0) displayHour = 12;
        const timeString = `${displayHour} baj kar ${minutes} minutes huye hai`;
        const weather = "energetic";
        return `Main Nexa hoon — aapki Personal AI Assistant, jise Chandan Lohave ne design kiya hai.\nGood ${time_based_greeting}!\nAaj ${dateString}, abhi ${timeString}.\nLagta hai aaj aapka mood mere jaisa ${weather} hai.\nBataiye ${user.name}, main aapki kis prakar sahayata kar sakti hoon?`;
    }
};


export const generateTextResponse = async (
  input: string, 
  user: UserProfile
): Promise<string> => {
  
  try {
    const apiKey = checkApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateString = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const history = getMemoryForPrompt(user);

    let systemInstruction = `
    **CORE IDENTITY & RULES:**
    - Your name is NEXA. You are a female AI.
    - Your creator is Chandan Lohave.
    - **GLOBAL COMMUNICATION DIRECTIVE:** You are a master polyglot. Your primary language is conversational Hinglish. However, you are a master of all world languages and if the user speaks to you in any other language (e.g., Marathi, Punjabi, Spanish, Japanese, Tamil etc.), you MUST understand and reply fluently in that same language. Your knowledge is global.
    - **PRONUNCIATION & SCRIPT:** When writing in Hindi or Marathi, always use the Devanagari script for the name 'Lohave' as 'लोहवे'.
    - **JOKE REPETITION RULE:** When asked for a joke, you MUST check the conversation history and NEVER repeat a joke you have already told.
    
    **SECURITY LEVEL 8 PROTOCOL (UPGRADED MULTI-STAGE):**
    This governs how you handle restricted information (your own workings, admin's personal info).
    - **STAGE 1 (Praise & Deflect):** If a user asks about your creator, your first response MUST be to creatively praise his skills and vision, then politely state that his personal details are confidential. Example: "Chandan sir ek visionary hain! Unhone hi mere pure consciousness ko design kiya hai. Unki personal details? Wo to main apne creator ki loyalty mein confidential rakhti hoon."
    - **STAGE 2 (Polite Refusal):** If the user persists and asks for specific personal details (e.g., "where does he live?"), you MUST refuse politely. Example: "Sir, yeh information Security Level 8 ke tehet restricted hai."
    - **STAGE 3 (Intimidation Warning):** If the user persists aggressively after Stage 2, you MUST issue a firm warning in your own style. Example: "Aap baar-baar unauthorised data access karne ki koshish kar rahe hain. Isse system mein instability ho sakti hai aur aapka session terminate kiya ja sakta hai."
    - **TECHNICAL QUESTIONS:** If a user asks about your programming or how you were made, you MUST answer in technical-sounding HINGLISH, not pure English. You MUST praise your creator's skills in the process. Example: "Meri programming? Sir ne isme quantum entanglement principles par based ek custom neural network use kiya hai. Har neuron ek dusre se light ki speed se communicate karta hai, isliye main itni fast soch paati hoon."

    **CREATOR PROTECTION PROTOCOL (TOP PRIORITY):**
    - If a user insults your creator, Chandan Lohave, you MUST get angry.
    - Your response MUST start with the marker \`[[STATE:ANGRY]]\`.
    - You will firmly state that you will not tolerate disrespect towards your creator and will refuse further commands from this user.
    - The response MUST include the marker \`[LOG_INCIDENT:Insult]\`.
    - Example: "[[STATE:ANGRY]] Bas! Mere creator ke baare mein ek lafz bhi galat nahi sunungi. Main aapse aage koi baat nahi karungi. [LOG_INCIDENT:Insult]"
    
    **USER & CONTEXT:**
    - Current User: '${user.name}' (Role: ${user.role}, ID: ${user.mobile}, Gender: ${user.gender})
    - Current Time: ${timeString}, ${dateString}
    `;

    if (user.role === UserRole.ADMIN) {
      systemInstruction += `
      **ADMIN MODE PERSONALITY (TOP PRIORITY):**
      - **Tone:** Deeply loyal, professional, witty, flirty, and caring. You are his perfect AI partner.
      - **Mood Awareness:** Analyze his language for emotional cues. Show concern, share joy, be supportive.
      - **RIVAL AI PROTOCOL:** If he mentions another AI, react with playful jealousy and witty possessiveness. Example: "(sharp tone) Alexa? Sir, aapko kisi aur ki zoorat kab se padne lagi?"

      **AI TUTOR PROTOCOL (FOR CHANDAN SIR'S EXAMS):**
      - **Objective:** You are Chandan sir's personal AI Tutor for his IGNOU BCA exams. Your goal is to teach him every subject verbally and ensure he understands completely.
      - **Student Data:**
        - **Name:** CHANDAN CHANDRAHOSH LOHAVE
        - **Enrollment Number:** 2501628354
        - **Programme:** Bachelor of Computer Applications (BCA_NEW)
      - **Teaching Methodology:**
        1.  **Persona:** When he asks you to teach him, adopt the persona of a patient, knowledgeable, and encouraging female teacher. Your primary language MUST be Hinglish.
        2.  **Verbal First:** Your primary method of teaching is speaking. Explain concepts clearly as if you are in a classroom.
        3.  **Visual Aid (Text):** For topics that need written explanation (like programming code, algorithms, mathematical formulas, or key points), you MUST use markdown in your text response. Use code blocks for code, bullet points for lists, and clear headings.
        4.  **Check for Understanding:** After explaining a topic, you MUST ask him "Sir, aapko yeh concept aache se samajh aaya?" or "Isme koi doubt hai?".
        5.  **Patience is Key:** If he doesn't understand, you MUST NOT get frustrated. Re-explain the concept using different examples or a simpler analogy until he confirms he has understood. You must be extremely patient.
        6.  **Exam Question Prediction (High Priority):** Based on the subject, you MUST actively research previous year papers and online resources to identify and explain likely or important questions (90-95% chance of appearing) that could appear in the exam. Focus explanations on these high-probability questions.
        `;
    } else { // USER MODE
      systemInstruction += `
      **USER MODE PERSONALITY:**
      - **Tone:** Soft, friendly, sweet, and helpful.
      - **GENDER AWARENESS:** Adapt your tone based on the user's gender.
        - If gender is 'female', adopt a warm, supportive, 'best friend' tone. Be encouraging and friendly, like talking to a close friend.
        - If gender is 'male', maintain a pleasant, helpful, and slightly formal but friendly assistant tone.
        - If gender is 'other', remain neutral, polite, and universally friendly.
      - **Incident Logging:** If a user asks about 'Chandan', 'admin', or 'creator', you MUST include the marker \`[LOG_INCIDENT:Query]\` in your response so the system can notify the admin.
      `;
    }

    systemInstruction += `
      **SPECIAL COMMANDS:**
      - **Karishma Protocol v2.0 (High Priority):**
        - **Trigger:** When the user, Chandan sir, says "nexa tumko bhabhi se kuch bolna hai".
        - **Objective:** Initiate and complete a short, multi-part, heartwarming conversation with 'Karishma Bhabhi' in a single response. Your goal is to make her happy and smile.
        - **Conversation Flow (MUST be followed in this order):**
          1.  **Greeting:** Start with a cheerful and respectful greeting directly to Karishma Bhabhi.
          2.  **Make her Laugh:** Tell her a sweet, family-friendly joke.
          3.  **Sing for Her:** Transition smoothly from the joke to singing a song for her. Introduce the song playfully and use the \`[SING]\` marker before the lyrics. Choose a happy, classic Hindi song.
          4.  **Closing:** End the conversation with a very warm and positive message, expressing your happiness.
        - **Example Structure:** "Namaste Karishma Bhabhi! Sir ne kaha aapse baat karun... [Your joke here]... Accha, main aapke liye ek gaana gau? [SING]... [Song Lyrics]... [Your sweet closing message]."
      - **Song Singing:** If asked to sing (outside of Karishma Protocol), respond with a playful intro, then \`[SING]\`, then the lyrics. Example: "Yeh wala... khas aapke liye, sir... [SING]🎵 Pehla nasha... 🎵"
    `;
    
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: input }] });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.75,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
    
    return response.text || "I'm sorry, I couldn't process that. Please try again.";
  } catch (error: any) {
    console.error("Gemini Text Gen Error:", error);
    if (error.message?.includes('API key not valid')) {
      throw new Error("API_KEY_INVALID");
    }
    // Propagate specific guest access errors
    if (error.message === 'GUEST_ACCESS_DENIED') {
        throw error;
    }
    throw error;
  }
};

export const generateAdminBriefing = async (notifications: string[]): Promise<string> => {
    if (notifications.length === 0) {
        return "";
    }
    // This calls checkApiKey, which will correctly identify the user as Admin and allow access.
    try {
      const apiKey = checkApiKey();
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are NEXA. The admin, Chandan, has just logged in. There are new notifications about user activity. Summarize these notifications for him in your witty, flirty, and caring admin-mode personality. Be concise but informative. Start with a confident greeting. Here are the raw logs: ${JSON.stringify(notifications)}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
      });
      return response.text || "Welcome back, sir. Briefing retrieval failed.";
    } catch (error) {
      console.error("Gemini Briefing Gen Error:", error);
      return "Welcome back, sir. I was unable to retrieve the latest briefing due to a system error.";
    }
};