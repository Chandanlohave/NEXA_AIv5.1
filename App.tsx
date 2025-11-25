
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
    {/* Futuristic Frequency Mic */}
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
    
    // Create Master Gain
    this.mainGain = this.ctx.createGain();
    this.mainGain.gain.value = 0.0; // Start silent
    this.mainGain.connect(this.ctx.destination);

    // Osc 1: The Deep Hum (Sawtooth 60Hz + Lowpass)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 60; 
    
    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.value = 150;
    
    osc1.connect(filter1);
    filter1.connect(this.mainGain);
    
    // Osc 2: Sub-bass Sine (40Hz) for atmosphere
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 40;
    
    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 100;

    osc2.connect(filter2);
    filter2.connect(this.mainGain);

    // LFO: Gently modulate filter for "breathing" feel
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15; // Slow cycle (approx 6.6s)

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 40; // Modulate frequency

    lfo.connect(lfoGain);
    lfoGain.connect(filter1.frequency);

    // Start everything
    osc1.start();
    osc2.start();
    lfo.start();

    this.oscillators.push(osc1, osc2, lfo);

    // Fade In (3% volume - very subtle)
    const now = this.ctx.currentTime;
    this.mainGain.gain.linearRampToValueAtTime(0.03, now + 4); 
  }

  stop() {
    if (!this.ctx || !this.mainGain) return;
    
    try {
      const now = this.ctx.currentTime;
      this.mainGain.gain.cancelScheduledValues(now);
      this.mainGain.gain.setValueAtTime(this.mainGain.gain.value, now);
      this.mainGain.gain.linearRampToValueAtTime(0, now + 1.5); // Fade out over 1.5s
      
      setTimeout(() => {
        this.oscillators.forEach(o => {
          try { o.stop(); o.disconnect(); } catch (e) {}
        });
        this.mainGain?.disconnect();
        if (this.ctx && this.ctx.state !== 'closed') {
          this.ctx.close();
        }
        this.ctx = null;
        this.mainGain = null;
        this.oscillators = [];
      }, 1600);
    } catch(e) {
      console.warn("Ambient stop error", e);
    }
  }
}

// --- COMPONENTS ---

const InstallBanner: React.FC<{ prompt: any, onInstall: () => void }> = ({ prompt, onInstall }) => {
  if (!prompt) return null;
  return (
    <div className="w-full bg-nexa-cyan/10 border-b border-nexa-cyan/30 backdrop-blur-md py-3 px-4 flex items-center justify-between animate-slide-down z-50 fixed top-0 left-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-nexa-cyan/20 rounded flex items-center justify-center border border-nexa-cyan/50">
           <svg className="w-5 h-5 text-nexa-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
           </svg>
        </div>
        <div>
          <div className="text-nexa-cyan text-[10px] font-mono tracking-widest uppercase">System Upgrade</div>
          <div className="text-white text-xs font-mono opacity-80">Install Native Protocol</div>
        </div>
      </div>
      <button 
        onClick={onInstall}
        className="bg-nexa-cyan hover:bg-white text-black text-[10px] font-bold font-mono py-2 px-3 rounded shadow-[0_0_10px_rgba(41,223,255,0.4)] transition-all uppercase"
      >
        Install
      </button>
    </div>
  );
};

const StatusBar = ({ role, onLogout, onSettings }: any) => (
  <div className="w-full h-16 shrink-0 flex justify-between items-center px-6 border-b border-nexa-cyan/10 bg-black/80 backdrop-blur-md z-40 relative">
    <div className="flex items-center gap-4">
       <div className="flex flex-col items-start">
         <div className="text-[10px] text-nexa-cyan font-mono tracking-widest uppercase">System Online</div>
         <div className="flex gap-1 mt-1">
            <div className="w-8 h-1 bg-nexa-cyan shadow-[0_0_5px_currentColor]"></div>
            <div className="w-2 h-1 bg-nexa-cyan/50"></div>
            <div className="w-1 h-1 bg-nexa-cyan/20"></div>
         </div>
       </div>
    </div>
    
    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
       <div className="text-xl font-bold tracking-[0.3em] text-white/90 drop-shadow-[0_0_10px_rgba(41,223,255,0.5)]">NEXA</div>
    </div>

    <div className="flex items-center gap-4">
       {role === UserRole.ADMIN && (
          <button onClick={onSettings} className="p-2 hover:bg-nexa-cyan/10 rounded-full transition-colors"><GearIcon /></button>
       )}
       <button onClick={onLogout} className="p-2 hover:bg-red-500/10 rounded-full transition-colors"><LogoutIcon /></button>
    </div>
  </div>
);

const QuickActions = ({ onAction }: { onAction: (query: string) => void }) => {
  const actions = [
    { label: 'Weather', query: 'What is the current weather?', icon: '☁️' },
    { label: 'News', query: 'Latest news headlines', icon: '📰' },
    { label: 'Music', query: 'Play trending music', icon: '🎵' },
    { label: 'Status', query: 'System status report', icon: '🔋' },
  ];

  return (
    <div className="w-full px-4 pb-4 z-30 overflow-x-auto no-scrollbar flex gap-3 justify-center">
       {actions.map((action) => (
         <button
           key={action.label}
           onClick={() => onAction(action.query)}
           className="flex items-center gap-2 px-4 py-2 bg-nexa-cyan/5 border border-nexa-cyan/20 rounded-full backdrop-blur-sm hover:bg-nexa-cyan/10 hover:border-nexa-cyan/50 transition-all active:scale-95 group whitespace-nowrap"
         >
           <span className="text-sm grayscale group-hover:grayscale-0 transition-all">{action.icon}</span>
           <span className="text-nexa-cyan/70 font-mono text-[10px] tracking-widest uppercase group-hover:text-nexa-cyan">{action.label}</span>
         </button>
       ))}
    </div>
  );
};

const ControlDeck = ({ onMicClick, hudState }: any) => {
    return (
        <div className="w-full h-24 shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent z-40 relative flex items-center justify-center pb-6">
           <div className="absolute bottom-0 w-full h-[1px] bg-nexa-cyan/30"></div>
           
           {/* Decorative lines */}
           <div className="absolute left-10 bottom-10 w-24 h-[1px] bg-nexa-cyan/20 rotate-[-15deg] hidden sm:block"></div>
           <div className="absolute right-10 bottom-10 w-24 h-[1px] bg-nexa-cyan/20 rotate-[15deg] hidden sm:block"></div>

           {/* Hex Mic Button */}
           <button 
             onClick={onMicClick}
             className={`
               relative w-20 h-20 flex items-center justify-center transition-all duration-300 group
               ${hudState === HUDState.LISTENING ? 'scale-110' : 'hover:scale-105 active:scale-95'}
             `}
           >
             {/* Hexagon Backgrounds */}
             <div className={`absolute inset-0 bg-black border ${hudState === HUDState.LISTENING ? 'border-nexa-red shadow-[0_0_30px_rgba(255,42,42,0.6)]' : 'border-nexa-cyan shadow-[0_0_20px_rgba(41,223,255,0.4)]'} transition-all duration-300`} style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
             
             {/* Icon */}
             <div className={`relative z-10 ${hudState === HUDState.LISTENING ? 'text-nexa-red animate-pulse' : 'text-nexa-cyan group-hover:text-white'} transition-colors`}>
                <MicIcon />
             </div>
           </button>
        </div>
    );
}

// --- AUDIO UTILS ---

const pcmToAudioBuffer = (pcmData: ArrayBuffer, context: AudioContext): AudioBuffer => {
  const int16Array = new Int16Array(pcmData);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768;
  }
  const buffer = context.createBuffer(1, float32Array.length, 24000); 
  buffer.getChannelData(0).set(float32Array);
  return buffer;
};

// --- MAIN APP ---

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hudState, setHudState] = useState<HUDState>(HUDState.IDLE);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [config, setConfig] = useState<AppConfig>({
    introText: "Welcome back, system online.",
    animationsEnabled: true,
    hudRotationSpeed: 1,
  });

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientRef = useRef(new AmbientGenerator());
  const isProcessingRef = useRef(false);

  // Load User Session & Memory
  useEffect(() => {
    const savedUser = localStorage.getItem('nexa_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      loadMemory(parsedUser.mobile);
    }

    // PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  // Manage Ambient Sound
  useEffect(() => {
    if (user) {
      setTimeout(() => ambientRef.current.start(), 100);
    } else {
      ambientRef.current.stop();
    }
    return () => ambientRef.current.stop();
  }, [user]);

  // --- AUTO REMINDERS ---
  useEffect(() => {
    if (!user || user.role !== UserRole.ADMIN) return;

    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const min = now.getMinutes();

      // 11 PM Reminder
      if (hour === 23 && min === 0) {
        speakSystemMessage("Sir… 11 baj chuke hain. Kal aapko Encave Cafe duty bhi karni hai. Please rest kar lijiye… main yahin hoon.");
      }
      
      // Morning Duty Reminder (8 AM)
      if (hour === 8 && min === 0) {
        speakSystemMessage("Sir… aaj Encave Café duty hai, time se tayar ho jaiye.");
      }
    };

    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN'; // Default to Hinglish/Indian English

      recognitionRef.current.onstart = () => {
        setHudState(HUDState.LISTENING);
      };

      recognitionRef.current.onend = () => {
        if (hudState === HUDState.LISTENING) {
          setHudState(HUDState.IDLE);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech Error", event.error);
        if (event.error === 'aborted' || event.error === 'no-speech') {
           return; 
        }
        setHudState(HUDState.IDLE);
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        processQuery(transcript);
      };
    }
  }, [user, messages]);

  const loadMemory = (mobile: string) => {
    const history = localStorage.getItem(`nexa_chat_${mobile}`);
    if (history) {
      setMessages(JSON.parse(history));
    }
  };

  const saveMemory = (msgs: ChatMessage[]) => {
    if (user) {
      localStorage.setItem(`nexa_chat_${user.mobile}`, JSON.stringify(msgs));
    }
  };

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const handleMicClick = () => {
    getAudioContext(); // Wake up audio context
    
    // INTERRUPT LOGIC
    if (hudState === HUDState.THINKING || hudState === HUDState.SPEAKING) {
        // Stop Audio / Processing
        isProcessingRef.current = false; // Invalidate pending responses
        if (audioContextRef.current) {
            audioContextRef.current.suspend().then(() => audioContextRef.current?.resume());
        }
        setHudState(HUDState.IDLE);
        
        // Slight delay to allow state to clear before listening
        setTimeout(() => {
             try { recognitionRef.current?.start(); } catch(e) {}
        }, 100);
        return;
    }

    if (hudState === HUDState.LISTENING) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn("Recognition already started");
      }
    }
  };

  // --- INTENT HANDLER ---
  const executeIntents = (text: string) => {
     // Extract intent codes [[COMMAND:data]]
     const intentRegex = /\[\[(.*?):(.*?)\]\]/g;
     let match;
     while ((match = intentRegex.exec(text)) !== null) {
        const command = match[1].toUpperCase();
        const data = match[2];

        console.log("EXECUTING INTENT:", command, data);

        if (command === 'WHATSAPP') {
           const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(data)}`;
           window.open(url, '_blank');
        } else if (command === 'CALL') {
           window.location.href = `tel:${data}`;
        } else if (command === 'OPEN') {
           const appMap: {[key:string]: string} = {
              'YOUTUBE': 'https://www.youtube.com',
              'INSTAGRAM': 'https://www.instagram.com',
              'GOOGLE': 'https://www.google.com',
              'CHROME': 'googlechrome://',
              'SETTINGS': 'intent://settings/#Intent;scheme=android-app;end'
           };
           const url = appMap[data.toUpperCase()];
           if (url) window.open(url, '_blank');
        }
     }
  };

  const speakSystemMessage = async (displayText: string, spokenTextOverride?: string) => {
      setHudState(HUDState.THINKING);
      isProcessingRef.current = true; // Start process

      // Clean display text from intent tags
      const cleanDisplay = displayText.replace(/\[\[.*?\]\]/g, "");
      
      // 1. Generate Audio FIRST
      const textToSpeak = spokenTextOverride || cleanDisplay;
      const audioBuffer = await generateSpeech(textToSpeak);

      // Check Interrupt
      if (!isProcessingRef.current) return;

      // 2. Update Chat UI (Now synchronized with audio availability)
      const newMessages: ChatMessage[] = [...messages, { role: 'model', text: cleanDisplay, timestamp: Date.now() }];
      setMessages(newMessages);
      saveMemory(newMessages);
      
      // 3. Execute Intents (Sync with visual/audio)
      executeIntents(displayText);

      // 4. Play Audio
      if (audioBuffer) {
        playAudio(audioBuffer);
      } else {
        setHudState(HUDState.IDLE);
      }
  };

  const playAudio = (buffer: ArrayBuffer) => {
      if (!isProcessingRef.current) return;

      setHudState(HUDState.SPEAKING);
      const ctx = getAudioContext();
      const decodedBuffer = pcmToAudioBuffer(buffer, ctx);
      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setHudState(HUDState.IDLE);
        isProcessingRef.current = false;
      };
      
      source.start();
  };

  const processQuery = async (text: string) => {
    if (!user) return;
    
    setHudState(HUDState.THINKING);
    isProcessingRef.current = true;
    
    // 1. Update Chat (User)
    const newHistory: ChatMessage[] = [...messages, { role: 'user', text, timestamp: Date.now() }];
    setMessages(newHistory);
    saveMemory(newHistory);

    // 2. Get AI Response
    try {
        const rawAiResponse = await generateTextResponse(
          text, 
          user, 
          newHistory.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
        );

        // Check Interrupt
        if (!isProcessingRef.current) return;

        // 3. Generate Speech FIRST (Wait for it)
        const cleanAiResponse = rawAiResponse.replace(/\[\[.*?\]\]/g, "").trim();
        const audioBuffer = await generateSpeech(cleanAiResponse);

        // Check Interrupt
        if (!isProcessingRef.current) return;

        // 4. Update Chat (AI) - Now synced
        const finalHistory: ChatMessage[] = [...newHistory, { role: 'model', text: cleanAiResponse, timestamp: Date.now() }];
        setMessages(finalHistory);
        saveMemory(finalHistory);

        // 5. Process Intents
        executeIntents(rawAiResponse);

        // 6. Play Audio
        if (audioBuffer) {
          playAudio(audioBuffer);
        } else {
          setTimeout(() => setHudState(HUDState.IDLE), 1000);
          isProcessingRef.current = false;
        }
    } catch (e) {
        console.error("Process Query Error", e);
        setHudState(HUDState.IDLE);
        isProcessingRef.current = false;
    }
  };

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('nexa_user', JSON.stringify(profile));
    loadMemory(profile.mobile);
    
    // Greeting
    setTimeout(() => {
       const hour = new Date().getHours();
       let timeGreeting = "Morning";
       if (hour >= 12 && hour < 17) timeGreeting = "Afternoon";
       if (hour >= 17) timeGreeting = "Evening";

       const addressName = profile.role === UserRole.ADMIN ? "Chandan sir" : profile.name;
       const displayText = `मैं Nexa हूँ — आपकी Personal AI Assistant, जिसे Chandan Lohave ने design किया है.\nGood ${timeGreeting}!\nलगता है आज आपका mood मेरे जैसा perfect है.\nबताइए ${addressName}, मैं आपकी किस प्रकार सहायता कर सकती हूँ?`;
       const spokenText = displayText.replace("Lohave", "लोहवे");

       speakSystemMessage(displayText, spokenText);
    }, 500);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nexa_user');
    setMessages([]);
    setHudState(HUDState.IDLE);
  };

  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      setInstallPrompt(null);
    }
  };

  const handleClearMemory = () => {
    setMessages([]);
    if (user) {
       localStorage.removeItem(`nexa_chat_${user.mobile}`);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-black text-white font-sans selection:bg-nexa-cyan selection:text-black">
      
      {/* GLOBAL BACKGROUND LAYERS */}
      <div className="perspective-grid"></div>
      <div className="vignette"></div>
      <div className="scanlines"></div>

      {!user ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <>
          <InstallBanner prompt={installPrompt} onInstall={handleInstall} />
          
          <StatusBar 
            role={user.role} 
            onLogout={handleLogout} 
            onSettings={() => setAdminPanelOpen(true)} 
          />

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 relative flex flex-col items-center min-h-0 w-full">
            
            {/* 1. HUD Area - Flexible height */}
            <div className="flex-[0_0_auto] py-4 sm:py-6 w-full flex items-center justify-center z-10">
               <HUD state={hudState} rotationSpeed={config.hudRotationSpeed} />
            </div>

            {/* 2. Chat Area - Takes remaining space, scrolls */}
            <div className="flex-1 w-full min-h-0 relative z-20 px-4 pb-4">
               <ChatPanel 
                 messages={messages} 
                 isSpeaking={hudState === HUDState.SPEAKING} 
                 userRole={user.role}
                 hudState={hudState}
               />
            </div>

          </div>
          
          {/* QUICK ACTIONS */}
          <QuickActions onAction={processQuery} />

          {/* CONTROL DECK (Fixed Bottom) */}
          <ControlDeck onMicClick={handleMicClick} hudState={hudState} />

          {/* ADMIN PANEL */}
          {user.role === UserRole.ADMIN && (
            <AdminPanel 
              isOpen={adminPanelOpen} 
              onClose={() => setAdminPanelOpen(false)} 
              config={config}
              onConfigChange={setConfig}
              onClearMemory={handleClearMemory}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
