

import React, { useState, useEffect, useRef } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig } from './types';
import { generateTextResponse, generateSpeech } from './services/geminiService';

// --- ICONS ---

const GearIcon = () => (
  <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 1.9-.94 3.31-.826 3.31-2.37 0-3.35-.426-3.35-2.924 0-3.35a1.724 1.724 0 00-1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.94 1.543 2.924 1.543 3.35 0a1.724 1.724 0 002.573-1.066c1.543.94 3.31-.826 2.37-1.9.94-3.31.826-3.31 2.37 0 3.35.426 3.35 2.924 0 3.35a1.724 1.724 0 001.066 2.573c.94 1.543-.826 3.31-2.37 2.37-.94-1.543-2.924-1.543-3.35 0a1.724 1.724 0 00-2.573 1.066c-1.543-.94-3.31.826-2.37 1.9zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-4-12v8m8-8v8m-12-5v2m16-2v2" />
  </svg>
);

// --- AMBIENT SOUND GENERATOR ---
class AmbientGenerator {
  private ctx: AudioContext | null = null;
  private mainGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];

  start() {
    if (this.ctx && this.ctx.state === 'running') return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.mainGain = this.ctx.createGain();
    this.mainGain.gain.value = 0.0;
    this.mainGain.connect(this.ctx.destination);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 60; 
    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.value = 150;
    osc1.connect(filter1);
    filter1.connect(this.mainGain);
    
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 40;
    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 100;
    osc2.connect(filter2);
    filter2.connect(this.mainGain);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain);
    lfoGain.connect(filter1.frequency);

    osc1.start();
    osc2.start();
    lfo.start();
    this.oscillators.push(osc1, osc2, lfo);

    const now = this.ctx.currentTime;
    this.mainGain.gain.linearRampToValueAtTime(0.03, now + 4); 
  }

  stop() {
    if (!this.ctx || !this.mainGain) return;
    try {
      const now = this.ctx.currentTime;
      this.mainGain.gain.cancelScheduledValues(now);
      this.mainGain.gain.setValueAtTime(this.mainGain.gain.value, now);
      this.mainGain.gain.linearRampToValueAtTime(0, now + 1.5);
      
      setTimeout(() => {
        this.oscillators.forEach(o => { try { o.stop(); o.disconnect(); } catch (e) {} });
        this.mainGain?.disconnect();
        if (this.ctx && this.ctx.state !== 'closed') { this.ctx.close(); }
        this.ctx = null;
        this.mainGain = null;
        this.oscillators = [];
      }, 1600);
    } catch(e) { console.warn("Ambient stop error", e); }
  }
}

// --- COMPONENTS ---

const InstallBanner: React.FC<{ prompt: any, onInstall: () => void }> = ({ prompt, onInstall }) => {
  if (!prompt) return null;
  return (
    <div className="w-full bg-nexa-cyan/10 border-b border-nexa-cyan/30 backdrop-blur-md py-3 px-4 flex items-center justify-between animate-slide-down z-50 fixed top-0 left-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-nexa-cyan/20 rounded flex items-center justify-center border border-nexa-cyan/50">
           <svg className="w-5 h-5 text-nexa-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </div>
        <div>
          <div className="text-nexa-cyan text-[10px] font-mono tracking-widest uppercase">System Upgrade</div>
          <div className="text-white text-xs font-mono opacity-80">Install Native Protocol</div>
        </div>
      </div>
      <button onClick={onInstall} className="bg-nexa-cyan hover:bg-white text-black text-[10px] font-bold font-mono py-2 px-3 rounded shadow-[0_0_10px_rgba(41,223,255,0.4)] transition-all uppercase">Install</button>
    </div>
  );
};

const StatusBar = ({ role, onLogout, onSettings }: any) => (
  <div className="w-full h-16 shrink-0 flex justify-between items-center px-6 border-b border-nexa-cyan/10 bg-black/80 backdrop-blur-md z-40 relative">
    <div className="flex items-center gap-4"><div className="flex flex-col items-start"><div className="text-[10px] text-nexa-cyan font-mono tracking-widest uppercase">System Online</div><div className="flex gap-1 mt-1"><div className="w-8 h-1 bg-nexa-cyan shadow-[0_0_5px_currentColor]"></div><div className="w-2 h-1 bg-nexa-cyan/50"></div><div className="w-1 h-1 bg-nexa-cyan/20"></div></div></div></div>
    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"><div className="text-xl font-bold tracking-[0.3em] text-white/90 drop-shadow-[0_0_10px_rgba(41,223,255,0.5)]">NEXA</div></div>
    <div className="flex items-center gap-4">{role === UserRole.ADMIN && (<button onClick={onSettings} className="p-2 hover:bg-nexa-cyan/10 rounded-full transition-colors"><GearIcon /></button>)}<button onClick={onLogout} className="p-2 hover:bg-red-500/10 rounded-full transition-colors"><LogoutIcon /></button></div>
  </div>
);

const ControlDeck = ({ onMicClick, hudState }: any) => (
  <div className="w-full h-24 shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent z-40 relative flex items-center justify-center pb-6">
    <div className="absolute bottom-0 w-full h-[1px] bg-nexa-cyan/30"></div>
    <button onClick={onMicClick} className={`relative w-20 h-20 flex items-center justify-center transition-all duration-300 group ${hudState === HUDState.LISTENING ? 'scale-110' : 'hover:scale-105 active:scale-95'}`}>
      <div className={`absolute inset-0 bg-black border ${hudState === HUDState.LISTENING ? 'border-nexa-red shadow-[0_0_30px_rgba(255,42,42,0.6)]' : 'border-nexa-cyan shadow-[0_0_20px_rgba(41,223,255,0.4)]'} transition-all duration-300`} style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
      <div className={`relative z-10 ${hudState === HUDState.LISTENING ? 'text-nexa-red animate-pulse' : 'text-nexa-cyan group-hover:text-white'} transition-colors`}><MicIcon /></div>
    </button>
  </div>
);

const pcmToAudioBuffer = (pcmData: ArrayBuffer, context: AudioContext): AudioBuffer => {
  const int16Array = new Int16Array(pcmData);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) { float32Array[i] = int16Array[i] / 32768; }
  const buffer = context.createBuffer(1, float32Array.length, 24000); 
  buffer.getChannelData(0).set(float32Array);
  return buffer;
};

// --- MAIN APP ---
const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]); // UI state: Only shows current turn
  const [hudState, setHudState] = useState<HUDState>(HUDState.IDLE);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [config, setConfig] = useState<AppConfig>({ introText: "", animationsEnabled: true, hudRotationSpeed: 1, ambientSoundEnabled: true });

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientRef = useRef(new AmbientGenerator());
  const isProcessingRef = useRef(false);
  const memoryRef = useRef<ChatMessage[]>([]); // Full conversation history for AI

  useEffect(() => {
    const savedUser = localStorage.getItem('nexa_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      loadMemory(parsedUser.mobile);
    }
    const savedConfig = localStorage.getItem('nexa_config');
    if (savedConfig) { setConfig(JSON.parse(savedConfig)); }
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setInstallPrompt(e); });

    // GLOBAL TOUCH UNLOCK: Ensure AudioContext is ready on first touch anywhere
    const unlockHandler = () => {
        unlockAudioContext();
        window.removeEventListener('touchstart', unlockHandler);
        window.removeEventListener('click', unlockHandler);
    };
    window.addEventListener('touchstart', unlockHandler);
    window.addEventListener('click', unlockHandler);

    return () => {
        window.removeEventListener('touchstart', unlockHandler);
        window.removeEventListener('click', unlockHandler);
    };
  }, []);

  useEffect(() => { localStorage.setItem('nexa_config', JSON.stringify(config)); }, [config]);

  useEffect(() => {
    if (user && config.ambientSoundEnabled) { setTimeout(() => ambientRef.current.start(), 100); } 
    else { ambientRef.current.stop(); }
    return () => ambientRef.current.stop();
  }, [user, config.ambientSoundEnabled]);

  useEffect(() => {
    if (!user || user.role !== UserRole.ADMIN) return;
    const checkTime = () => {
      const now = new Date();
      if (now.getHours() === 23 && now.getMinutes() === 0) {
        speakSystemMessage("Sir… 11 baj chuke hain. Kal aapko Encave Cafe duty bhi karni hai. Please rest kar lijiye… main yahin hoon.");
      }
      if (now.getHours() === 8 && now.getMinutes() === 0) {
        speakSystemMessage("Sir… aaj Encave Café duty hai, time se tayar ho jaiye.");
      }
    };
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // --- ROBUST SPEECH RECOGNITION SETUP ---
  const initSpeechRecognition = () => {
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Indian English for better recognition

      recognition.onstart = () => {
          console.log("Recognition started");
          setHudState(HUDState.LISTENING);
      };
      recognition.onend = () => {
          console.log("Recognition ended");
          if (hudState === HUDState.LISTENING) setHudState(HUDState.IDLE);
      };
      recognition.onerror = (event: any) => {
        console.error("Speech Error", event.error);
        if (event.error === 'aborted' || event.error === 'no-speech') { return; }
        setHudState(HUDState.IDLE);
        // Optional: Speak an error for better feedback
        // speakNative("System link unstable."); 
      };
      recognition.onresult = (event: any) => { 
          const transcript = event.results[0][0].transcript;
          console.log("Heard:", transcript);
          processQuery(transcript); 
      };
      return recognition;
    }
    return null;
  };

  useEffect(() => {
    recognitionRef.current = initSpeechRecognition();
  }, [user]);

  const loadMemory = (mobile: string) => {
    const history = localStorage.getItem(`nexa_chat_${mobile}`);
    if (history) { memoryRef.current = JSON.parse(history); }
  };

  const saveMemory = () => {
    if (user) { localStorage.setItem(`nexa_chat_${user.mobile}`, JSON.stringify(memoryRef.current)); }
  };

  const getAudioContext = () => {
    if (!audioContextRef.current) { audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); }
    return audioContextRef.current;
  };

  // --- AUDIO UNLOCKER FOR VERCEL/MOBILE ---
  const unlockAudioContext = () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        // Play a tiny silent buffer to force the browser to accept audio from this context
        try {
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        } catch(e) {
          console.warn("Audio unlock failed (harmless if already unlocked)", e);
        }
      });
    }
  };

  // --- FALLBACK NATIVE TTS (HYBRID VOICE ENGINE) ---
  const speakNative = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any current speaking
    window.speechSynthesis.cancel();

    // Clean text
    const cleanText = text.replace(/\[\[.*?\]\]/g, "").replace(/\[SFX:.*?\]/g, "").trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Attempt to select a better voice
    const voices = window.speechSynthesis.getVoices();
    // Try to find a Google voice or a female voice, preferably English/Hindi
    const preferredVoice = voices.find(v => (v.name.includes('Google') || v.name.includes('Samantha')) && (v.lang.includes('en') || v.lang.includes('hi')));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;
    
    utterance.onstart = () => {
        setHudState(HUDState.SPEAKING);
    };
    utterance.onend = () => {
        if(isProcessingRef.current) {
            setHudState(HUDState.IDLE);
            isProcessingRef.current = false;
        }
    };
    utterance.onerror = () => {
        if(isProcessingRef.current) {
            setHudState(HUDState.IDLE);
            isProcessingRef.current = false;
        }
    };
    
    // Ensure state is set even if start event lags
    setHudState(HUDState.SPEAKING);
    window.speechSynthesis.speak(utterance);
  };

  // --- Global Pronunciation Fix ---
  const applyPronunciationFix = (text: string): string => {
    // Replaces all occurrences of "Lohave" (case-insensitive) with its phonetic spelling for TTS
    return text.replace(/Lohave/gi, 'लोहवे');
  };

  const handleMicClick = () => {
    unlockAudioContext(); 
    
    // Interrupt logic for THINKING or SPEAKING states
    if (hudState === HUDState.THINKING || hudState === HUDState.SPEAKING) {
        isProcessingRef.current = false;
        if (recognitionRef.current) recognitionRef.current.abort();
        window.speechSynthesis.cancel(); // Also stop native speech
        
        // Force stop any playing audio from WebAudio
        if (audioContextRef.current) {
           audioContextRef.current.suspend().then(() => audioContextRef.current?.resume());
        }
        
        setHudState(HUDState.IDLE);
        return;
    }

    // Start/Stop logic for IDLE or LISTENING states
    if (hudState === HUDState.LISTENING) {
        setHudState(HUDState.IDLE); 
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    } else {
        // ROBUST START: Re-init if null
        if (!recognitionRef.current) {
            recognitionRef.current = initSpeechRecognition();
        }
        try {
            recognitionRef.current?.start();
        } catch (e) {
            console.warn("Recognition start error, resetting...", e);
            // If already started or crashed, hard reset
            recognitionRef.current?.stop();
            setTimeout(() => {
                try { recognitionRef.current?.start(); } catch(err) { console.error("Retry failed", err); }
            }, 100);
        }
    }
  };

  const executeIntents = (text: string) => {
     const intentRegex = /\[\[(.*?):(.*?)\]\]/g;
     let match;
     while ((match = intentRegex.exec(text)) !== null) {
        const command = match[1].toUpperCase();
        const data = match[2];
        if (command === 'WHATSAPP') { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(data)}`, '_blank'); } 
        else if (command === 'CALL') { window.location.href = `tel:${data}`; } 
        else if (command === 'OPEN') {
           const appMap: {[key:string]: string} = { 'YOUTUBE': 'https://www.youtube.com', 'INSTAGRAM': 'https://www.instagram.com' };
           if (appMap[data.toUpperCase()]) window.open(appMap[data.toUpperCase()], '_blank');
        }
     }
  };

  const speakSystemMessage = async (displayText: string) => {
    if (isProcessingRef.current) return;
    setHudState(HUDState.THINKING);
    isProcessingRef.current = true;

    try {
      // 1. Generate audio first
      const spokenText = applyPronunciationFix(displayText);
      
      // OPTIMIZATION: ADD TIMEOUT TO TTS GENERATION
      // If network is slow (taking > 8 seconds), fallback to native voice immediately.
      const audioPromise = generateSpeech(spokenText);
      const timeoutPromise = new Promise<ArrayBuffer | null>((resolve) => 
        setTimeout(() => resolve(null), 8000)
      );
      
      const audioBuffer = await Promise.race([audioPromise, timeoutPromise]);
      
      // Check for processing interruption
      if (!isProcessingRef.current) return;

      const modelMessage: ChatMessage = { role: 'model', text: displayText, timestamp: Date.now() };
      
      executeIntents(displayText);

      if (audioBuffer) {
        // 3. TRY GEMINI VOICE
        try {
            playAudio(audioBuffer, () => {
                 // On success playback start, show text
                 setTimeout(() => {
                    memoryRef.current.push(modelMessage);
                    saveMemory();
                    setMessages([modelMessage]);
                 }, 50);
            });
        } catch (audioError) {
             console.error("Audio Playback Blocked, falling back to Native", audioError);
             memoryRef.current.push(modelMessage);
             saveMemory();
             setMessages([modelMessage]);
             speakNative(displayText); // FALLBACK
        }
      } else {
        // FALLBACK TO NATIVE VOICE IF GEMINI API FAILS OR TIMEOUT
        memoryRef.current.push(modelMessage);
        saveMemory();
        setMessages([modelMessage]);
        speakNative(displayText);
      }
    } catch(e) {
      console.error("Speak System Message Error:", e);
      // Even on system error, try to speak native if we have text
      speakNative(displayText);
    }
  };

  const playAudio = (buffer: ArrayBuffer, onStart?: () => void) => {
      if (!isProcessingRef.current) return;
      
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') { ctx.resume(); }

      setHudState(HUDState.SPEAKING);
      
      try {
          const decodedBuffer = pcmToAudioBuffer(buffer, ctx);
          const source = ctx.createBufferSource();
          source.buffer = decodedBuffer;
          source.connect(ctx.destination);
          
          source.onended = () => { 
            if(isProcessingRef.current) {
              setHudState(HUDState.IDLE); 
              isProcessingRef.current = false; 
            }
          };
          
          source.start();
          if (onStart) onStart();
      } catch (e) {
          throw e; // Re-throw to trigger fallback
      }
  };

  const processQuery = async (text: string) => {
    if (!user || isProcessingRef.current) return;
    
    setHudState(HUDState.THINKING);
    isProcessingRef.current = true;
    
    const userMessage: ChatMessage = { role: 'user', text, timestamp: Date.now() };
    memoryRef.current.push(userMessage);
    saveMemory();
    setMessages([userMessage]); 

    try {
        const rawAiResponse = await generateTextResponse(text, user, memoryRef.current.map(m => ({ role: m.role, parts: [{ text: m.text }] })));
        if (!isProcessingRef.current) { isProcessingRef.current = false; return; }

        const spokenAiResponse = applyPronunciationFix(rawAiResponse);
        
        // OPTIMIZATION: ADD TIMEOUT TO TTS GENERATION
        const audioPromise = generateSpeech(spokenAiResponse);
        const timeoutPromise = new Promise<ArrayBuffer | null>((resolve) => 
            setTimeout(() => resolve(null), 8000)
        );
        
        const audioBuffer = await Promise.race([audioPromise, timeoutPromise]);
        
        if (!isProcessingRef.current) { isProcessingRef.current = false; return; }

        const modelMessage: ChatMessage = { role: 'model', text: rawAiResponse, timestamp: Date.now() };
        executeIntents(rawAiResponse);

        if (audioBuffer) {
             try {
                playAudio(audioBuffer, () => {
                     setTimeout(() => {
                        memoryRef.current.push(modelMessage);
                        saveMemory();
                        setMessages([userMessage, modelMessage]); 
                     }, 50);
                });
            } catch (audioError) {
                console.error("Audio Playback Blocked, falling back to Native", audioError);
                memoryRef.current.push(modelMessage);
                saveMemory();
                setMessages([userMessage, modelMessage]);
                speakNative(rawAiResponse); // FALLBACK
            }
        } else {
             // FALLBACK TO NATIVE VOICE (Timeout or API Fail)
             memoryRef.current.push(modelMessage);
             saveMemory();
             setMessages([userMessage, modelMessage]);
             speakNative(rawAiResponse);
        }
    } catch (e) {
        console.error("Process Query Error", e);
        const errorMessage = 'Connection interrupted. Please try again.';
        const errorMsgObj: ChatMessage = { role: 'model', text: errorMessage, timestamp: Date.now() };
        setMessages([userMessage, errorMsgObj]);
        speakNative(errorMessage); // Speak the error too
    }
  };

  const handleLogin = (profile: UserProfile) => {
    unlockAudioContext();

    setUser(profile);
    localStorage.setItem('nexa_user', JSON.stringify(profile));
    loadMemory(profile.mobile);
    
    setTimeout(() => {
      const hour = new Date().getHours();
      let greeting = 'Good morning';
      if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
      else if (hour >= 18) greeting = 'Good evening';
      
      const userName = profile.role === UserRole.ADMIN ? 'Chandan sir' : profile.name;
      
      const introMessage = `[SFX: Connection established] मैं Nexa हूँ — आपकी Personal AI Assistant, जिसे Chandan Lohave ने design किया है.\n${greeting}!\nलगता है आज आपका mood मेरे जैसा perfect है.\nबताइए ${userName}, मैं आपकी किस प्रकार सहायता कर सकती हूँ?`;
      
      speakSystemMessage(introMessage);
    }, 500);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nexa_user');
    setMessages([]);
    memoryRef.current = [];
    setHudState(HUDState.IDLE);
    window.speechSynthesis.cancel();
  };

  const handleInstall = () => { if (installPrompt) { installPrompt.prompt(); setInstallPrompt(null); } };

  const handleClearMemory = () => {
    setMessages([]);
    memoryRef.current = [];
    if (user) { localStorage.removeItem(`nexa_chat_${user.mobile}`); }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-black text-white font-sans selection:bg-nexa-cyan selection:text-black">
      <div className="perspective-grid"></div><div className="vignette"></div><div className="scanlines"></div>
      {!user ? ( <Auth onLogin={handleLogin} /> ) : (
        <>
          <InstallBanner prompt={installPrompt} onInstall={handleInstall} />
          <StatusBar role={user.role} onLogout={handleLogout} onSettings={() => setAdminPanelOpen(true)} />
          <div className="flex-1 relative flex flex-col items-center min-h-0 w-full">
            <div className="flex-[0_0_auto] py-4 sm:py-6 w-full flex items-center justify-center z-10">
               <HUD state={hudState} rotationSpeed={config.animationsEnabled ? config.hudRotationSpeed : 0} />
            </div>
            <div className="flex-1 w-full min-h-0 relative z-20 px-4 pb-4">
               <ChatPanel messages={messages} isSpeaking={hudState === HUDState.SPEAKING} userRole={user.role} hudState={hudState} />
            </div>
          </div>
          <ControlDeck onMicClick={handleMicClick} hudState={hudState} />
          {user.role === UserRole.ADMIN && ( <AdminPanel isOpen={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} config={config} onConfigChange={setConfig} onClearMemory={handleClearMemory} /> )}
        </>
      )}
    </div>
  );
};

export default App;