import React, { useState, useEffect, useCallback, useRef } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import UserSettingsPanel from './components/UserSettingsPanel';
import StudyHubPanel from './components/StudyHubPanel';
import InstallPWAButton from './components/InstallPWAButton';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig } from './types';
import { generateTextResponse, generateIntroductoryMessage, generateAdminBriefing } from './services/geminiService';
import { playMicOnSound, playErrorSound, playSystemNotificationSound } from './services/audioService';
import { appendMessageToMemory, clearAllMemory, getLocalMessages, getAdminNotifications, clearAdminNotifications } from './services/memoryService';
import { speak as speakTextTTS, stop as stopTextTTS, speakIntro as speakIntroTTS } from './services/ttsService';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  interface SpeechRecognitionEvent extends Event {
    results: any;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }
}

// --- ICONS ---
const GearIcon = () => ( <svg className="w-5 h-5 text-nexa-red/80 dark:hover:text-white hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.065 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.572c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const LogoutIcon = () => ( <svg className="w-5 h-5 text-nexa-red/80 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const StudyIcon = () => ( <svg className="w-5 h-5 text-nexa-blue/80 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> );

const MicIcon = ({ rotationDuration = '8s' }: { rotationDuration?: string }) => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="coreGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"><stop offset="0%" stopColor="#ffdd44" /><stop offset="100%" stopColor="#ffcc00" /></radialGradient></defs>
      <g style={{ transformOrigin: 'center', animation: `spin ${rotationDuration} linear infinite` }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="5.85 2" transform="rotate(-11.25 12 12)" /></g>
      <circle cx="12" cy="12" r="8" stroke="rgba(0,0,0,0.7)" strokeWidth="0.5" />
      <circle cx="12" cy="12" r="7.75" fill="url(#coreGradient)" />
    </svg>
);

const StatusBar = ({ userName, onLogout, onSettings, latency, onStudyHub }: any) => (
    <div className="w-full h-16 shrink-0 flex justify-between items-center px-6 border-b border-zinc-200 dark:border-nexa-cyan/10 bg-white/80 dark:bg-black/80 backdrop-blur-md z-40 relative">
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-start">
                <div className="text-[10px] text-nexa-cyan font-mono tracking-widest uppercase">{userName}</div>
                <div className="flex gap-1 mt-1"><div className="w-8 h-1 bg-nexa-cyan shadow-[0_0_5px_currentColor]"></div><div className="w-2 h-1 bg-nexa-cyan/50"></div><div className="w-1 h-1 bg-nexa-cyan/20"></div></div>
            </div>
            {latency !== null && (<div className="hidden sm:block text-[9px] font-mono text-zinc-500 dark:text-nexa-cyan/60 border-l border-zinc-200 dark:border-nexa-cyan/20 pl-4">LATENCY: <span className="text-zinc-800 dark:text-white">{latency}ms</span></div>)}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"><div className="text-xl font-bold tracking-[0.3em] text-zinc-900 dark:text-white/90 drop-shadow-[0_0_10px_rgba(41,223,255,0.5)]">NEXA</div></div>
        <div className="flex items-center gap-4">
            <button onClick={onStudyHub} className="p-2 hover:bg-zinc-200 dark:hover:bg-nexa-blue/20 rounded-full transition-colors group relative">
                <StudyIcon />
                <span className="absolute -bottom-8 right-0 text-[9px] font-mono bg-nexa-blue text-black px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">STUDY HUB</span>
            </button>
            <button onClick={onSettings} className="p-2 hover:bg-zinc-200 dark:hover:bg-nexa-cyan/10 rounded-full transition-colors"><GearIcon /></button>
            <button onClick={onLogout} className="p-2 hover:bg-red-500/10 rounded-full transition-colors"><LogoutIcon /></button>
        </div>
    </div>
);

const ControlDeck = ({ onMicClick, hudState, rotationSpeedMultiplier = 1, onToggleKeyboard, isKeyboardOpen }: any) => {
    const isListening = hudState === HUDState.LISTENING;
    const isWarning = hudState === HUDState.WARNING;
    const isProtect = hudState === HUDState.PROTECT;
    const isThinking = hudState === HUDState.THINKING;
    const isIdle = hudState === HUDState.IDLE;
    const isSpeaking = hudState === HUDState.SPEAKING;
    const isStudyHub = hudState === HUDState.STUDY_HUB;
    const isLateNight = hudState === HUDState.LATE_NIGHT;

    let baseDuration = 8;
    if (isThinking) baseDuration = 2;
    else if (isSpeaking || isListening) baseDuration = 4;
    else if (isWarning || isProtect) baseDuration = 0.5;
    else if (isStudyHub) baseDuration = 6;
    else if (isLateNight) baseDuration = 12; // Very slow for late night mode

    const finalDuration = `${baseDuration / rotationSpeedMultiplier}s`;
    
    const buttonScale = (isListening || isWarning || isProtect || isThinking || isLateNight) ? 'scale-110' : 'hover:scale-105 active:scale-95';
    
    let iconColorClass = 'text-nexa-cyan';
    if (isListening || isWarning || isProtect) iconColorClass = 'text-nexa-red';
    else if (isThinking) iconColorClass = 'text-nexa-yellow';
    else if (isStudyHub) iconColorClass = 'text-nexa-blue';
    else if (isLateNight) iconColorClass = 'text-purple-400';
    
    const pulseClass = (isListening || isWarning || isProtect || isThinking || isStudyHub || isLateNight) ? 'animate-pulse' : '';

    return (
        <div className="w-full h-24 shrink-0 bg-gradient-to-t from-zinc-100 via-zinc-100/80 to-transparent dark:from-black dark:via-black/80 dark:to-transparent z-40 relative flex items-center justify-center">
            {/* Supply Lines & Diamond Trigger */}
            <div className="absolute w-full top-1/2 -translate-y-1/2 h-[1px] px-4 pointer-events-none">
                <div className="w-full h-full flex justify-between items-center relative">
                    <div className="flex-1 h-full bg-gradient-to-r from-transparent via-zinc-300/50 to-zinc-400/70 dark:via-nexa-cyan/20 dark:to-nexa-cyan/40"></div>
                    
                    <div className="w-24 flex-shrink-0"></div>

                    <div className="flex-1 h-full bg-gradient-to-l from-transparent via-zinc-300/50 to-zinc-400/70 dark:via-nexa-cyan/20 dark:to-nexa-cyan/40 relative">
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-auto">
                           <button 
                                onClick={onToggleKeyboard}
                                className={`w-4 h-4 rotate-45 border ${isKeyboardOpen ? 'bg-nexa-cyan border-nexa-cyan shadow-[0_0_10px_rgba(41,223,255,0.8)]' : 'bg-black border-nexa-cyan/50 hover:border-nexa-cyan hover:shadow-[0_0_8px_rgba(41,223,255,0.5)]'} transition-all duration-300`}
                            ></button>
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={onMicClick} className={`relative w-20 h-20 flex items-center justify-center rounded-full transition-all duration-300 group ${buttonScale} ${isIdle ? 'animate-breathing' : ''}`}>
                <div className="absolute inset-0 rounded-full bg-white dark:bg-black shadow-inner"></div>
                <div className={`relative z-10 transition-colors duration-300 ${iconColorClass} ${pulseClass} shadow-[0_0_20px_currentColor] group-hover:shadow-[0_0_30px_currentColor]`}><div className="scale-[1.4]"><MicIcon rotationDuration={finalDuration} /></div></div>
            </button>
        </div>
    );
};

const KeyboardInput = ({ onSend, disabled, variant = 'cyan', isVisible }: any) => {
  const [text, setText] = useState('');
  const borderColor = variant === 'red' ? 'border-red-500/30 focus:border-red-500' : 'border-nexa-cyan/30 focus:border-nexa-cyan';
  const textColor = variant === 'red' ? 'text-red-500 placeholder-red-500/30' : 'text-nexa-cyan placeholder-nexa-cyan/30';
  const btnColor = variant === 'red' ? 'text-red-500' : 'text-nexa-cyan';
  const bgFocus = variant === 'red' ? 'group-focus-within:shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'group-focus-within:shadow-[0_0_15px_rgba(41,223,255,0.3)]';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
  };

  if (!isVisible) return null;

  return (
    <form onSubmit={handleSubmit} className="w-full px-6 pb-2 z-50 relative shrink-0 animate-slide-up">
      <div className={`relative flex items-center group ${bgFocus} rounded-full transition-shadow duration-300`}>
        <div className={`absolute inset-0 bg-white/5 dark:bg-black/40 rounded-full blur-sm transition-all`}></div>
        <input 
          type="text" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? "PROCESSING..." : "COMMAND INTERFACE..."}
          disabled={disabled}
          className={`relative w-full bg-white/10 dark:bg-black/60 border ${borderColor} rounded-full px-5 py-3 pr-12 text-sm font-mono ${textColor} focus:outline-none transition-all shadow-sm backdrop-blur-md uppercase tracking-wider disabled:opacity-50`}
        />
        <button type="submit" disabled={!text.trim() || disabled} className={`absolute right-3 p-2 ${btnColor} hover:brightness-150 disabled:opacity-30 transition-all`}>
          <svg className="w-5 h-5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        </button>
      </div>
    </form>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hudState, setHudState] = useState<HUDState>(HUDState.IDLE);
  const [config, setConfig] = useState<AppConfig>({ animationsEnabled: true, hudRotationSpeed: 1, micRotationSpeed: 1, theme: 'system' });
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isStudyHubOpen, setIsStudyHubOpen] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(true);
  const [latency, setLatency] = useState<number | null>(null);
  const [adminNameClickCount, setAdminNameClickCount] = useState(0);
  const [isProtocolXSettingVisible, setIsProtocolXSettingVisible] = useState(false);
  const [isProtocolXManuallyActive, setIsProtocolXManuallyActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [visualEffect, setVisualEffect] = useState<'none' | 'glitch' | 'alert'>('none');
  const recognitionRef = useRef<any>(null);
  const introPlayedRef = useRef<boolean>(false);

  const getIdleState = useCallback(() => {
    const hour = new Date().getHours();
    if (user && user.role === UserRole.ADMIN && (hour >= 23 || isProtocolXManuallyActive)) {
      return HUDState.LATE_NIGHT;
    }
    return HUDState.IDLE;
  }, [user, isProtocolXManuallyActive]);

  const handleLogout = useCallback(() => {
    stopTextTTS();
    setUser(null);
    localStorage.removeItem('nexa_user');
    setMessages([]);
    setIsSessionLocked(true);
    introPlayedRef.current = false; // Reset on logout
  }, []);

  const processInput = useCallback(async (text: string) => {
    if (!user || isProcessing) return;
    setIsProcessing(true);
    const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    await appendMessageToMemory(user, userMsg);
    setHudState(HUDState.THINKING);
    setVisualEffect('none');
    const startTime = Date.now();

    try {
        const rawResponse = await generateTextResponse(text, user, isProtocolXManuallyActive);
        setLatency(Date.now() - startTime);

        let finalState = getIdleState();
        let shouldLockout = false;

        if (rawResponse.includes("[[STATE:LATE_NIGHT]]")) finalState = HUDState.LATE_NIGHT;
        else if (rawResponse.includes("[[STATE:WARNING]]")) { finalState = HUDState.WARNING; playErrorSound(); } 
        else if (rawResponse.includes("[[STATE:PROTECT]]")) { finalState = HUDState.PROTECT; playSystemNotificationSound(); }
        
        if (rawResponse.includes("[[VISUAL:GLITCH]]")) setVisualEffect('glitch');
        else if (rawResponse.includes("[[VISUAL:ALERT]]")) setVisualEffect('alert');
        
        if (rawResponse.includes("[[ACTION:LOCKOUT]]")) shouldLockout = true;

        const cleanText = rawResponse
            .replace(/\(.*?\)|\*.*?\*/g, '')
            .replace(/\[\[.*?\]\]/g, '')
            .replace(/\s\s+/g, ' ')
            .trim();
        
        if (!cleanText) {
            setHudState(finalState);
            if (shouldLockout) handleLogout();
            else setTimeout(() => {
                setHudState(getIdleState());
                setVisualEffect('none');
            }, 1500);
            setIsProcessing(false);
            return;
        }
        
        const modelMsg: ChatMessage = { role: 'model', text: cleanText, timestamp: Date.now(), isAngry: finalState === HUDState.WARNING || finalState === HUDState.PROTECT };
        await appendMessageToMemory(user, modelMsg);
        
        speakTextTTS(user, cleanText, 
            () => { setMessages(prev => [...prev, modelMsg]); setHudState(HUDState.SPEAKING); },
            () => { 
                setHudState(getIdleState());
                setVisualEffect('none');
                if (shouldLockout) handleLogout();
                setIsProcessing(false);
            }
        );
    } catch (error: any) { 
        console.error("Input processing error:", error);
        setHudState(getIdleState());
        setVisualEffect('none');
        playErrorSound();
        setIsProcessing(false);
    }
  }, [user, isProcessing, getIdleState, isProtocolXManuallyActive, handleLogout]);

  useEffect(() => {
    if (hudState === HUDState.WARNING || hudState === HUDState.PROTECT) {
        document.body.classList.add('danger-mode');
    } else {
        document.body.classList.remove('danger-mode');
    }
  }, [hudState]);
  
  useEffect(() => {
    const applyTheme = (theme: AppConfig['theme']) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme(config.theme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (config.theme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [config.theme]);

  useEffect(() => {
    const savedUser = localStorage.getItem('nexa_user');
    if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setMessages(getLocalMessages(parsedUser));
    }
    const savedConfig = localStorage.getItem('nexa_config');
    if (savedConfig) setConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) }));
  }, []);
  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => {
      stopTextTTS();
      setHudState(HUDState.LISTENING);
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) {
        processInput(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      if (event.error !== 'no-speech') {
          playErrorSound();
      }
      setHudState(getIdleState());
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setHudState(prevState => prevState === HUDState.LISTENING ? getIdleState() : prevState);
    };
    
    recognitionRef.current = recognition;

  }, [getIdleState, processInput]);


  const triggerIntro = useCallback(async (currentUser: UserProfile) => {
    if (introPlayedRef.current) return;
    setIsProcessing(true);
    setHudState(HUDState.THINKING);

    if (currentUser.role === UserRole.ADMIN) {
        const notifications = await getAdminNotifications();
        if (notifications && notifications.length > 0) {
            const briefingText = await generateAdminBriefing(notifications);
            await clearAdminNotifications();
            const briefingMsg: ChatMessage = { role: 'model', text: `ADMIN BRIEFING:\n${briefingText}`, timestamp: Date.now(), isIntro: true };
            
            await new Promise<void>(resolve => {
                speakTextTTS(
                    currentUser, 
                    briefingText,
                    () => {
                        setMessages(prev => [...prev, briefingMsg]);
                        setHudState(HUDState.SPEAKING);
                    },
                    () => {
                        // Remove ephemeral briefing message after spoken
                        setMessages(prev => prev.filter(m => m !== briefingMsg));
                        resolve();
                    }
                );
            });
        }
    }

    try {
        const introText = await generateIntroductoryMessage(currentUser);
        if (!introText) throw new Error("Intro text generation failed");

        const introMsg: ChatMessage = { role: 'model', text: introText, timestamp: Date.now(), isIntro: true };
        
        // FIX: Corrected function call to match the expected 4 arguments, passing introMsg.text and removing the extra null argument.
        speakIntroTTS(
            currentUser, 
            introMsg.text,
            () => { 
                setMessages(prev => [...prev, introMsg]); 
                setHudState(HUDState.SPEAKING); 
            },
            () => { 
                setIsProcessing(false); 
                setHudState(getIdleState());
                introPlayedRef.current = true;
                setTimeout(() => {
                    setMessages(prev => prev.filter(m => !m.isIntro));
                }, 100);
            }
        );
    } catch (e) { 
        setIsProcessing(false); 
        setHudState(getIdleState()); 
    }
  }, [getIdleState]);

  const handleResumeSession = () => {
      setIsSessionLocked(false);
      if (user) setTimeout(() => triggerIntro(user), 500);
  };

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('nexa_user', JSON.stringify(profile));
    setMessages(getLocalMessages(profile));
    setIsSessionLocked(false);
    setTimeout(() => triggerIntro(profile), 500);
  };

  const handleMicClick = () => {
    if (isProcessing || !recognitionRef.current) return;

    if (isListening) {
        recognitionRef.current.stop();
    } else {
        setIsKeyboardOpen(false); // Close keyboard if open
        playMicOnSound();
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error("Could not start recognition", e);
            playErrorSound();
        }
    }
  };

  const handleAdminNameClick = () => {
    setAdminNameClickCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 5) setIsProtocolXSettingVisible(true);
        return newCount;
    });
  };

  const handleProtocolXToggle = (isActive: boolean) => {
    setIsProtocolXManuallyActive(isActive);
    if (isActive) {
        playSystemNotificationSound();
        if(user) speakTextTTS(user, "Protocol X Activated, Sir.", () => {}, () => {});
        setHudState(HUDState.LATE_NIGHT);
    } else {
        setHudState(getIdleState());
    }
  };

  if (!user || isSessionLocked) return <Auth onLogin={handleLogin} onResume={handleResumeSession} isResuming={!!user} savedUserName={user?.name} />;

  const visualEffectClass = 
    visualEffect === 'glitch' ? 'glitch-effect' : 
    visualEffect === 'alert' ? 'alert-effect' : '';

  return (
    <div className={`relative w-full h-full bg-zinc-100 dark:bg-black flex flex-col overflow-hidden transition-all duration-700 ${visualEffectClass}`}>
      <div className="perspective-grid"></div><div className="vignette"></div><div className="scanlines"></div>
      <StatusBar userName={user.name} onLogout={handleLogout} latency={latency} onSettings={() => user.role === UserRole.ADMIN ? setIsAdminPanelOpen(true) : setIsUserSettingsOpen(true)} onStudyHub={() => { setIsStudyHubOpen(true); setHudState(HUDState.STUDY_HUB); }} />
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <div className="flex-[0.45] flex items-center justify-center min-h-[250px]"><HUD state={hudState} rotationSpeed={config.hudRotationSpeed} /></div>
        <div className="flex-[0.55] flex justify-center w-full px-4 pb-4 overflow-hidden"><ChatPanel messages={messages} userName={user.name} userRole={user.role} hudState={hudState} onTypingComplete={() => {}} /></div>
      </div>
      <KeyboardInput onSend={processInput} disabled={isProcessing} variant={user.role === UserRole.ADMIN ? 'red' : 'cyan'} isVisible={isKeyboardOpen} />
      <ControlDeck 
        onMicClick={handleMicClick} 
        hudState={hudState} 
        rotationSpeedMultiplier={config.micRotationSpeed} 
        onToggleKeyboard={() => setIsKeyboardOpen(!isKeyboardOpen)}
        isKeyboardOpen={isKeyboardOpen}
      />
      {user.role === UserRole.ADMIN ? (
        <AdminPanel 
          isOpen={isAdminPanelOpen} 
          onClose={() => setIsAdminPanelOpen(false)} 
          config={config} 
          onConfigChange={(c) => { setConfig(c); localStorage.setItem('nexa_config', JSON.stringify(c)); }} 
          onClearMemory={() => { clearAllMemory(user); window.location.reload(); }} 
          onManageAccounts={() => {}} 
          onViewStudyHub={() => {setIsStudyHubOpen(true); setHudState(HUDState.STUDY_HUB);}}
          onAdminNameClick={handleAdminNameClick}
          isProtocolXSettingVisible={isProtocolXSettingVisible}
          isProtocolXManuallyActive={isProtocolXManuallyActive}
          onProtocolXToggle={handleProtocolXToggle}
        />
      ) : (
        <UserSettingsPanel isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} config={config} onConfigChange={(c) => { setConfig(c); localStorage.setItem('nexa_config', JSON.stringify(c)); }} />
      )}
      <StudyHubPanel isOpen={isStudyHubOpen} onClose={() => {setIsStudyHubOpen(false); setHudState(getIdleState()); }} user={user} onStartLesson={() => {}} />
      <InstallPWAButton />
    </div>
  );
};

export default App;