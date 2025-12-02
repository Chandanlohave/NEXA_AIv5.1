import React, { useState, useEffect, useRef, useCallback } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import ChatPanel from './ChatPanel';
import AdminPanel from './components/AdminPanel';
import UserSettingsPanel from './components/UserSettingsPanel';
import ConfigError from './components/ConfigError';
import StudyHubPanel from './components/StudyHubPanel';
import ManageAccountsModal from './components/ManageAccountsModal';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig } from './types';
import { generateTextResponse, generateIntroductoryMessage, generateAdminBriefing } from './services/geminiService';
import { playMicOnSound, playMicOffSound, playErrorSound } from './services/audioService';
import { appendMessageToMemory, clearAllMemory, getAdminNotifications, clearAdminNotifications } from './services/memoryService';
import { speak as speakTextTTS, stop as stopTextTTS } from './services/ttsService';

// --- ICONS ---
const GearIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 dark:hover:text-white hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.065 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.572c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const LogoutIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );

const MicIcon = ({ rotationDuration = '8s' }: { rotationDuration?: string }) => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="coreGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"><stop offset="0%" stopColor="#ffdd44" /><stop offset="100%" stopColor="#ffcc00" /></radialGradient></defs>
      <g style={{ transformOrigin: 'center', animation: `spin ${rotationDuration} linear infinite` }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="5.85 2" transform="rotate(-11.25 12 12)" /></g>
      <circle cx="12" cy="12" r="8" stroke="rgba(0,0,0,0.7)" strokeWidth="0.5" />
      <circle cx="12" cy="12" r="7.75" fill="url(#coreGradient)" />
    </svg>
);

const StatusBar = ({ userName, onLogout, onSettings, latency }: any) => (
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
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isStudyHubOpen, setIsStudyHubOpen] = useState(false);
  const [isManageAccountsModalOpen, setIsManageAccountsModalOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, confirmationWord?: string, confirmLabel?: string, cancelLabel?: string, variant?: 'red' | 'cyan'}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [latency, setLatency] = useState<number | null>(null);
  const [isKeyValid, setIsKeyValid] = useState<boolean>(() => !!process.env.API_KEY);

  const recognitionRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  
  useEffect(() => {
    const savedUser = localStorage.getItem('nexa_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    const savedConfig = localStorage.getItem('nexa_config');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      setConfig(prev => ({ ...prev, ...parsedConfig }));
    }
  }, []);

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
        console.error("Speech Error", event); 
        if (!isProcessingRef.current) setHudState(HUDState.IDLE); 
        playErrorSound(); 
      };

      recognitionRef.current.onresult = async (event: any) => {
        let transcript = event.results[0][0].transcript.trim().replace(/naksha|naks|next a|neck sa|naxa/gi, 'Nexa').replace(/नक्शा/g, 'Nexa');
        if (transcript) await processInput(transcript);
      };
    }
  }, [user]);

  const speakText = useCallback((text: string) => {
    if (!text) {
        setHudState(isStudyHubOpen ? HUDState.STUDY_HUB : HUDState.IDLE);
        return;
    }

    speakTextTTS(
        text,
        () => {
            setHudState(HUDState.SPEAKING);
        },
        () => {
            if (!isProcessingRef.current) {
                setHudState(isStudyHubOpen ? HUDState.STUDY_HUB : HUDState.IDLE);
            }
        }
    );
  }, [isStudyHubOpen]);

  useEffect(() => {
    if (user && messages.length === 0 && hudState === HUDState.IDLE && !isProcessingRef.current) {
      const init = async () => {
        isProcessingRef.current = true;
        setHudState(HUDState.THINKING);
        let briefing = null;
        if (user.role === UserRole.ADMIN) {
            const notifications = getAdminNotifications();
            if (notifications.length > 0) {
                briefing = await generateAdminBriefing(notifications);
                clearAdminNotifications();
            }
        }
        const introText = await generateIntroductoryMessage(user, briefing);
        const introMsg: ChatMessage = { role: 'model', text: introText, timestamp: Date.now() };
        
        appendMessageToMemory(user, introMsg);
        setMessages([introMsg]);
        
        speakText(introText);
        isProcessingRef.current = false;
      };
      init();
    }
  }, [user, messages.length, hudState, speakText]);

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('nexa_user', JSON.stringify(profile));
    setMessages([]);
    setHudState(HUDState.IDLE);
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
    } else if (hudState === HUDState.IDLE || hudState === HUDState.SPEAKING || hudState === HUDState.STUDY_HUB) {
      stopTextTTS();
      try { recognitionRef.current?.start(); } catch (e) { console.error("Mic Start Error", e); setHudState(HUDState.IDLE); }
    }
  };

  const handleSettingsClick = () => {
    if (isStudyHubOpen) {
      setIsStudyHubOpen(false);
      setHudState(HUDState.IDLE);
    }
    if (user?.role === UserRole.ADMIN) {
      setIsAdminPanelOpen(true);
    } else {
      setIsUserSettingsOpen(true);
    }
  };

  const handleManageAccounts = () => {
    setIsAdminPanelOpen(false);
    setIsManageAccountsModalOpen(true);
  };

  const handleViewStudyHub = () => {
    setIsAdminPanelOpen(false);
    setIsStudyHubOpen(true);
    setHudState(HUDState.STUDY_HUB);
  };

  const processInput = async (text: string, isSecondPass: boolean = false) => {
    if (!user || (isProcessingRef.current && !isSecondPass)) return;
    isProcessingRef.current = true;

    if (!isSecondPass) {
        const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
        appendMessageToMemory(user, userMsg);
        setMessages(prev => [...prev, userMsg]);
    }
    setHudState(HUDState.THINKING);

    const startTime = Date.now();
    try {
        const responseText = await generateTextResponse(text, user, isSecondPass);
        setLatency(Date.now() - startTime);

        if (responseText.includes("[THINKING]")) {
            const holdingText = responseText.split("[THINKING]")[0].trim();
            const holdingMsg = { role: 'model' as const, text: holdingText, timestamp: Date.now() };
            setMessages(prev => [...prev, holdingMsg]);
            speakText(holdingText);
            
            await processInput(text, true); // Recursive call
            return;
        }

        if (responseText.includes("[LOG_INCIDENT:Insult]") || responseText.includes("[LOG_INCIDENT:Query]")) {
            const notifications = getAdminNotifications();
            const incidentType = responseText.includes("Insult") ? "insulted you" : "queried about you";
            notifications.push(`At ${new Date().toLocaleTimeString()}, user '${user.name}' (${user.mobile}) ${incidentType}. Query: "${text}"`);
            localStorage.setItem('nexa_admin_notifications', JSON.stringify(notifications));
        }

        const isAngry = responseText.includes("[[STATE:ANGRY]]");
        const cleanText = responseText.replace(/\[\[STATE:ANGRY\]\]|\[LOG_INCIDENT:.*?\]/g, "").trim();
        
        const modelMsg: ChatMessage = { role: 'model', text: cleanText.replace(/\[SING\]/g, "\n\n"), timestamp: Date.now(), isAngry };
        appendMessageToMemory(user, modelMsg);
        setMessages(prev => [...prev, modelMsg]);
        
        setHudState(isAngry ? HUDState.WARNING : HUDState.SPEAKING);

        speakText(cleanText);
        
    } catch (error: any) {
        console.error("Processing Error", error);
        setHudState(HUDState.IDLE); 
        playErrorSound();
        let errorText = "I encountered an internal error. Please try again.";
        if (error.message?.includes('API_KEY_MISSING') || error.message?.includes('API_KEY_INVALID')) {
            errorText = "SYSTEM ALERT: Gemini API Access Key is missing or invalid.";
            setIsKeyValid(false);
        }
        setMessages(prev => [...prev, { role: 'model', text: errorText, timestamp: Date.now(), isAngry: true }]);
    } finally {
        isProcessingRef.current = false;
    }
  };
  
  if (!isKeyValid) return <ConfigError />;
  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <div className="relative w-full h-full bg-zinc-100 dark:bg-black flex flex-col overflow-hidden font-sans select-none transition-colors duration-500">
      <div className="perspective-grid"></div><div className="vignette"></div><div className="scanlines"></div>
      <StatusBar userName={user.name} onLogout={handleLogout} onSettings={handleSettingsClick} latency={latency} />
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <div className="flex-[0.45] flex items-center justify-center min-h-[250px] relative"><HUD state={hudState} rotationSpeed={config.animationsEnabled ? config.hudRotationSpeed : 0} /></div>
        <div className="flex-[0.55] flex justify-center w-full px-4 pb-4 overflow-hidden"><ChatPanel messages={messages} userName={user.name} userRole={user.role} hudState={hudState} onTypingComplete={() => {}} /></div>
      </div>
      <ControlDeck onMicClick={handleMicClick} hudState={hudState} rotationSpeedMultiplier={config.animationsEnabled ? (config.micRotationSpeed || 1) : 0} />
      
      {user.role === UserRole.ADMIN ? (
        <AdminPanel 
          isOpen={isAdminPanelOpen} 
          onClose={() => setIsAdminPanelOpen(false)} 
          config={config} 
          onConfigChange={handleConfigChange} 
          onClearMemory={() => setConfirmModal({ isOpen: true, title: 'PURGE ALL MEMORY?', message: 'This will irreversibly delete ALL user and admin conversation history. This cannot be undone.', confirmationWord: 'DELETE', onConfirm: () => { clearAllMemory(); window.location.reload(); } })} 
          onManageAccounts={handleManageAccounts} 
          onViewStudyHub={handleViewStudyHub}
        />
      ) : (
        <UserSettingsPanel 
          isOpen={isUserSettingsOpen} 
          onClose={() => setIsUserSettingsOpen(false)} 
          config={config} 
          onConfigChange={handleConfigChange} 
        />
      )}

      <StudyHubPanel isOpen={isStudyHubOpen} onClose={() => {setIsStudyHubOpen(false); setHudState(HUDState.IDLE); }} />
      <ManageAccountsModal isOpen={isManageAccountsModalOpen} onClose={() => setIsManageAccountsModalOpen(false)} />

      <ConfirmationModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal({...confirmModal, isOpen: false}); }} 
        onClose={() => setConfirmModal({...confirmModal, isOpen: false})} 
        confirmationWord={confirmModal.confirmationWord} 
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
      />
    </div>
  );
};

export default App;
