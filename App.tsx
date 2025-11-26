import React, { useState, useEffect, useRef } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig } from './types';
import { generateTextResponse, generateSpeech, generateIntroductoryMessage } from './services/geminiService';

// --- ICONS ---
const GearIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 1.9-.94 3.31-.826 3.31-2.37 0-3.35-.426-3.35-2.924 0-3.35a1.724 1.724 0 00-1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.94 1.543 2.924 1.543 3.35 0a1.724 1.724 0 002.573-1.066c1.543.94 3.31-.826 2.37-1.9.94-3.31.826-3.31 2.37 0 3.35.426 3.35 2.924 0 3.35a1.724 1.724 0 001.066 2.573c.94 1.543-.826 3.31-2.37 2.37-.94-1.543-2.924-1.543-3.35 0a1.724 1.724 0 00-2.573 1.066c-1.543-.94-3.31.826-2.37 1.9zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const LogoutIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const MicIcon = () => ( <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-4-12v8m8-8v8m-12-5v2m16-2v2" /></svg> );

// --- HELPER & STATE COMPONENTS ---
const InstallBanner: React.FC<{ prompt: any, onInstall: () => void }> = ({ prompt, onInstall }) => { if (!prompt) return null; return ( <div className="w-full bg-nexa-cyan/10 border-b border-nexa-cyan/30 backdrop-blur-md py-3 px-4 flex items-center justify-between animate-slide-down z-50 fixed top-0 left-0"> <div className="flex items-center gap-3"> <div className="w-8 h-8 bg-nexa-cyan/20 rounded flex items-center justify-center border border-nexa-cyan/50"><svg className="w-5 h-5 text-nexa-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></div><div><div className="text-nexa-cyan text-[10px] font-mono tracking-widest uppercase">System Upgrade</div><div className="text-white text-xs font-mono opacity-80">Install Native Protocol</div></div></div><button onClick={onInstall} className="bg-nexa-cyan hover:bg-white text-black text-[10px] font-bold font-mono py-2 px-3 rounded shadow-[0_0_10px_rgba(41,223,255,0.4)] transition-all uppercase">Install</button></div> ); };
const StatusBar = ({ role, onLogout, onSettings, latency }: any) => ( <div className="w-full h-16 shrink-0 flex justify-between items-center px-6 border-b border-nexa-cyan/10 bg-black/80 backdrop-blur-md z-40 relative"> <div className="flex items-center gap-4"><div className="flex flex-col items-start"><div className="text-[10px] text-nexa-cyan font-mono tracking-widest uppercase">System Online</div><div className="flex gap-1 mt-1"><div className="w-8 h-1 bg-nexa-cyan shadow-[0_0_5px_currentColor]"></div><div className="w-2 h-1 bg-nexa-cyan/50"></div><div className="w-1 h-1 bg-nexa-cyan/20"></div></div></div>{latency !== null && (<div className="hidden sm:block text-[9px] font-mono text-nexa-cyan/60 border-l border-nexa-cyan/20 pl-4"> API LATENCY: <span className="text-white">{latency}ms</span></div>)}</div><div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"><div className="text-xl font-bold tracking-[0.3em] text-white/90 drop-shadow-[0_0_10px_rgba(41,223,255,0.5)]">NEXA</div></div><div className="flex items-center gap-4">{role === UserRole.ADMIN && (<button onClick={onSettings} className="p-2 hover:bg-nexa-cyan/10 rounded-full transition-colors"><GearIcon /></button>)}<button onClick={onLogout} className="p-2 hover:bg-red-500/10 rounded-full transition-colors"><LogoutIcon /></button></div></div> );
const ControlDeck = ({ onMicClick, hudState }: any) => ( <div className="w-full h-24 shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent z-40 relative flex items-center justify-center pb-6"><div className="absolute bottom-0 w-full h-[1px] bg-nexa-cyan/30"></div><button onClick={onMicClick} className={`relative w-20 h-20 flex items-center justify-center transition-all duration-300 group ${hudState === HUDState.LISTENING || hudState === HUDState.ANGRY ? 'scale-110' : 'hover:scale-105 active:scale-95'} ${hudState === HUDState.IDLE ? 'animate-breathing' : ''}`}><div className={`absolute inset-0 bg-black border ${hudState === HUDState.LISTENING || hudState === HUDState.ANGRY ? 'border-nexa-red shadow-[0_0_30px_rgba(255,42,42,0.6)]' : 'border-nexa-cyan shadow-[0_0_20px_rgba(41,223,255,0.4)]'} transition-all duration-300`} style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div><div className={`relative z-10 ${hudState === HUDState.LISTENING || hudState === HUDState.ANGRY ? 'text-nexa-red animate-pulse' : 'text-nexa-cyan group-hover:text-white'} transition-colors`}><MicIcon /></div></button></div> );

const pcmToAudioBuffer = (pcmData: ArrayBuffer, context: AudioContext): AudioBuffer => { const int16Array = new Int16Array(pcmData); const float32Array = new Float32Array(int16Array.length); for (let i = 0; i < int16Array.length; i++) { float32Array[i] = int16Array[i] / 32768; } const buffer = context.createBuffer(1, float32Array.length, 24000); buffer.getChannelData(0).set(float32Array); return buffer; };

type SystemStatus = 'unauthenticated' | 'initializing' | 'ready' | 'error';

// --- MAIN APP ---
const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('unauthenticated');
  const [systemError, setSystemError] = useState<string | null>(null);

  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [hudState, setHudState] = useState<HUDState>(HUDState.IDLE);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [config, setConfig] = useState<AppConfig>({ introText: "", animationsEnabled: true, hudRotationSpeed: 1 });
  const [latency, setLatency] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isProcessingRef = useRef(false);
  const memoryRef = useRef<ChatMessage[]>([]);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // On initial mount, check for saved user and set up listeners
  useEffect(() => {
    const savedUser = localStorage.getItem('nexa_user');
    if (savedUser) {
      handleLogin(JSON.parse(savedUser));
    }
    const savedConfig = localStorage.getItem('nexa_config');
    if (savedConfig) { try { setConfig(JSON.parse(savedConfig)); } catch (e) { console.error("Failed to parse config, resetting.", e); } }
    
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setInstallPrompt(e); });
    
    const unlockHandler = () => { unlockAudioContext(); window.removeEventListener('touchstart', unlockHandler); window.removeEventListener('click', unlockHandler); };
    window.addEventListener('touchstart', unlockHandler);
    window.addEventListener('click', unlockHandler);

    initSpeechRecognition();

    return () => { window.removeEventListener('touchstart', unlockHandler); window.removeEventListener('click', unlockHandler); };
  }, []);

  useEffect(() => { localStorage.setItem('nexa_config', JSON.stringify(config)); }, [config]);

  // Proactive Admin reminders
  useEffect(() => { if (!user || user.role !== UserRole.ADMIN) return; const checkTime = () => { const now = new Date(); if (now.getHours() === 23 && now.getMinutes() === 0) { speakSystemMessage("Sir… 11 baj chuke hain. Kal aapko Encave Cafe duty bhi karni hai. Please rest kar lijiye… main yahin hoon.", user); } if (now.getHours() === 8 && now.getMinutes() === 0) { speakSystemMessage("Sir… aaj Encave Café duty hai, time se tayar ho jaiye.", user); } }; const interval = setInterval(checkTime, 60000); return () => clearInterval(interval); }, [user]);
  
  const initSpeechRecognition = () => { if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) { const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; recognitionRef.current = new SpeechRecognition(); recognitionRef.current.continuous = false; recognitionRef.current.interimResults = false; recognitionRef.current.lang = 'en-IN'; recognitionRef.current.onstart = () => setHudState(HUDState.LISTENING); recognitionRef.current.onend = () => { if (hudState === HUDState.LISTENING) setHudState(HUDState.IDLE); }; recognitionRef.current.onerror = (event: any) => { console.error("Speech Error", event.error); if (event.error === 'aborted' || event.error === 'no-speech') return; setHudState(HUDState.IDLE); }; recognitionRef.current.onresult = (event: any) => { processQuery(event.results[0][0].transcript); }; } };
  const loadMemory = (mobile: string) => { const history = localStorage.getItem(`nexa_chat_${mobile}`); if (history) { try { memoryRef.current = JSON.parse(history); } catch (e) { console.error("Failed to parse chat history", e); memoryRef.current = []; } } else { memoryRef.current = []; } };
  const saveMemory = (currentUser: UserProfile | null) => { if (currentUser) localStorage.setItem(`nexa_chat_${currentUser.mobile}`, JSON.stringify(memoryRef.current)); };
  const getAudioContext = () => { if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); return audioContextRef.current; };
  const unlockAudioContext = () => { const ctx = getAudioContext(); if (ctx.state === 'suspended') { ctx.resume().then(() => { try { const source = ctx.createBufferSource(); source.buffer = ctx.createBuffer(1, 1, 22050); source.connect(ctx.destination); source.start(0); } catch(e) { console.warn("Audio unlock failed", e); } }); } };

  const handleLogin = (profile: UserProfile) => {
    unlockAudioContext();
    setUser(profile);
    setSystemStatus('initializing');
    localStorage.setItem('nexa_user', JSON.stringify(profile));
    loadMemory(profile.mobile);
    setChatLog([]);
  
    // Timeout allows the UI to update to the "initializing" screen before the API call
    setTimeout(async () => {
      try {
        const dynamicIntro = await generateIntroductoryMessage(profile);
        setSystemStatus('ready');
        
        let notificationPrefix = '';
        if (profile.role === UserRole.ADMIN) {
          try {
            const notifications: string[] = JSON.parse(localStorage.getItem('nexa_admin_notifications') || '[]');
            if (notifications.length > 0) {
              const names = notifications.map(n => n.match(/user '(.*?)'/)?.[1]).filter(Boolean as any as (x: string | undefined) => x is string);
              if (names.length > 0) {
                let nameSummary = names.length === 1 ? names[0] : (names.length === 2 ? `${names[0]} aur ${names[1]}` : `${names.slice(0, -1).join(', ')}, aur ${names[names.length - 1]}`);
                notificationPrefix = `Sir, aapke wapas aane ka intezaar tha. Ek choti si report hai... jab aap yahan nahi the, tab ${nameSummary} aapke baare mein pooch rahe the. Aap chinta mat kijiye, maine sab aache se sambhal liya hai.`;
              }
              localStorage.removeItem('nexa_admin_notifications');
            }
          } catch(e) { localStorage.removeItem('nexa_admin_notifications'); }
        }

        if (notificationPrefix) { speakSystemMessage(notificationPrefix, profile); } 
        else if (memoryRef.current.length === 0) { speakSystemMessage(dynamicIntro, profile); } 
        else { setHudState(HUDState.IDLE); }

      } catch (e: any) {
        console.error("Initialization Error:", e);
        const errorMessageString = e.toString();
        let friendlyError = 'Connection to NEXA Core failed. Please try again.';
        if (errorMessageString.includes('API_KEY_MISSING')) { friendlyError = 'SYSTEM OFFLINE: API Key is not configured in the deployment environment. Please contact the administrator.'; } 
        else if (errorMessageString.includes('404')) { friendlyError = 'SYSTEM OFFLINE: The required AI model was not found. The system configuration may be outdated.'; }
        else if (errorMessageString.toLowerCase().includes('failed to fetch')) { friendlyError = 'NETWORK ERROR: Cannot connect to NEXA systems. Please check your internet connection.'; }
        setSystemError(friendlyError);
        setSystemStatus('error');
      }
    }, 500);
  };
  
  const handleLogout = () => { setUser(null); setSystemStatus('unauthenticated'); localStorage.removeItem('nexa_user'); setChatLog([]); memoryRef.current = []; setHudState(HUDState.IDLE); };
  
  const playAudio = (buffer: ArrayBuffer, currentState: HUDState) => { if (!isProcessingRef.current) return; const ctx = getAudioContext(); if (ctx.state === 'suspended') ctx.resume(); if (currentState !== HUDState.ANGRY) setHudState(HUDState.SPEAKING); try { const source = ctx.createBufferSource(); source.buffer = pcmToAudioBuffer(buffer, ctx); source.connect(ctx.destination); currentAudioSourceRef.current = source; source.onended = () => { currentAudioSourceRef.current = null; if(isProcessingRef.current) { setHudState(HUDState.IDLE); isProcessingRef.current = false; } }; source.start(); } catch (e) { throw e; } };
  const speakSystemMessage = async (displayText: string, currentUser: UserProfile | null) => { if (isProcessingRef.current || !currentUser) return; setHudState(HUDState.THINKING); isProcessingRef.current = true; const modelMessage: ChatMessage = { role: 'model', text: displayText, timestamp: Date.now() }; memoryRef.current.push(modelMessage); saveMemory(currentUser); setIsAudioLoading(true); try { const audioBuffer = await generateSpeech(displayText.replace(/Lohave/gi, 'लोहवे'), currentUser.role); setIsAudioLoading(false); if (!isProcessingRef.current) return; if (audioBuffer) { setChatLog(prev => [...prev, modelMessage]); playAudio(audioBuffer, HUDState.THINKING); } else { setChatLog(prev => [...prev, modelMessage]); setHudState(HUDState.IDLE); isProcessingRef.current = false; } } catch(e) { handleApiError(e, "Speak System Message"); } };
  const handleMicClick = () => { unlockAudioContext(); if (hudState === HUDState.THINKING || hudState === HUDState.SPEAKING || hudState === HUDState.ANGRY) { isProcessingRef.current = false; recognitionRef.current?.abort(); if (currentAudioSourceRef.current) { currentAudioSourceRef.current.onended = null; currentAudioSourceRef.current.stop(); currentAudioSourceRef.current = null; } setHudState(HUDState.IDLE); return; } if (hudState === HUDState.LISTENING) { recognitionRef.current?.stop(); } else { try { recognitionRef.current?.start(); } catch (e) { console.warn("Recognition start error", e); initSpeechRecognition(); setTimeout(() => recognitionRef.current?.start(), 100); } } };

  const handleApiError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    const errorMessage: ChatMessage = { role: 'model', text: `SYSTEM ERROR: Connection interrupted. Please check logs. [${context}]`, timestamp: Date.now() };
    setChatLog(prev => [...prev, errorMessage]);
    setHudState(HUDState.IDLE); isProcessingRef.current = false; setIsAudioLoading(false);
  };
  
  const processQuery = async (text: string) => {
    if (!user || isProcessingRef.current) return;
    setHudState(HUDState.THINKING); isProcessingRef.current = true;
    const userMessage: ChatMessage = { role: 'user', text, timestamp: Date.now() };
    memoryRef.current.push(userMessage); saveMemory(user);
    setChatLog(prev => [...prev, userMessage]); 

    try {
        const startTime = performance.now();
        const historyForApi = memoryRef.current.slice(0, -1).slice(-10).map((msg: ChatMessage) => ({ role: msg.role, parts: [{ text: msg.text }] }));
        const rawAiResponse = await generateTextResponse(text, user, historyForApi);
        setLatency(Math.round(performance.now() - startTime));
        
        if (!isProcessingRef.current) { isProcessingRef.current = false; return; }
        
        const stateMatch = rawAiResponse.match(/\[\[STATE:(.*?)\]\]/); const nextState = stateMatch ? stateMatch[1] : null; if(nextState === 'ANGRY') { setHudState(HUDState.ANGRY); navigator.vibrate?.([100, 50, 100]); }
        
        const textForDisplay = rawAiResponse.replace(/\[\[.*?\]\]/g, '').trim();
        const modelMessage: ChatMessage = { role: 'model', text: textForDisplay, timestamp: Date.now(), isAngry: nextState === 'ANGRY' };
        memoryRef.current.push(modelMessage); saveMemory(user);

        setIsAudioLoading(true);
        const audioBuffer = await generateSpeech(textForDisplay.replace(/Lohave/gi, 'लोहवे'), user.role, nextState === 'ANGRY');
        setIsAudioLoading(false);
        
        if (!isProcessingRef.current) { isProcessingRef.current = false; return; }
        if (audioBuffer) { setChatLog(prev => [...prev, modelMessage]); playAudio(audioBuffer, nextState === 'ANGRY' ? HUDState.ANGRY : hudState); } 
        else { setChatLog(prev => [...prev, modelMessage]); setHudState(HUDState.IDLE); isProcessingRef.current = false; }
    } catch (e) { handleApiError(e, "Process Query"); }
  };

  // --- RENDER LOGIC ---
  if (systemStatus === 'unauthenticated') { return <Auth onLogin={handleLogin} />; }

  if (systemStatus === 'initializing') { return ( <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-nexa-cyan font-mono z-[100]"> <div className="relative w-32 h-32 flex items-center justify-center"><div className="absolute w-full h-full border-2 border-nexa-cyan rounded-full border-t-transparent animate-spin"></div><div className="text-2xl font-bold tracking-widest">NEXA</div></div><p className="mt-8 tracking-[0.3em] animate-pulse">CONNECTING TO CORE...</p></div> ); }
  
  if (systemStatus === 'error') { return ( <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 text-center z-[100]"> <div className="border border-red-500/50 p-8 max-w-sm w-full bg-red-900/10 backdrop-blur-md"><h1 className="text-red-500 text-lg font-bold tracking-widest font-mono">CONNECTION FAILED</h1><p className="text-zinc-300 mt-4 font-sans leading-relaxed">{systemError}</p><button onClick={handleLogout} className="mt-8 bg-red-600 text-white font-bold tracking-widest py-3 px-8 hover:bg-red-500 transition-colors">RESTART</button></div></div> ); }

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-black text-white font-sans selection:bg-nexa-cyan selection:text-black">
      <div className="perspective-grid"></div><div className="vignette"></div><div className="scanlines"></div>
      {user && systemStatus === 'ready' && (
        <>
          <InstallBanner prompt={installPrompt} onInstall={() => { if (installPrompt) { installPrompt.prompt(); setInstallPrompt(null); } }} />
          <StatusBar role={user.role} onLogout={handleLogout} onSettings={() => setAdminPanelOpen(true)} latency={latency} />
          <div className="flex-1 relative flex flex-col items-center min-h-0 w-full">
            <div className="flex-[0_0_auto] py-4 sm:py-6 w-full flex items-center justify-center z-10"><HUD state={hudState} rotationSpeed={config.animationsEnabled ? config.hudRotationSpeed : 0} /></div>
            <div className="flex-1 w-full min-h-0 relative z-20 px-4 pb-4"><ChatPanel messages={chatLog} userRole={user.role} hudState={hudState} isAudioLoading={isAudioLoading} /></div>
          </div>
          <ControlDeck onMicClick={handleMicClick} hudState={hudState} />
          {user.role === UserRole.ADMIN && ( <AdminPanel isOpen={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} config={config} onConfigChange={setConfig} onClearMemory={() => { setChatLog([]); memoryRef.current = []; if (user) localStorage.removeItem(`nexa_chat_${user.mobile}`); }} /> )}
        </>
      )}
    </div>
  );
};

export default App;