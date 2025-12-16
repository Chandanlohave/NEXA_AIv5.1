import React, { useState, useEffect, useRef, useCallback } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import UserSettingsPanel from './components/UserSettingsPanel';
import StudyHubPanel from './components/StudyHubPanel';
import ManageAccountsModal from './components/ManageAccountsModal';
import InstallPWAButton from './components/InstallPWAButton';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig, StudyHubSubject } from './types';
import { generateTextResponse, generateIntroductoryMessage, generateAdminBriefing, generateTutorLesson } from './services/geminiService';
import { playMicOnSound, playMicOffSound, playStartupSound, playErrorSound, playUserLoginSound } from './services/audioService';
import { appendMessageToMemory, clearAllMemory, getAdminNotifications, clearAdminNotifications, getLocalMessages, logAdminNotification } from './services/memoryService';
import { speak as speakTextTTS, stop as stopTextTTS, speakIntro as speakIntroTTS } from './services/ttsService';

// --- ICONS ---
const GearIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 dark:hover:text-white hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.065 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.572c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const LogoutIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
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
            {latency !== null && (<div className="hidden sm:block text-[9px] font-mono text-zinc-500 dark:text-nexa-cyan/60 border-l border-zinc-200 dark:border-nexa-cyan/20 pl-4">API LATENCY: <span className="text-zinc-800 dark:text-white">{latency}ms</span></div>)}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"><div className="text-xl font-bold tracking-[0.3em] text-zinc-900 dark:text-white/90 drop-shadow-[0_0_10px_rgba(41,223,255,0.5)]">NEXA</div></div>
        <div className="flex items-center gap-4">
            <button onClick={onStudyHub} className="p-2 hover:bg-zinc-200 dark:hover:bg-nexa-blue/20 rounded-full transition-colors group relative">
                <StudyIcon />
                <span className="absolute -bottom-8 right-0 text-[9px] font-mono bg-nexa-blue text-black px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">STUDY BUDDY</span>
            </button>
            <button onClick={onSettings} className="p-2 hover:bg-zinc-200 dark:hover:bg-nexa-cyan/10 rounded-full transition-colors"><GearIcon /></button>
            <button onClick={onLogout} className="p-2 hover:bg-red-500/10 rounded-full transition-colors"><LogoutIcon /></button>
        </div>
    </div>
);

const ControlDeck = ({ onMicClick, hudState, rotationSpeedMultiplier = 1 }: any) => {
    const isListening = hudState === HUDState.LISTENING, isWarning = hudState === HUDState.WARNING, isThinking = hudState === HUDState.THINKING, isIdle = hudState === HUDState.IDLE, isSpeaking = hudState === HUDState.SPEAKING, isStudyHub = hudState === HUDState.STUDY_HUB;
    let baseDuration = isThinking ? 2 : (isSpeaking || isListening) ? 4 : isWarning ? 1 : isStudyHub ? 6 : 8;
    const finalDuration = `${baseDuration / rotationSpeedMultiplier}s`;
    const buttonScale = isListening || isWarning || isThinking ? 'scale-110' : 'hover:scale-105 active:scale-95';
    let iconColorClass = (isListening || isWarning) ? 'text-nexa-red' : isThinking ? 'text-nexa-yellow' : isStudyHub ? 'text-nexa-blue' : 'text-nexa-cyan';
    let pulseClass = (isListening || isWarning || isThinking || isStudyHub) ? 'animate-pulse' : '';
    return (
        <div className="w-full h-24 shrink-0 bg-gradient-to-t from-zinc-100 via-zinc-100/80 to-transparent dark:from-black dark:via-black/80 dark:to-transparent z-40 relative flex items-center justify-center">
            <div className="absolute w-full top-1/2 -translate-y-1/2 h-[1px] px-4"><div className="w-full h-full flex justify-between items-center"><div className="flex-1 h-full bg-gradient-to-r from-transparent via-zinc-300/50 to-zinc-400/70 dark:via-nexa-cyan/20 dark:to-nexa-cyan/40"></div><div className="w-24 flex-shrink-0"></div><div className="flex-1 h-full bg-gradient-to-l from-transparent via-zinc-300/50 to-zinc-400/70 dark:via-nexa-cyan/20 dark:to-nexa-cyan/40"></div></div></div>
            <button onClick={onMicClick} className={`relative w-20 h-20 flex items-center justify-center rounded-full transition-all duration-300 group ${buttonScale} ${isIdle ? 'animate-breathing' : ''}`}>
                <div className="absolute inset-0 rounded-full bg-white dark:bg-black shadow-inner"></div>
                <div className={`relative z-10 transition-colors duration-300 ${iconColorClass} ${pulseClass} shadow-[0_0_20px_currentColor] group-hover:shadow-[0_0_30px_currentColor]`}><div className="scale-[1.4]"><MicIcon rotationDuration={finalDuration} /></div></div>
            </button>
        </div>
    );
};

const KeyboardInput = ({ onSend, disabled, variant = 'cyan' }: any) => {
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

  return (
    <form onSubmit={handleSubmit} className="w-full px-6 pb-2 z-50 relative shrink-0 animate-slide-up">
      <div className={`relative flex items-center group ${bgFocus} rounded-full transition-shadow duration-300`}>
        <div className={`absolute inset-0 bg-white/5 dark:bg-black/40 rounded-full blur-sm transition-all`}></div>
        <input 
          type="text" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ENTER COMMAND_PROTOCOL..."
          disabled={disabled}
          className={`relative w-full bg-white/10 dark:bg-black/60 border ${borderColor} rounded-full px-5 py-3 pr-12 text-sm font-mono ${textColor} focus:outline-none transition-all shadow-sm backdrop-blur-md uppercase tracking-wider`}
        />
        <button 
          type="submit" 
          disabled={!text.trim() || disabled}
          className={`absolute right-3 p-2 ${btnColor} hover:brightness-150 disabled:opacity-30 transition-all`}
        >
          <svg className="w-5 h-5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        </button>
      </div>
    </form>
  );
};

const ConfirmationModal: React.FC<{isOpen: boolean, title: string, message: string, onConfirm: () => void, onClose: () => void, confirmationWord?: string, confirmLabel?: string, cancelLabel?: string, variant?: 'red' | 'cyan'}> = ({ isOpen, title, message, onConfirm, onClose, confirmationWord, confirmLabel = 'CONFIRM', cancelLabel = 'CANCEL', variant = 'red' }) => {
  const [inputValue, setInputValue] = useState('');
  useEffect(() => { if (isOpen) setInputValue(''); }, [isOpen]);
  if (!isOpen) return null;
  const isConfirmDisabled = confirmationWord ? inputValue.toUpperCase() !== confirmationWord.toUpperCase() : false;

  const primaryColor = variant === 'red' ? 'text-red-500' : 'text-nexa-cyan';
  const borderColor = variant === 'red' ? 'border-red-500/50' : 'border-nexa-cyan/50';
  const bgColor = variant === 'red' ? 'bg-red-900/20' : 'bg-nexa-cyan/10';
  const shadowColor = variant === 'red' ? 'shadow-[0_0_30px_rgba(255,42,42,0.4)]' : 'shadow-[0_0_30px_rgba(41,223,255,0.4)]';
  const confirmButtonBg = variant === 'red' ? 'bg-red-600 hover:bg-red-500' : 'bg-nexa-cyan hover:bg-nexa-cyan/80';
  const confirmButtonText = variant === 'red' ? 'text-white' : 'text-black';
  const confirmButtonShadow = variant === 'red' ? 'shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'shadow-[0_0_15px_rgba(41,223,255,0.5)]';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-sm bg-black border-2 ${borderColor} p-6 ${shadowColor}`}>
        <h2 className={`${primaryColor} text-lg font-bold tracking-widest font-mono`}>{title}</h2>
        <p className="text-zinc-300 mt-4 font-sans leading-relaxed">{message}</p>
        {confirmationWord && (<div className="mt-6"><p className="text-xs text-center text-zinc-400 font-mono mb-2">To confirm, type "{confirmationWord}" below.</p><input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className={`w-full ${bgColor} border ${borderColor} text-white text-center font-mono tracking-[0.3em] py-2 focus:outline-none focus:${borderColor} transition-colors uppercase`} placeholder={confirmationWord} /></div>)}
        <div className="flex gap-4 mt-8"><button onClick={onClose} className="flex-1 py-3 border border-zinc-700 text-zinc-400 font-mono text-xs tracking-widest hover:bg-zinc-900 hover:text-white transition-colors">{cancelLabel}</button><button onClick={onConfirm} disabled={isConfirmDisabled} className={`flex-1 py-3 ${confirmButtonBg} ${confirmButtonText} font-bold font-mono text-xs tracking-widest transition-all ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : confirmButtonShadow}`}>{confirmLabel}</button></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hudState, setHudState] = useState<HUDState>(HUDState.IDLE);
  const [config, setConfig] = useState<AppConfig>({ animationsEnabled: true, hudRotationSpeed: 1, micRotationSpeed: 1, theme: 'system' });
  
  // States for Panels
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isStudyHubOpen, setIsStudyHubOpen] = useState(false);
  const [isManageAccountsModalOpen, setIsManageAccountsModalOpen] = useState(false);

  // SESSION LOCK STATE: 
  // True = Show Auth/PowerUp screen (even if user exists). 
  // False = Show Main Dashboard.
  const [isSessionLocked, setIsSessionLocked] = useState(true);

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, confirmationWord?: string, confirmLabel?: string, cancelLabel?: string, variant?: 'red' | 'cyan'}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [latency, setLatency] = useState<number | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  
  useEffect(() => {
    const savedUser = localStorage.getItem('nexa_user');
    if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        const loadedMessages = getLocalMessages(parsedUser);
        setMessages(loadedMessages);
        
        // Ensure session is locked on refresh to force "Resume" interaction
        setIsSessionLocked(true); 
    }
    
    const savedConfig = localStorage.getItem('nexa_config');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      setConfig(prev => ({ ...prev, ...parsedConfig }));
    }
  }, []);

  // Resume Session: Unlocks the screen and plays intro
  const handleResumeSession = () => {
      setIsSessionLocked(false);
      if (user) {
          setTimeout(() => triggerIntro(user), 500);
      }
  };

  const handleConfigChange = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('nexa_config', JSON.stringify(newConfig));
  };

  useEffect(() => {
    const applyTheme = (theme: AppConfig['theme']) => {
      const root = document.documentElement;
      const isDark = (theme === 'dark') || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', isDark);
      if (isDark) {
        root.style.setProperty('--grid-color', 'rgba(41, 223, 255, 0.1)');
        root.style.setProperty('--vignette-mid', 'rgba(0,0,0,0.4)');
        root.style.setProperty('--vignette-edge', 'rgba(0,0,0,0.9)');
        root.style.setProperty('--scanline-color', 'rgba(0, 0, 0, 0.3)');
      } else {
        root.style.setProperty('--grid-color', 'rgba(0, 0, 0, 0.05)');
        root.style.setProperty('--vignette-mid', 'rgba(255,255,255,0.2)');
        root.style.setProperty('--vignette-edge', 'rgba(255,255,255,0.6)');
        root.style.setProperty('--scanline-color', 'rgba(255, 255, 255, 0.3)');
      }
    };
    applyTheme(config.theme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => { if (config.theme === 'system') { applyTheme('system'); } };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [config.theme]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.onstart = () => { playMicOnSound(); setHudState(HUDState.LISTENING); };
      recognitionRef.current.onend = () => {
        playMicOffSound();
        if (!isProcessingRef.current) {
          setHudState(currentState => (currentState === HUDState.LISTENING ? HUDState.IDLE : currentState));
        }
      };
      recognitionRef.current.onerror = (event: any) => { 
        if (!isProcessingRef.current) setHudState(HUDState.IDLE); 
        playErrorSound(); 
      };
      recognitionRef.current.onresult = async (event: any) => {
        let transcript = event.results[0][0].transcript.trim().replace(/naksha|naks|next a|neck sa|naxa/gi, 'Nexa').replace(/नक्शा/g, 'Nexa');
        if (transcript) await processInput(transcript);
      };
    }
  }, [user]);

  const speakText = useCallback((text: string, warningState: boolean = false, onAudioStart?: () => void) => {
    if (!text || !user) {
        setHudState(isStudyHubOpen ? HUDState.STUDY_HUB : HUDState.IDLE);
        isProcessingRef.current = false;
        return;
    }

    speakTextTTS(
        user,
        text,
        () => {
            if (onAudioStart) onAudioStart();
            setHudState(warningState ? HUDState.WARNING : HUDState.SPEAKING);
        },
        () => {
            isProcessingRef.current = false;
            setHudState(warningState ? HUDState.WARNING : (isStudyHubOpen ? HUDState.STUDY_HUB : HUDState.IDLE));
        }
    );
  }, [isStudyHubOpen, user]);

  const triggerIntro = async (currentUser: UserProfile) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setHudState(HUDState.THINKING);
        
        let briefing = null;
        if (currentUser.role === UserRole.ADMIN) {
            const notifications = await getAdminNotifications();
            if (notifications.length > 0) {
                briefing = await generateAdminBriefing(notifications);
                clearAdminNotifications();
            }
        }
        
        try {
            const introText = await generateIntroductoryMessage(currentUser, briefing);
            const introMsg: ChatMessage = { role: 'model', text: introText, timestamp: Date.now() };
            
            await appendMessageToMemory(currentUser, introMsg);
            setMessages(prev => [...prev, introMsg]);

            const cacheKey = `nexa_intro_${currentUser.role}_${introText.length}`;
            
            speakIntroTTS(currentUser, introText, cacheKey,
              () => setHudState(HUDState.SPEAKING),
              () => {
                isProcessingRef.current = false;
                setHudState(HUDState.IDLE);
              }
            );

        } catch (error: any) {
             isProcessingRef.current = false;
             setHudState(HUDState.IDLE);
        }
  };

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('nexa_user', JSON.stringify(profile));
    
    // Load local messages
    const loadedMessages = getLocalMessages(profile);
    setMessages(loadedMessages);

    // If logging in freshly, Audio Context is already unlocked by the Auth interaction.
    // Unlock session immediately.
    setIsSessionLocked(false);

    if (profile.role === UserRole.ADMIN || loadedMessages.length === 0) {
        setTimeout(() => triggerIntro(profile), 500);
    } else {
        setHudState(HUDState.IDLE);
    }
  };

  const handleLogout = () => {
    stopTextTTS();
    setUser(null);
    setMessages([]);
    localStorage.removeItem('nexa_user');
    setHudState(HUDState.IDLE);
    setIsSessionLocked(true);
  };

  const handleMicClick = () => {
    if (hudState === HUDState.LISTENING) {
      recognitionRef.current?.stop();
    } else if (hudState === HUDState.IDLE || hudState === HUDState.SPEAKING || hudState === HUDState.STUDY_HUB) {
      stopTextTTS();
      try { recognitionRef.current?.start(); } catch (e) { setHudState(HUDState.IDLE); }
    }
  };

  const handleSettingsClick = () => {
    if (isStudyHubOpen) { setIsStudyHubOpen(false); setHudState(HUDState.IDLE); }
    if (user?.role === UserRole.ADMIN) { setIsAdminPanelOpen(true); } else { setIsUserSettingsOpen(true); }
  };

  const handleManageAccounts = () => { setIsAdminPanelOpen(false); setIsManageAccountsModalOpen(true); };
  const handleViewStudyHub = () => { setIsAdminPanelOpen(false); setIsStudyHubOpen(true); setHudState(HUDState.STUDY_HUB); };

  const handleStartLesson = async (subject: StudyHubSubject) => {
      setIsStudyHubOpen(false);
      if(!user) return;
      const userMsg: ChatMessage = { role: 'user', text: `Start Class: ${subject.courseCode}`, timestamp: Date.now() };
      setMessages(prev => [...prev, userMsg]);
      await appendMessageToMemory(user, userMsg);
      setHudState(HUDState.THINKING);
      const startTime = Date.now();
      try {
          const lessonText = await generateTutorLesson(subject, user);
          setLatency(Date.now() - startTime);
          const modelMsg: ChatMessage = { role: 'model', text: lessonText, timestamp: Date.now() };
          setMessages(prev => [...prev, modelMsg]);
          await appendMessageToMemory(user, modelMsg);
          speakText(lessonText, false);
      } catch (e) { setHudState(HUDState.IDLE); }
  };

  const processInput = async (text: string) => {
    if (!user || isProcessingRef.current) return;
    isProcessingRef.current = true;

    const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    await appendMessageToMemory(user, userMsg);
    setHudState(HUDState.THINKING);
    const startTime = Date.now();
    try {
        const responseText = await generateTextResponse(text, user);
        setLatency(Date.now() - startTime);

        // --- SECURITY LEVEL 8 CHECK ---
        const isWarning = responseText.includes("[[STATE:WARNING]]");
        const cleanText = responseText.replace(/\[\[STATE:WARNING\]\]/g, "").trim();

        if (isWarning) {
            playErrorSound(); // Alert sound
            logAdminNotification(`SECURITY ALERT: User '${user.name}' (${user.mobile}) attempted to insult Creator. Input: "${text}"`);
        }
        
        const modelMsg: ChatMessage = { role: 'model', text: cleanText, timestamp: Date.now(), isAngry: isWarning };
        setMessages(prev => [...prev, modelMsg]);
        await appendMessageToMemory(user, modelMsg);
        
        speakText(cleanText, isWarning);
        
    } catch (error: any) {
        setHudState(HUDState.IDLE); 
        playErrorSound();
        let errorText = "Internal error.";
        if (error.message === 'GUEST_ACCESS_DENIED') errorText = "ACCESS DENIED: Please enter API Key.";
        isProcessingRef.current = false;
    }
  };
  
  // RENDER AUTH SCREEN IF NOT LOGGED IN OR IF SESSION IS LOCKED
  if (!user || isSessionLocked) {
      return (
          <Auth 
            onLogin={handleLogin} 
            onResume={user ? handleResumeSession : undefined}
            isResuming={!!user}
            savedUserName={user?.name}
          />
      );
  }

  return (
    <div className="relative w-full h-full bg-zinc-100 dark:bg-black flex flex-col overflow-hidden font-sans select-none transition-colors duration-500">
      <div className="perspective-grid"></div><div className="vignette"></div><div className="scanlines"></div>
      
      <StatusBar 
        userName={user.name} 
        onLogout={handleLogout} 
        onSettings={handleSettingsClick} 
        onStudyHub={() => { setIsStudyHubOpen(true); setHudState(HUDState.STUDY_HUB); }} 
        latency={latency} 
      />
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <div className="flex-[0.45] flex items-center justify-center min-h-[250px] relative"><HUD state={hudState} rotationSpeed={config.animationsEnabled ? config.hudRotationSpeed : 0} /></div>
        <div className="flex-[0.55] flex justify-center w-full px-4 pb-4 overflow-hidden"><ChatPanel messages={messages} userName={user.name} userRole={user.role} hudState={hudState} onTypingComplete={() => {}} /></div>
      </div>
      
      <KeyboardInput 
          onSend={processInput} 
          disabled={isProcessingRef.current} 
          variant={user.role === UserRole.ADMIN ? 'red' : 'cyan'} 
      />

      <ControlDeck onMicClick={handleMicClick} hudState={hudState} rotationSpeedMultiplier={config.animationsEnabled ? (config.micRotationSpeed || 1) : 0} />
      
      {user.role === UserRole.ADMIN ? (
        <AdminPanel 
          isOpen={isAdminPanelOpen} 
          onClose={() => setIsAdminPanelOpen(false)} 
          config={config} 
          onConfigChange={handleConfigChange} 
          onClearMemory={() => setConfirmModal({ isOpen: true, title: 'PURGE ALL MEMORY?', message: 'Irreversibly delete ALL history?', confirmationWord: 'DELETE', onConfirm: () => { clearAllMemory(user); window.location.reload(); } })} 
          onManageAccounts={handleManageAccounts} 
          onViewStudyHub={handleViewStudyHub}
        />
      ) : (
        <UserSettingsPanel isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} config={config} onConfigChange={handleConfigChange} />
      )}

      <StudyHubPanel isOpen={isStudyHubOpen} onClose={() => {setIsStudyHubOpen(false); setHudState(HUDState.IDLE); }} user={user} onStartLesson={handleStartLesson} />
      <ManageAccountsModal isOpen={isManageAccountsModalOpen} onClose={() => setIsManageAccountsModalOpen(false)} />
      <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={() => { confirmModal.onConfirm(); setConfirmModal({...confirmModal, isOpen: false}); }} onClose={() => setConfirmModal({...confirmModal, isOpen: false})} confirmationWord={confirmModal.confirmationWord} confirmLabel={confirmModal.confirmLabel} cancelLabel={confirmModal.cancelLabel} variant={confirmModal.variant} />
      <InstallPWAButton />
    </div>
  );
};

export default App;