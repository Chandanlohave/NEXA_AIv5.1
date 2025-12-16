import React, { useState, useEffect } from 'react';
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
import { playMicOnSound, playMicOffSound } from './services/audioService';
import { appendMessageToMemory, clearAllMemory, getAdminNotifications, getLocalMessages } from './services/memoryService';
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
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
            <div className="absolute w-full top-1/2 -translate-y-1/2 h-[1px] px-4">
                <div className="w-full h-full flex justify-between items-center">
                    <div className="flex-1 h-full bg-gradient-to-r from-transparent via-zinc-300/50 to-zinc-400/70 dark:via-nexa-cyan/20 dark:to-nexa-cyan/40"></div>
                    <div className="w-24 flex-shrink-0"></div>
                    <div className="flex-1 h-full bg-gradient-to-l from-transparent via-zinc-300/50 to-zinc-400/70 dark:via-nexa-cyan/20 dark:to-nexa-cyan/40"></div>
                </div>
            </div>

            <button
                onClick={onMicClick}
                className={`relative z-50 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-transform duration-200 ${buttonScale}`}
            >
                <div className={`absolute inset-0 rounded-full border-2 border-dashed ${iconColorClass === 'text-nexa-cyan' ? 'border-nexa-cyan' : iconColorClass === 'text-nexa-red' ? 'border-nexa-red' : iconColorClass === 'text-nexa-yellow' ? 'border-nexa-yellow' : 'border-nexa-blue'} opacity-60 animate-[spin_10s_linear_infinite]`}></div>
                <div className={`absolute inset-1 rounded-full border ${iconColorClass === 'text-nexa-cyan' ? 'border-nexa-cyan' : iconColorClass === 'text-nexa-red' ? 'border-nexa-red' : iconColorClass === 'text-nexa-yellow' ? 'border-nexa-yellow' : 'border-nexa-blue'} opacity-40`}></div>
                <div className={`absolute inset-0 rounded-full bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center`}>
                    <div className={`${iconColorClass} ${pulseClass}`}>
                         <MicIcon rotationDuration={finalDuration} />
                    </div>
                </div>
            </button>
        </div>
    );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [hudState, setHudState] = useState<HUDState>(HUDState.IDLE);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  
  // Modals
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStudyHub, setShowStudyHub] = useState(false);
  const [showManageAccounts, setShowManageAccounts] = useState(false);

  const [config, setConfig] = useState<AppConfig>({
    animationsEnabled: true,
    hudRotationSpeed: 1,
    micRotationSpeed: 1,
    theme: 'system'
  });

  // Load config theme
  useEffect(() => {
    const root = document.documentElement;
    if (config.theme === 'dark' || (config.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [config.theme]);

  // Init Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = false;
            recognitionInstance.lang = 'en-US'; // Default, will verify support for Hinglish/Hindi mixed if possible or just rely on EN
            
            recognitionInstance.onstart = () => {
                setHudState(HUDState.LISTENING);
                playMicOnSound();
            };

            recognitionInstance.onend = () => {
                // If we were listening, go to thinking (unless handled by result)
                // We'll let onresult handle the transition to thinking
            };

            recognitionInstance.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (transcript && transcript.trim()) {
                    handleUserMessage(transcript);
                } else {
                    setHudState(HUDState.IDLE);
                }
            };

            recognitionInstance.onerror = (event: any) => {
                console.error("Speech Error", event.error);
                setHudState(HUDState.IDLE);
                playMicOffSound(); // or error sound
            };

            setRecognition(recognitionInstance);
        }
    }
  }, [user]); // Re-init if user changes not strictly necessary but keeps scope fresh

  const handleLogin = async (profile: UserProfile) => {
    setUser(profile);
    
    // Load local history
    const history = getLocalMessages(profile);
    setMessages(history);

    // Initial greeting logic
    let greetingText = "";
    const introKey = `nexa_intro_${profile.mobile}_${new Date().toDateString()}`;
    
    if (profile.role === UserRole.ADMIN) {
        // Check for incidents
        const incidents = await getAdminNotifications();
        if (incidents.length > 0) {
            const briefing = await generateAdminBriefing(incidents);
            greetingText = briefing;
            // Clear incidents after briefing? Maybe manual clear is better in Admin Panel.
        } else {
            greetingText = await generateIntroductoryMessage(profile, null);
        }
    } else {
        if (history.length === 0) {
             greetingText = await generateIntroductoryMessage(profile, null);
        }
    }

    if (greetingText) {
        setHudState(HUDState.SPEAKING);
        // Add greeting to UI but don't save to history if it's just a transient greeting? 
        // Better to show it.
        const msg: ChatMessage = { role: 'model', text: greetingText, timestamp: Date.now() };
        setMessages(prev => [...prev, msg]);
        
        speakIntroTTS(profile, greetingText, introKey, 
            () => setHudState(HUDState.SPEAKING),
            () => setHudState(HUDState.IDLE)
        );
    }
  };

  const handleLogout = () => {
    stopTextTTS();
    setUser(null);
    setMessages([]);
    setHudState(HUDState.IDLE);
  };

  const handleMicClick = () => {
    if (!recognition) {
        alert("Voice recognition not supported in this browser.");
        return;
    }
    
    if (hudState === HUDState.IDLE || hudState === HUDState.SPEAKING) {
        stopTextTTS(); // Stop speaking if speaking
        recognition.start();
    } else if (hudState === HUDState.LISTENING) {
        recognition.stop();
        playMicOffSound();
    }
  };

  const handleUserMessage = async (text: string) => {
    if (!user) return;
    
    setHudState(HUDState.THINKING);
    
    // 1. Add User Message
    const userMsg: ChatMessage = { role: 'user', text: text, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    await appendMessageToMemory(user, userMsg);

    // 2. Call Gemini
    const startTime = Date.now();
    const responseText = await generateTextResponse(text, user);
    const endTime = Date.now();
    setLatency(endTime - startTime);

    // 3. Add Model Message
    const modelMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
    setMessages(prev => [...prev, modelMsg]);
    await appendMessageToMemory(user, modelMsg);

    // 4. TTS & HUD Update
    // Check for special "angry" or "warning" keywords in response to set HUD state?
    // The instructions mentioned ANGRY -> WARNING. 
    // Let's stick to SPEAKING mostly.
    
    speakTextTTS(user, responseText, 
        () => setHudState(HUDState.SPEAKING),
        () => setHudState(HUDState.IDLE)
    );
  };
  
  const handleStartLesson = async (subject: StudyHubSubject) => {
      if (!user) return;
      setShowStudyHub(false);
      setHudState(HUDState.STUDY_HUB);
      
      const prompt = `Starting lesson for ${subject.courseCode}: ${subject.courseName}`;
      // Add fake user message to context
      const userMsg: ChatMessage = { role: 'user', text: prompt, timestamp: Date.now() };
      setMessages(prev => [...prev, userMsg]);
      await appendMessageToMemory(user, userMsg);
      
      // Get Tutor Response
      const lessonText = await generateTutorLesson(subject, user);
      
      const modelMsg: ChatMessage = { role: 'model', text: lessonText, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
      await appendMessageToMemory(user, modelMsg);
      
      speakTextTTS(user, lessonText,
          () => setHudState(HUDState.STUDY_HUB), // Keep blue state
          () => setHudState(HUDState.IDLE)
      );
  };

  const clearMemory = async () => {
      if (user) {
          await clearAllMemory(user);
          setMessages([]);
      }
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-100 dark:bg-black overflow-hidden transition-colors duration-500 font-sans selection:bg-nexa-cyan/30">
      <StatusBar 
         userName={user.name} 
         onLogout={handleLogout} 
         onSettings={() => user.role === UserRole.ADMIN ? setShowAdminPanel(true) : setShowSettings(true)}
         onStudyHub={() => setShowStudyHub(true)}
         latency={latency}
      />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(41,223,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(41,223,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        {/* Central HUD Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-4xl mx-auto">
            <div className="mt-4 mb-2 shrink-0">
                <HUD state={hudState} rotationSpeed={config.hudRotationSpeed} />
            </div>
            
            <div className="flex-1 w-full px-4 min-h-0 mb-4">
                <ChatPanel 
                    messages={messages} 
                    userName={user.name} 
                    userRole={user.role} 
                    hudState={hudState}
                    onTypingComplete={() => {}} 
                />
            </div>
        </div>
      </main>

      <ControlDeck 
          onMicClick={handleMicClick} 
          hudState={hudState} 
          rotationSpeedMultiplier={config.micRotationSpeed} 
      />

      {/* Panels/Modals */}
      <AdminPanel 
          isOpen={showAdminPanel} 
          onClose={() => setShowAdminPanel(false)} 
          config={config} 
          onConfigChange={setConfig}
          onClearMemory={clearMemory}
          onManageAccounts={() => setShowManageAccounts(true)}
          onViewStudyHub={() => setShowStudyHub(true)}
      />
      
      <UserSettingsPanel 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)} 
          config={config} 
          onConfigChange={setConfig} 
      />

      <StudyHubPanel
          isOpen={showStudyHub}
          onClose={() => setShowStudyHub(false)}
          user={user}
          onStartLesson={handleStartLesson}
      />

      <ManageAccountsModal
          isOpen={showManageAccounts}
          onClose={() => setShowManageAccounts(false)}
      />
      
      {/* Install Button if PWA */}
      <InstallPWAButton />
    </div>
  );
};

export default App;