import React, { useState, useEffect, useRef, useCallback } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import ChatPanel from './ChatPanel';
import AdminPanel from './components/AdminPanel';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig } from './types';
import { generateTextResponse, generateSpeech, generateIntroductoryMessage } from './services/geminiService';
import { playMicOnSound, playMicOffSound, playErrorSound, playStartupSound } from './services/audioService';

// --- ICONS ---
const GearIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.065 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.572c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const LogoutIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );

// New, image-accurate Arc Reactor Icon
const MicIcon = ({ rotationDuration = '8s' }: { rotationDuration?: string }) => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#ffdd44" />
          <stop offset="100%" stopColor="#ffcc00" />
        </radialGradient>
      </defs>

      {/* Rotating Outer Segments - Yellow */}
      <g style={{ transformOrigin: 'center', animation: `spin ${rotationDuration} linear infinite` }}>
        <circle 
          cx="12" 
          cy="12" 
          r="10"
          stroke="#ffcc00" // nexa-yellow
          strokeWidth="4"
          strokeDasharray="5.85 2" // Creates 8 segments with gaps
          transform="rotate(-11.25 12 12)" // Aligns segments to be symmetrical
        />
      </g>
      
      {/* Static Dark Divider Ring */}
      <circle 
        cx="12" 
        cy="12" 
        r="8" 
        stroke="rgba(0,0,0,0.7)" 
        strokeWidth="0.5" 
      />
      
      {/* Static Inner Core - Yellow with Gradient */}
      <circle 
        cx="12" 
        cy="12" 
        r="7.75" 
        fill="url(#coreGradient)" 
      />
    </svg>
);


// --- PRONUNCIATION FIX HELPER ---
const prepareTextForSpeech = (text: string): string => {
  let phoneticText = text;
  // Fix for 'Nexa' pronunciation (sounds like 'Nek-sa')
  phoneticText = phoneticText.replace(/Nexa/gi, 'Neksa');
  // Final, 100% correct fix for 'Lohave' by using Devanagari script for TTS.
  phoneticText = phoneticText.replace(/Lohave/gi, 'लोहवे');
  return phoneticText;
};

// --- HELPER & STATE COMPONENTS ---
const StatusBar = ({ role, onLogout, onSettings, latency }: any) => ( <div className="w-full h-16 shrink-0 flex justify-between items-center px-6 border-b border-nexa-cyan/10 bg-black/80 backdrop-blur-md z-40 relative"> <div className="flex items-center gap-4"><div className="flex flex-col items-start"><div className="text-[10px] text-nexa-cyan font-mono tracking-widest uppercase">System Online</div><div className="flex gap-1 mt-1"><div className="w-8 h-1 bg-nexa-cyan shadow-[0_0_5px_currentColor]"></div><div className="w-2 h-1 bg-nexa-cyan/50"></div><div className="w-1 h-1 bg-nexa-cyan/20"></div></div></div>{latency !== null && (<div className="hidden sm:block text-[9px] font-mono text-nexa-cyan/60 border-l border-nexa-cyan/20 pl-4"> API LATENCY: <span className="text-white">{latency}ms</span></div>)}</div><div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"><div className="text-xl font-bold tracking-[0.3em] text-white/90 drop-shadow-[0_0_10px_rgba(41,223,255,0.5)]">NEXA</div></div><div className="flex items-center gap-4">{role === UserRole.ADMIN && (<button onClick={onSettings} className="p-2 hover:bg-nexa-cyan/10 rounded-full transition-colors"><GearIcon /></button>)}<button onClick={onLogout} className="p-2 hover:bg-red-500/10 rounded-full transition-colors"><LogoutIcon /></button></div></div> );

// New ControlDeck with Speed Multiplier
const ControlDeck = ({ onMicClick, hudState, rotationSpeedMultiplier = 1 }: any) => {
    const isListening = hudState === HUDState.LISTENING;
    const isAngry = hudState === HUDState.ANGRY;
    const isThinking = hudState === HUDState.THINKING;
    const isIdle = hudState === HUDState.IDLE;
    const isSpeaking = hudState === HUDState.SPEAKING;

    // Base seconds for rotation
    let baseDuration = 8; // Idle: 8s
    if (isThinking) {
      baseDuration = 2; // Thinking: 2s
    } else if (isSpeaking || isListening) {
      baseDuration = 4; // Speaking/Listening: 4s
    } else if (isAngry) {
      baseDuration = 1; // Angry: 1s
    }
    
    // Apply user setting: Higher speed multiplier = Lower duration (faster spin)
    const finalDuration = `${baseDuration / rotationSpeedMultiplier}s`;
    
    const buttonScale = isListening || isAngry || isThinking ? 'scale-110' : 'hover:scale-105 active:scale-95';
    const idleAnimation = isIdle ? 'animate-breathing' : '';
  
    let iconColorClass = 'text-nexa-cyan'; // This controls the GLOW color
    let pulseClass = '';

    if (isListening || isAngry) {
      iconColorClass = 'text-nexa-red';
      pulseClass = 'animate-pulse';
    }
    if (isThinking) {
      iconColorClass = 'text-nexa-yellow';
      pulseClass = 'animate-pulse';
    }

    return (
      <div className="w-full h-24 shrink-0 bg-gradient-to-t from-black via-black/80 to-transparent z-40 relative flex items-center justify-center">
        
        {/* Horizontal Line with Gap */}
        <div className="absolute w-full top-1/2 -translate-y-1/2 h-[1px] px-4">
          <div className="w-full h-full flex justify-between items-center">
            <div className="flex-1 h-full bg-gradient-to-r from-transparent via-nexa-cyan/20 to-nexa-cyan/40"></div>
            <div className="w-24 flex-shrink-0"></div> {/* Gap for button */}
            <div className="flex-1 h-full bg-gradient-to-l from-transparent via-nexa-cyan/20 to-nexa-cyan/40"></div>
          </div>
        </div>

        <button 
          onClick={onMicClick} 
          className={`relative w-20 h-20 flex items-center justify-center rounded-full transition-all duration-300 group ${buttonScale} ${idleAnimation}`}
        >
          <div className={`absolute inset-0 rounded-full bg-black`}></div>
          <div className={`relative z-10 transition-colors duration-300 ${iconColorClass} ${pulseClass} shadow-[0_0_20px_currentColor] group-hover:shadow-[0_0_30px_currentColor]`}>
            <div className="scale-[1.4]"> {/* Scale icon to be larger within the button */}
              <MicIcon rotationDuration={finalDuration} />
            </div>
          </div>
        </button>
      </div>
    );
  };
const pcmToAudioBuffer = (pcmData: ArrayBuffer, context: AudioContext): AudioBuffer => { const int16Array = new Int16Array(pcmData); const float32Array = new Float32Array(int16Array.length); for (let i = 0; i < int16Array.length; i++) { float32Array[i] = int16Array[i] / 32768; } const buffer = context.createBuffer(1, float32Array.length, 24000); buffer.getChannelData(0).set(float32Array); return buffer; };

type SystemStatus = 'unauthenticated' | 'initializing' | 'ready' | 'error';
type ConfirmationModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmationWord?: string;
};

const ConfirmationModal: React.FC<ConfirmationModalProps & { onClose: () => void }> = ({ isOpen, title, message, onConfirm, onClose, confirmationWord }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue(''); // Reset input when modal opens
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = confirmationWord ? inputValue !== confirmationWord : false;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-black border-2 border-red-500/50 p-6 shadow-[0_0_30px_rgba(255,42,42,0.4)]">
        <h2 className="text-red-500 text-lg font-bold tracking-widest font-mono">{title}</h2>
        <p className="text-zinc-300 mt-4 font-sans leading-relaxed">{message}</p>
        
        {confirmationWord && (
          <div className="mt-6">
            <p className="text-xs text-center text-zinc-400 font-mono mb-2">To confirm, type "{confirmationWord}" below.</p>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              className="w-full bg-red-900/20 border border-red-500/50 text-white text-center font-mono tracking-[0.3em] py-2 focus:outline-none focus:border-red-500 transition-colors uppercase"
              placeholder={confirmationWord}
            />
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <button 
            onClick={onClose}
            className="flex-1 py-3 border border-zinc-700 text-zinc-400 font-mono text-xs tracking-widest hover:bg-zinc-900 hover:text-white transition-colors"
          >
            CANCEL
          </button>
          <button 
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`flex-1 py-3 bg-red-600 text-white font-bold font-mono text-xs tracking-widest hover:bg-red-500 transition-all ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : 'shadow-[0_0_15px_rgba(220,38,38,0.5)]'}`}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hudState, setHudState] = useState<HUDState>(HUDState.IDLE);
  const [config, setConfig] = useState<AppConfig>({ animationsEnabled: true, hudRotationSpeed: 1, micRotationSpeed: 1 });
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, confirmationWord?: string}>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });
  const [latency, setLatency] = useState<number | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chatHistoryRef = useRef<{role: string, parts: {text: string}[]}[]>([]);

  // Init Audio Context for playback
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    window.addEventListener('click', initAudioContext, { once: true });
    
    // Check local storage for persistent login
    const savedUser = localStorage.getItem('nexa_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    // Load config
    const savedConfig = localStorage.getItem('nexa_config');
    if (savedConfig) {
        // Ensure merged defaults for new keys like micRotationSpeed
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
    }
    
    // Admin Notifications Init
    if (!localStorage.getItem('nexa_admin_notifications')) {
        localStorage.setItem('nexa_admin_notifications', '[]');
    }

    return () => {
      window.removeEventListener('click', initAudioContext);
    };
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      // CRITICAL: Force 'en-IN' to prefer Roman characters (Hinglish) over Devanagari script
      recognitionRef.current.lang = 'en-IN'; 

      recognitionRef.current.onstart = () => {
        playMicOnSound();
        setHudState(HUDState.LISTENING);
      };

      recognitionRef.current.onend = () => {
        // Only go back to IDLE if we aren't about to process (THINKING)
        // Wait a tick to check state, though standard flow handles this in onresult
      };

      recognitionRef.current.onError = (event: any) => {
        console.error("Speech Error", event);
        setHudState(HUDState.IDLE);
        playErrorSound();
      };

      recognitionRef.current.onresult = async (event: any) => {
        playMicOffSound();
        let transcript = event.results[0][0].transcript;
        
        if (transcript.trim()) {
           // --- HINGLISH & NEXA CORRECTION LAYER ---
           // 1. Fix common "Nexa" mishearings
           transcript = transcript.replace(/naksha|naks|next a|neck sa|naxa/gi, 'Nexa');
           // 2. Just in case 'en-IN' failed and returned Hindi script 'नक्शा'
           transcript = transcript.replace(/नक्शा/g, 'Nexa');
           
           await processInput(transcript);
        } else {
           setHudState(HUDState.IDLE);
        }
      };
    }
  }, [user]); // Re-init if user changes (though usually not needed, keeping dependency clean)

  // Welcome Message
  useEffect(() => {
    if (user && messages.length === 0) {
      const init = async () => {
        setHudState(HUDState.THINKING);
        const introText = await generateIntroductoryMessage(user);
        
        // --- SYNC FIX: Pre-fetch audio BEFORE showing text/changing state ---
        let audioBuffer: AudioBuffer | null = null;
        try {
            const phoneticText = prepareTextForSpeech(introText);
            const audioData = await generateSpeech(phoneticText, user.role, false);
            if (audioData && audioContextRef.current) {
                audioBuffer = pcmToAudioBuffer(audioData, audioContextRef.current);
            }
        } catch (e) {
            console.error("Intro Audio Fetch Error", e);
        }

        // Now update UI and Play simultaneously
        const introMsg: ChatMessage = { role: 'model', text: introText, timestamp: Date.now() };
        setMessages([introMsg]);
        setHudState(HUDState.SPEAKING); // Start speaking animation
        
        if (audioBuffer) {
             await playAudioBuffer(audioBuffer);
        }
        
        setHudState(HUDState.IDLE);
      };
      init();
    }
  }, [user]);

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('nexa_user', JSON.stringify(profile));
  };

  const handleLogout = () => {
    setUser(null);
    setMessages([]);
    localStorage.removeItem('nexa_user');
    setHudState(HUDState.IDLE);
  };

  const handleMicClick = () => {
    if (hudState === HUDState.LISTENING) {
      recognitionRef.current?.stop();
    } else if (hudState === HUDState.IDLE || hudState === HUDState.SPEAKING) {
      // Stop any current audio
      if (audioContextRef.current) {
        audioContextRef.current.close().then(() => {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        });
      }
      try {
          recognitionRef.current?.start();
      } catch (e) {
          console.error("Mic Start Error", e);
          // Sometimes start() throws if already started
      }
    }
  };

  const processInput = async (text: string) => {
    if (!user) return;
    
    // Add User Message
    const userMsg: ChatMessage = { role: 'user', text: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setHudState(HUDState.THINKING);

    const startTime = Date.now();

    try {
      // 1. Generate Text Response
      const responseText = await generateTextResponse(text, user, chatHistoryRef.current);
      const endTime = Date.now();
      setLatency(endTime - startTime);
      
      // Update Chat History (limit context to last 10 turns)
      chatHistoryRef.current.push({ role: 'user', parts: [{ text: text }] });
      chatHistoryRef.current.push({ role: 'model', parts: [{ text: responseText }] });
      if (chatHistoryRef.current.length > 20) chatHistoryRef.current = chatHistoryRef.current.slice(-20);

      // 2. Check for Angry State
      const isAngry = responseText.includes("[[STATE:ANGRY]]") || responseText.includes("(sharp tone)") || responseText.includes("Hmph");
      const cleanText = responseText.replace("[[STATE:ANGRY]]", "").trim();
      
      // --- SYNC FIX: Generate Audio BEFORE showing text/changing state ---
      let audioBuffer: AudioBuffer | null = null;
      try {
          const phoneticText = prepareTextForSpeech(cleanText);
          const audioData = await generateSpeech(phoneticText, user.role, isAngry);
          if (audioData && audioContextRef.current) {
              audioBuffer = pcmToAudioBuffer(audioData, audioContextRef.current);
          }
      } catch (e) {
          console.error("Response Audio Fetch Error", e);
      }

      // 3. Add Model Message (Now that audio is ready)
      const modelMsg: ChatMessage = { role: 'model', text: cleanText, timestamp: Date.now(), isAngry };
      setMessages(prev => [...prev, modelMsg]);

      // 4. Play Audio
      setHudState(isAngry ? HUDState.ANGRY : HUDState.SPEAKING);
      
      if (audioBuffer) {
           await playAudioBuffer(audioBuffer);
      }
      
      // Reset State
      setHudState(HUDState.IDLE);

    } catch (error: any) {
      console.error("Processing Error", error);
      setIsAudioLoading(false);
      setHudState(HUDState.IDLE);
      playErrorSound();
      
      let errorText = "I encountered an internal error.";
      
      // DEPLOYMENT FRIENDLY ERROR HANDLING
      if (error.message && (error.message.includes('API_KEY') || error.message.includes('400') || error.message.includes('403'))) {
         errorText = "SYSTEM ALERT: API Access Key invalid or missing. Please check your deployment environment variables.";
      }

      setMessages(prev => [...prev, { role: 'model', text: errorText, timestamp: Date.now(), isAngry: true }]);
    }
  };

  const playAudioBuffer = async (buffer: AudioBuffer) => {
    if (!audioContextRef.current) return;
    try {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
        return new Promise<void>((resolve) => {
            source.onended = () => resolve();
        });
    } catch (e) {
        console.error("Buffer Playback Error", e);
    }
  };

  // --- RENDER ---
  
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="relative w-full h-screen bg-black flex flex-col overflow-hidden font-sans select-none">
      
      {/* --- GLOBAL EFFECTS --- */}
      <div className="perspective-grid"></div>
      <div className="vignette"></div>
      <div className="scanlines"></div>

      {/* --- LAYOUT --- */}
      <StatusBar 
         role={user.role} 
         onLogout={handleLogout} 
         onSettings={() => setIsAdminPanelOpen(true)}
         latency={latency}
      />

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        
        {/* UPPER SECTION: HUD */}
        <div className="flex-[0.45] flex items-center justify-center min-h-[250px] relative">
           <HUD state={hudState} rotationSpeed={config.hudRotationSpeed} />
        </div>

        {/* MIDDLE SECTION: CHAT */}
        <div className="flex-[0.55] flex justify-center w-full px-4 pb-4 overflow-hidden">
           <ChatPanel 
             messages={messages} 
             userRole={user.role} 
             hudState={hudState}
             isAudioLoading={isAudioLoading}
             onTypingComplete={() => {}}
           />
        </div>

      </div>
      
      {/* BOTTOM SECTION: CONTROLS */}
      <ControlDeck 
        onMicClick={handleMicClick} 
        hudState={hudState} 
        rotationSpeedMultiplier={config.micRotationSpeed || 1} 
      />

      {/* --- MODALS --- */}
      <AdminPanel 
        isOpen={isAdminPanelOpen} 
        onClose={() => setIsAdminPanelOpen(false)}
        config={config}
        onConfigChange={(newConfig) => {
            setConfig(newConfig);
            localStorage.setItem('nexa_config', JSON.stringify(newConfig));
        }}
        onClearMemory={() => {
            setConfirmModal({
                isOpen: true,
                title: 'PURGE MEMORY BANKS?',
                message: 'This will irreversibly delete all learned user patterns and conversation history. System will reboot.',
                confirmationWord: 'DELETE',
                onConfirm: () => {
                    localStorage.clear();
                    window.location.reload();
                }
            });
        }}
        onManageAccounts={() => {
             // Placeholder for account management
        }}
      />
      
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal({...confirmModal, isOpen: false});
        }}
        onClose={() => setConfirmModal({...confirmModal, isOpen: false})}
        confirmationWord={confirmModal.confirmationWord}
      />

    </div>
  );
};

export default App;