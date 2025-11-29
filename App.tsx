import React, { useState, useEffect, useRef, useCallback } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import ChatPanel from './ChatPanel';
import AdminPanel from './components/AdminPanel';
import UserSettingsPanel from './components/UserSettingsPanel';
import ConfigError from './components/ConfigError';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig } from './types';
import { generateTextResponse, generateSpeech, generateIntroductoryMessage, generateAdminBriefing } from './services/geminiService';
import { playMicOnSound, playMicOffSound, playErrorSound } from './services/audioService';
import { appendMessageToMemory, clearAllMemory, getAdminNotifications, clearAdminNotifications } from './services/memoryService';

// --- ICONS ---
const GearIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.065 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.572c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const LogoutIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );

const MicIcon = ({ rotationDuration = '8s' }: { rotationDuration?: string }) => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="coreGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"><stop offset="0%" stopColor="#ffdd44" /><stop offset="100%" stopColor="#ffcc00" /></radialGradient></defs>
      <g style={{ transformOrigin: 'center', animation: `spin ${rotationDuration} linear infinite` }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="5.85 2" transform="rotate(-11.25 12 12)" /></g>
      <circle cx="12" cy="12" r="8" stroke="rgba(0,0,0,0.7)" strokeWidth="0.5" />
      <circle cx="12" cy="12" r="7.75" fill="url(#coreGradient)" />
    </svg>
);

const prepareTextForSpeech = (text: string): string => text.replace(/Nexa/gi, 'Neksa').replace(/Lohave/gi, 'लोहवे');

const StatusBar = ({ userName, onLogout, onSettings, latency }: any) => (
    <div className="w-full h-16 shrink-0 flex justify-between items-center px-6 border-b border-nexa-cyan/10 bg-black/80 backdrop-blur-md z-40 relative">
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-start">
                <div className="text-[10px] text-nexa-cyan font-mono tracking-widest uppercase">{userName}</div>
                <div className="flex gap-1 mt-1"><div className="w-8 h-1 bg-nexa-cyan shadow-[0_0_5px_currentColor]"></div><div className="w-2 h-1 bg-nexa-cyan/50"></div><div className="w-1 h-1 bg-nexa-cyan/20"></div></div>
            </div>
            {latency !== null && (<div className="hidden sm:block text-[9px] font-mono text-nexa-cyan/60 border-l border-nexa-cyan/20 pl-4">API LATENCY: <span className="text-white">{latency}ms</span></div>)}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"><div className="text-xl font-bold tracking-[0.3em] text-white/90 drop-shadow-[0_0_10px_rgba(41,223,255,0.5)]">NEXA</div></div>
        <div className="flex items-center gap-4">
            <button onClick={onSettings} className="p-2 hover:bg-nexa-cyan/10 rounded-full transition-colors"><GearIcon /></button>
            <button onClick={onLogout} className="p-2 hover:bg-red-500/10 rounded-full transition-colors"><LogoutIcon /></button>
        </div>
    </div>
);

const ControlDeck = ({ onMicClick, hudState, rotationSpeedMultiplier = 1 }: any) => {
    const isListening = hudState === HUDState.LISTENING, isAngry = hudState === HUDState.ANGRY, isThinking = hudState === HUDState.THINKING, isIdle = hudState === HUDState.IDLE, isSpeaking = hudState === HUDState.SPEAKING;
    let baseDuration = isThinking ? 2 : (isSpeaking || isListening) ? 4 : isAngry ? 1 : 8;
    const finalDuration = `${baseDuration / rotationSpeedMultiplier}s`;
    const buttonScale = isListening || isAngry || isThinking ? 'scale-110' : 'hover:scale-105 active:scale-95';
    let iconColorClass = (isListening || isAngry) ? 'text-nexa-red' : isThinking ? 'text-nexa-yellow' : 'text-nexa-cyan';
    let pulseClass = (isListening || isAngry || isThinking) ? 'animate-pulse' : '';
    return (
        <div className="w-full h-24 shrink-0 bg-gradient-to-t from-black via-black/80 to-transparent z-40 relative flex items-center justify-center">
            <div className="absolute w-full top-1/2 -translate-y-1/2 h-[1px] px-4"><div className="w-full h-full flex justify-between items-center"><div className="flex-1 h-full bg-gradient-to-r from-transparent via-nexa-cyan/20 to-nexa-cyan/40"></div><div className="w-24 flex-shrink-0"></div><div className="flex-1 h-full bg-gradient-to-l from-transparent via-nexa-cyan/20 to-nexa-cyan/40"></div></div></div>
            <button onClick={onMicClick} className={`relative w-20 h-20 flex items-center justify-center rounded-full transition-all duration-300 group ${buttonScale} ${isIdle ? 'animate-breathing' : ''}`}>
                <div className="absolute inset-0 rounded-full bg-black"></div>
                <div className={`relative z-10 transition-colors duration-300 ${iconColorClass} ${pulseClass} shadow-[0_0_20px_currentColor] group-hover:shadow-[0_0_30px_currentColor]`}><div className="scale-[1.4]"><MicIcon rotationDuration={finalDuration} /></div></div>
            </button>
        </div>
    );
};

const pcmToAudioBuffer = (pcmData: ArrayBuffer, context: AudioContext): AudioBuffer => { const int16Array = new Int16Array(pcmData); const float32Array = new Float32Array(int16Array.length); for (let i = 0; i < int16Array.length; i++) { float32Array[i] = int16Array[i] / 32768; } const buffer = context.createBuffer(1, float32Array.length, 24000); buffer.getChannelData(0).set(float32Array); return buffer; };

const ConfirmationModal: React.FC<{isOpen: boolean, title: string, message: string, onConfirm: () => void, onClose: () => void, confirmationWord?: string}> = ({ isOpen, title, message, onConfirm, onClose, confirmationWord }) => {
  const [inputValue, setInputValue] = useState('');
  useEffect(() => { if (isOpen) setInputValue(''); }, [isOpen]);
  if (!isOpen) return null;
  const isConfirmDisabled = confirmationWord ? inputValue.toUpperCase() !== confirmationWord.toUpperCase() : false;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-black border-2 border-red-500/50 p-6 shadow-[0_0_30px_rgba(255,42,42,0.4)]">
        <h2 className="text-red-500 text-lg font-bold tracking-widest font-mono">{title}</h2>
        <p className="text-zinc-300 mt-4 font-sans leading-relaxed">{message}</p>
        {confirmationWord && (<div className="mt-6"><p className="text-xs text-center text-zinc-400 font-mono mb-2">To confirm, type "{confirmationWord}" below.</p><input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="w-full bg-red-900/20 border border-red-500/50 text-white text-center font-mono tracking-[0.3em] py-2 focus:outline-none focus:border-red-500 transition-colors uppercase" placeholder={confirmationWord} /></div>)}
        <div className="flex gap-4 mt-8"><button onClick={onClose} className="flex-1 py-3 border border-zinc-700 text-zinc-400 font-mono text-xs tracking-widest hover:bg-zinc-900 hover:text-white transition-colors">CANCEL</button><button onClick={onConfirm} disabled={isConfirmDisabled} className={`flex-1 py-3 bg-red-600 text-white font-bold font-mono text-xs tracking-widest hover:bg-red-500 transition-all ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : 'shadow-[0_0_15px_rgba(220,38,38,0.5)]'}`}>CONFIRM</button></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hudState, setHudState] = useState<HUDState>(HUDState.IDLE);
  const [config, setConfig] = useState<AppConfig>({ animationsEnabled: true, hudRotationSpeed: 1, micRotationSpeed: 1 });
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, confirmationWord?: string}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [latency, setLatency] = useState<number | null>(null);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isProcessingRef = useRef(false);

  useEffect(() => {
    setIsKeyValid(!!(process.env.API_KEY && process.env.API_KEY.length > 10));
    const initAudioContext = () => { if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); };
    window.addEventListener('click', initAudioContext, { once: true });
    const savedUser = localStorage.getItem('nexa_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    const savedConfig = localStorage.getItem('nexa_config');
    if (savedConfig) setConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) }));
    return () => window.removeEventListener('click', initAudioContext);
  }, []);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.onstart = () => { playMicOnSound(); setHudState(HUDState.LISTENING); };
      recognitionRef.current.onend = () => setHudState(currentState => { if (currentState === HUDState.LISTENING) { playMicOffSound(); return HUDState.IDLE; } return currentState; });
      recognitionRef.current.onerror = (event: any) => { console.error("Speech Error", event); setHudState(HUDState.IDLE); playErrorSound(); };
      recognitionRef.current.onresult = async (event: any) => {
        playMicOffSound();
        let transcript = event.results[0][0].transcript.trim().replace(/naksha|naks|next a|neck sa|naxa/gi, 'Nexa').replace(/नक्शा/g, 'Nexa');
        if (transcript) await processInput(transcript); else setHudState(HUDState.IDLE);
      };
    }
  }, [user]);

  useEffect(() => {
    if (user && messages.length === 0) {
      const init = async () => {
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
        
        let audioBuffer: AudioBuffer | null = null;
        try {
            const audioData = await generateSpeech(prepareTextForSpeech(introText));
            if (audioData && audioContextRef.current) {
                audioBuffer = pcmToAudioBuffer(audioData, audioContextRef.current);
            }
        } catch (e) { console.error("Intro Audio Fetch Error", e); }
        
        appendMessageToMemory(user, introMsg);
        setMessages([introMsg]);

        if(audioBuffer) {
          setHudState(HUDState.SPEAKING);
          await playAudioBuffer(audioBuffer);
        } else {
          setHudState(HUDState.IDLE);
        }
      };
      init();
    }
  }, [user]);

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('nexa_user', JSON.stringify(profile));
    setMessages([]);
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
      activeAudioSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
      activeAudioSourcesRef.current.clear();
      try { recognitionRef.current?.start(); } catch (e) { console.error("Mic Start Error", e); setHudState(HUDState.IDLE); }
    }
  };

  const handleSettingsClick = () => {
    if (user?.role === UserRole.ADMIN) {
      setIsAdminPanelOpen(true);
    } else {
      setIsUserSettingsOpen(true);
    }
  };

  const processInput = async (text: string, isSecondPass: boolean = false) => {
    if (!user || isProcessingRef.current) return;
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
            const audioData = await generateSpeech(prepareTextForSpeech(holdingText));
            
            setMessages(prev => [...prev, { role: 'model', text: holdingText, timestamp: Date.now() }]);
            
            if (audioData && audioContextRef.current) {
                setHudState(HUDState.SPEAKING);
                await playAudioBuffer(pcmToAudioBuffer(audioData, audioContextRef.current));
            }
            
            isProcessingRef.current = false;
            await processInput(text, true);
            return;
        }

        if (responseText.includes("[LOG_INCIDENT:Insult]") || responseText.includes("[LOG_INCIDENT:Query]")) {
            const notifications = getAdminNotifications();
            const incidentType = responseText.includes("Insult") ? "insulted you" : "queried about you";
            notifications.push(`At ${new Date().toLocaleTimeString()}, user '${user.name}' (${user.mobile}) ${incidentType}. Query: "${text}"`);
            localStorage.setItem('nexa_admin_notifications', JSON.stringify(notifications));
        }

        const isAngry = responseText.includes("[[STATE:ANGRY]]");
        const isSinging = responseText.includes("[SING]");
        const cleanText = responseText.replace(/\[\[STATE:ANGRY\]\]|\[LOG_INCIDENT:.*?\]/g, "").trim();
        
        let mainAudioBuffer: AudioBuffer | null = null;
        let songAudioBuffer: AudioBuffer | null = null;

        if (isSinging) {
            const parts = cleanText.split("[SING]");
            const introText = parts[0]?.trim();
            const songText = parts[1]?.trim();

            if (introText) {
                const introAudioData = await generateSpeech(prepareTextForSpeech(introText), { isAngry });
                if (introAudioData && audioContextRef.current) mainAudioBuffer = pcmToAudioBuffer(introAudioData, audioContextRef.current);
            }
            if (songText) {
                const lyricsAudioData = await generateSpeech(prepareTextForSpeech(songText), { voiceName: 'Zephyr' });
                if (lyricsAudioData && audioContextRef.current) songAudioBuffer = pcmToAudioBuffer(lyricsAudioData, audioContextRef.current);
            }
        } else {
            const audioData = await generateSpeech(prepareTextForSpeech(cleanText), { isAngry });
            if (audioData && audioContextRef.current) mainAudioBuffer = pcmToAudioBuffer(audioData, audioContextRef.current);
        }

        const modelMsg: ChatMessage = { role: 'model', text: cleanText.replace("[SING]", "\n\n"), timestamp: Date.now(), isAngry };
        appendMessageToMemory(user, modelMsg);
        setMessages(prev => [...prev, modelMsg]);
        setHudState(isAngry ? HUDState.ANGRY : HUDState.SPEAKING);
      
        if (mainAudioBuffer) await playAudioBuffer(mainAudioBuffer);
        if (songAudioBuffer) await playAudioBuffer(songAudioBuffer);
      
        if (activeAudioSourcesRef.current.size === 0) setHudState(HUDState.IDLE);
    } catch (error: any) {
        console.error("Processing Error", error);
        setHudState(HUDState.IDLE); playErrorSound();
        const errorText = (error.message?.includes('API_KEY')) ? "SYSTEM ALERT: API Access Key invalid or missing." : "I encountered an internal error.";
        setMessages(prev => [...prev, { role: 'model', text: errorText, timestamp: Date.now(), isAngry: true }]);
    } finally {
        isProcessingRef.current = false;
    }
  };

  const playAudioBuffer = (buffer: AudioBuffer) => new Promise<void>(async (resolve) => {
    if (!audioContextRef.current) return resolve();
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    activeAudioSourcesRef.current.add(source);
    source.start(0);
    source.onended = () => {
        activeAudioSourcesRef.current.delete(source);
        if (activeAudioSourcesRef.current.size === 0) setHudState(HUDState.IDLE);
        resolve();
    };
  });

  if (isKeyValid === null) return <div className="w-full h-full bg-black"></div>;
  if (!isKeyValid) return <ConfigError />;
  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden font-sans select-none">
      <div className="perspective-grid"></div><div className="vignette"></div><div className="scanlines"></div>
      <StatusBar userName={user.name} onLogout={handleLogout} onSettings={handleSettingsClick} latency={latency} />
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <div className="flex-[0.45] flex items-center justify-center min-h-[250px] relative"><HUD state={hudState} rotationSpeed={config.animationsEnabled ? config.hudRotationSpeed : 0} /></div>
        <div className="flex-[0.55] flex justify-center w-full px-4 pb-4 overflow-hidden"><ChatPanel messages={messages} userName={user.name} userRole={user.role} hudState={hudState} onTypingComplete={() => {}} /></div>
      </div>
      <ControlDeck onMicClick={handleMicClick} hudState={hudState} rotationSpeedMultiplier={config.animationsEnabled ? (config.micRotationSpeed || 1) : 0} />
      
      {user.role === UserRole.ADMIN ? (
        <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} config={config} onConfigChange={(newConfig) => { setConfig(newConfig); localStorage.setItem('nexa_config', JSON.stringify(newConfig)); }} onClearMemory={() => setConfirmModal({ isOpen: true, title: 'PURGE ALL MEMORY?', message: 'This will irreversibly delete ALL user and admin conversation history. This cannot be undone.', confirmationWord: 'DELETE', onConfirm: () => { clearAllMemory(); window.location.reload(); } })} onManageAccounts={() => {}} />
      ) : (
        <UserSettingsPanel isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} config={config} onConfigChange={(newConfig) => { setConfig(newConfig); localStorage.setItem('nexa_config', JSON.stringify(newConfig)); }} />
      )}

      <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={() => { confirmModal.onConfirm(); setConfirmModal({...confirmModal, isOpen: false}); }} onClose={() => setConfirmModal({...confirmModal, isOpen: false})} confirmationWord={confirmModal.confirmationWord} />
    </div>
  );
};

export default App;