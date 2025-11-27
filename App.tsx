import React, { useState, useEffect, useRef } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig } from './types';
import { generateTextResponse, generateSpeech, generateIntroductoryMessage } from './services/geminiService';

// --- ICONS ---
const GearIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.065 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.572c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const LogoutIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const MicIcon = () => ( <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-4-12v8m8-8v8m-12-5v2m16-2v2" /></svg> );

// --- HELPER & STATE COMPONENTS ---
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
  const [config, setConfig] = useState<AppConfig>({ animationsEnabled: true, hudRotationSpeed: 1 });
  const [latency, setLatency] = useState<number | null>(null);
  const [pendingIntro, setPendingIntro] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isProcessingRef = useRef(false);
  const memoryRef = useRef<ChatMessage[]>([]);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const listeningTimeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    const savedUser = localStorage.getItem('nexa_user');
    if (savedUser) { handleLogin(JSON.parse(savedUser)); }
    const savedConfig = localStorage.getItem('nexa_config');
    if (savedConfig) { try { setConfig(JSON.parse(savedConfig)); } catch (e) { console.error("Failed to parse config, resetting.", e); } }
    
    const unlockHandler = () => { unlockAudioContext(); window.removeEventListener('touchstart', unlockHandler); window.removeEventListener('click', unlockHandler); };
    window.addEventListener('touchstart', unlockHandler);
    window.addEventListener('click', unlockHandler);

    return () => { window.removeEventListener('touchstart', unlockHandler); window.removeEventListener('click', unlockHandler); };
  }, []);

  useEffect(() => { localStorage.setItem('nexa_config', JSON.stringify(config)); }, [config]);
  useEffect(() => { if (!user || user.role !== UserRole.ADMIN) return; const checkTime = () => { const now = new Date(); if (now.getHours() === 23 && now.getMinutes() === 0) { speakSystemMessage("Sir… 11 baj chuke hain. Kal aapko Encave Cafe duty bhi karni hai. Please rest kar lijiye… main yahin hoon.", user); } if (now.getHours() === 8 && now.getMinutes() === 0) { speakSystemMessage("Sir… aaj Encave Café duty hai, time se tayar ho jaiye.", user); } }; const interval = setInterval(checkTime, 60000); return () => clearInterval(interval); }, [user]);
  
  // Auto-play intro message when system is ready
  useEffect(() => {
    if (systemStatus === 'ready' && pendingIntro && user) {
      const introTimeout = setTimeout(() => {
        speakSystemMessage(pendingIntro, user);
        setPendingIntro(null);
      }, 500); // Small delay for UI transition

      return () => clearTimeout(introTimeout);
    }
  }, [systemStatus, pendingIntro, user]);

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
    setPendingIntro(null);
  
    setTimeout(async () => {
      try {
        let dynamicIntro = await generateIntroductoryMessage(profile);
        
        if (profile.role === UserRole.ADMIN) {
          try {
            const notifications: string[] = JSON.parse(localStorage.getItem('nexa_admin_notifications') || '[]');
            if (notifications.length > 0) {
              const names = notifications.map(n => n.match(/user '(.*?)'/)?.[1]).filter(Boolean as any as (x: string | undefined) => x is string);
              if (names.length > 0) {
                const uniqueNames = [...new Set(names)];
                let nameSummary = uniqueNames.length === 1 ? uniqueNames[0] : (uniqueNames.length === 2 ? `${uniqueNames[0]} aur ${uniqueNames[1]}` : `${uniqueNames.slice(0, -1).join(', ')}, aur ${uniqueNames[uniqueNames.length - 1]}`);
                const notificationPrefix = `Sir, aapke wapas aane ka intezaar tha. Ek choti si report hai... jab aap yahan nahi the, tab ${nameSummary} aapke baare mein pooch rahe the. Aap chinta mat kijiye, maine sab aache se, apne style me, sambhal liya hai.`;
                dynamicIntro = `${notificationPrefix}\n\n${dynamicIntro}`;
              }
              localStorage.removeItem('nexa_admin_notifications');
            }
          } catch(e) {
            console.error("Failed to process admin notifications", e);
            localStorage.removeItem('nexa_admin_notifications');
          }
        }
        
        setSystemStatus('ready');
        if (memoryRef.current.length === 0) { setPendingIntro(dynamicIntro); } 
        else { setHudState(HUDState.IDLE); }

      } catch (e: any) {
        console.error("Initialization Error:", e);
        const errorMessageString = e.toString();
        
        let friendlyError = 'Connection to NEXA Core failed. Please try again.';
        if (errorMessageString.includes('API_KEY_MISSING')) { friendlyError = 'SYSTEM OFFLINE: API Key not found. Ensure it is configured correctly in the Google AI Studio environment.'; } 
        else if (errorMessageString.includes('404')) { friendlyError = 'SYSTEM OFFLINE: The required AI model was not found. The system configuration may be outdated.'; }
        else if (errorMessageString.toLowerCase().includes('failed to fetch')) { friendlyError = 'NETWORK ERROR: Cannot connect to NEXA systems. Please check your internet connection.'; }
        setSystemError(friendlyError);
        setSystemStatus('error');
      }
    }, 500);
  };

  const handleLogout = () => { setUser(null); setSystemStatus('unauthenticated'); localStorage.removeItem('nexa_user'); setChatLog([]); memoryRef.current = []; setHudState(HUDState.IDLE); setPendingIntro(null); };
  
  const playAudio = (buffer: ArrayBuffer) => { if (!isProcessingRef.current) return; const ctx = getAudioContext(); if (ctx.state === 'suspended') ctx.resume(); try { const source = ctx.createBufferSource(); source.buffer = pcmToAudioBuffer(buffer, ctx); source.connect(ctx.destination); currentAudioSourceRef.current = source; source.onended = () => { currentAudioSourceRef.current = null; if(isProcessingRef.current) { setHudState(HUDState.IDLE); isProcessingRef.current = false; } }; source.start(); } catch (e) { throw e; } };
  
  const speakSystemMessage = async (displayText: string, currentUser: UserProfile | null) => {
    if (isProcessingRef.current || !currentUser) return;
    if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
    setHudState(HUDState.THINKING);
    isProcessingRef.current = true;
    setIsAudioLoading(true);

    try {
      const audioBuffer = await generateSpeech(displayText.replace(/Lohave/gi, 'लोहवे'), currentUser.role);
      setIsAudioLoading(false);

      const modelMessage: ChatMessage = { role: 'model', text: displayText, timestamp: Date.now() };
      memoryRef.current.push(modelMessage);
      saveMemory(currentUser);

      if (!isProcessingRef.current) return;

      if (audioBuffer) {
        setHudState(HUDState.SPEAKING);
        setChatLog(prev => [...prev, modelMessage]);
        playAudio(audioBuffer);
      } else {
        setChatLog(prev => [...prev, modelMessage]);
        setHudState(HUDState.IDLE);
        isProcessingRef.current = false;
      }
    } catch (e) {
      console.error("TTS failed for system message, falling back to text-only:", e);
      setIsAudioLoading(false);
  
      const modelMessage: ChatMessage = { role: 'model', text: displayText, timestamp: Date.now() };
      // This was being added twice in the original logic, fixed here.
      if (!memoryRef.current.find(m => m.timestamp === modelMessage.timestamp)) {
        memoryRef.current.push(modelMessage);
        saveMemory(currentUser);
      }
      setChatLog(prev => [...prev, modelMessage]);
      
      const audioFailMessage: ChatMessage = { 
        role: 'model', 
        text: `// Audio synthesis failed. Your API key might lack permissions for the Text-to-Speech model.`, 
        timestamp: Date.now() + 1 
      };
      memoryRef.current.push(audioFailMessage);
      saveMemory(currentUser);
      setChatLog(prev => [...prev, audioFailMessage]);
      
      setHudState(HUDState.IDLE);
      isProcessingRef.current = false;
    }
  };

  const handleMicClick = () => {
    unlockAudioContext();
    
    // CRITICAL FIX: Instant interruption logic
    if (isProcessingRef.current) {
      isProcessingRef.current = false;
      recognitionRef.current?.abort();
      if (currentAudioSourceRef.current) {
        currentAudioSourceRef.current.onended = null; // Prevent onended from firing
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current = null;
      }
      setHudState(HUDState.IDLE);
      setIsAudioLoading(false); // Ensure loading indicators are off
      return;
    }
  
    if (hudState === HUDState.LISTENING) {
      recognitionRef.current?.stop();
    } else {
      // Re-initialize every time for robustness against stale instances
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
  
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';
  
        recognition.onstart = () => {
          setHudState(HUDState.LISTENING);
        };
  
        recognition.onend = () => {
          if (listeningTimeoutRef.current) {
            clearTimeout(listeningTimeoutRef.current);
            listeningTimeoutRef.current = null;
          }
          setHudState(currentState =>
            currentState === HUDState.LISTENING ? HUDState.IDLE : currentState
          );
          recognitionRef.current = null;
        };
  
        recognition.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          let message = "An unknown microphone error occurred.";
          if (event.error === 'not-allowed') {
            message = "Microphone access denied. Please enable it in your browser settings.";
          } else if (event.error === 'no-speech') {
            message = "I didn't hear anything. Please try speaking again.";
          } else if (event.error === 'network') {
            message = "Network error with the speech service. Please check your connection.";
          }
          const errorMessage: ChatMessage = { role: 'model', text: `// MIC ERROR: ${message}`, timestamp: Date.now() };
          setChatLog(prev => [...prev, errorMessage]);
          setHudState(HUDState.IDLE);
        };
  
        recognition.onresult = (event: any) => {
          if (listeningTimeoutRef.current) {
            clearTimeout(listeningTimeoutRef.current);
            listeningTimeoutRef.current = null;
          }
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            processQuery(transcript);
          } else {
            console.warn("Speech recognition got a result, but the transcript was empty.");
            const errorMessage: ChatMessage = { role: 'model', text: `// MIC INFO: I heard something, but couldn't make it out. Please try again.`, timestamp: Date.now() };
            setChatLog(prev => [...prev, errorMessage]);
          }
        };
  
        recognition.start();
        if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
        listeningTimeoutRef.current = window.setTimeout(() => {
          console.warn("Listening timed out. Aborting.");
          recognition.abort();
        }, 15000);
  
      } else {
        const errorMessage: ChatMessage = { role: 'model', text: `// SYSTEM ERROR: Speech Recognition is not supported by your browser.`, timestamp: Date.now() };
        setChatLog(prev => [...prev, errorMessage]);
      }
    }
  };

  const handleApiError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    
    let detailedMessage = "Connection interrupted. Please check the browser console for details.";
    if (error && error.message) {
      if (error.message.includes("API key not valid")) {
          detailedMessage = "The API Key is invalid or has been revoked.";
      } else if (error.message.includes("billing")) {
          detailedMessage = "The project's billing is not enabled, which is required for this model.";
      } else if (error.message.includes("permission denied")) {
          detailedMessage = "The API Key lacks permission for the requested model.";
      } else if (error.message.includes("404")) {
          detailedMessage = "The requested model was not found (404).";
      } else {
          detailedMessage = error.message.length > 150 ? error.message.substring(0, 150) + '...' : error.message;
      }
    }
    
    const errorMessage: ChatMessage = { role: 'model', text: `SYSTEM ERROR: ${detailedMessage} [Context: ${context}]`, timestamp: Date.now() };
    setChatLog(prev => [...prev, errorMessage]);
    setHudState(HUDState.IDLE);
    isProcessingRef.current = false;
    setIsAudioLoading(false);
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
        
        if (audioBuffer) { 
          const finalState = nextState === 'ANGRY' ? HUDState.ANGRY : HUDState.SPEAKING;
          setHudState(finalState);
          setChatLog(prev => [...prev, modelMessage]); 
          playAudio(audioBuffer); 
        } else { 
          setChatLog(prev => [...prev, modelMessage]); 
          setHudState(HUDState.IDLE); 
          isProcessingRef.current = false; 
        }
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