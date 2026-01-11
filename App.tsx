import React, { useState, useEffect, useCallback, useRef } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import UserSettingsPanel from './components/UserSettingsPanel';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig } from './types';
import { generateTextResponse, generateIntroductoryMessage } from './services/geminiService';
import { playMicOnSound, playErrorSound, initGlobalAudio } from './services/audioService';
import { appendMessageToMemory, getLocalMessages } from './services/memoryService';
import { speak as speakTextTTS, stop as stopTextTTS, speakIntro as speakIntroTTS } from './services/ttsService';

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
  interface SpeechRecognitionEvent extends Event { results: any; }
}

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hudState, setHudState] = useState<HUDState>(HUDState.IDLE);
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('nexa_config');
    return saved ? JSON.parse(saved) : { animationsEnabled: true, hudRotationSpeed: 1, micRotationSpeed: 1, theme: 'dark' };
  });
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInputPreview, setUserInputPreview] = useState<string>('');
  const [textInputValue, setTextInputValue] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);
  const introPlayedRef = useRef<boolean>(false);

  // Theme Management Logic
  useEffect(() => {
    const applyTheme = (theme: AppConfig['theme']) => {
      const root = window.document.documentElement;
      let actualTheme = theme;
      
      if (theme === 'system') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      if (actualTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(config.theme);
    localStorage.setItem('nexa_config', JSON.stringify(config));

    // Listener for system changes
    if (config.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [config]);

  const handleLogout = useCallback(() => {
    stopTextTTS();
    setUser(null);
    localStorage.removeItem('nexa_user');
    setMessages([]);
    setIsSessionLocked(true);
    introPlayedRef.current = false;
  }, []);

  const processInput = useCallback(async (text: string) => {
    if (!user || isProcessing || !text.trim()) return;
    
    const inputToProcess = text.trim();
    setIsProcessing(true);
    setUserInputPreview(inputToProcess);
    setTextInputValue(''); 
    
    const userMsg: ChatMessage = { role: 'user', text: inputToProcess, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    await appendMessageToMemory(user, userMsg);
    setHudState(HUDState.THINKING);

    try {
        const responseData = await generateTextResponse(inputToProcess, user, false, 0);
        const cleanText = responseData.text.replace(/\[\[.*?\]\]/g, '').trim();
        const modelMsg: ChatMessage = { role: 'model', text: cleanText, timestamp: Date.now() };
        await appendMessageToMemory(user, modelMsg);
        
        speakTextTTS(user, cleanText, config,
            () => { 
                setMessages(prev => [...prev, modelMsg]); 
                setHudState(HUDState.SPEAKING); 
            },
            () => { 
                setHudState(HUDState.IDLE);
                setIsProcessing(false);
                setUserInputPreview('');
            },
            false
        );
    } catch (error) { 
        setHudState(HUDState.IDLE);
        playErrorSound();
        setIsProcessing(false);
    }
  }, [user, isProcessing, config]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.onstart = () => { stopTextTTS(); setHudState(HUDState.LISTENING); };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) processInput(transcript);
    };
    recognition.onerror = () => setHudState(HUDState.IDLE);
    recognition.onend = () => { if (hudState === HUDState.LISTENING) setHudState(HUDState.IDLE); };
    recognitionRef.current = recognition;
  }, [processInput, hudState]);

  const handleMicClick = async () => {
    await initGlobalAudio();
    if (isProcessing || !recognitionRef.current) return;
    if (hudState === HUDState.LISTENING) {
        recognitionRef.current.stop();
    } else {
        playMicOnSound();
        recognitionRef.current.start();
    }
  };

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('nexa_user', JSON.stringify(profile));
    setMessages(getLocalMessages(profile));
    setIsSessionLocked(false);
    if (!introPlayedRef.current) {
        generateIntroductoryMessage(profile).then(txt => {
            speakIntroTTS(profile, txt, config, () => setHudState(HUDState.SPEAKING), () => setHudState(HUDState.IDLE));
            introPlayedRef.current = true;
        });
    }
  };

  if (!user || isSessionLocked) return <Auth onLogin={handleLogin} isResuming={!!user} savedUserName={user?.name} />;

  return (
    <div className="relative w-full h-full bg-zinc-50 dark:bg-black transition-colors duration-700 flex flex-col overflow-hidden select-none">
      <div className="w-full h-16 sm:h-20 flex justify-between items-center px-4 sm:px-6 z-50">
        <button onClick={() => setIsUserSettingsOpen(true)} className="p-2 sm:p-3 bg-zinc-200/50 dark:bg-white/5 rounded-full hover:bg-zinc-300 dark:hover:bg-white/10 transition-colors">
          <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.065 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.572c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-black tracking-[0.3em] text-zinc-900 dark:text-white">NEXA</span>
          <span className="px-1.5 py-0.5 bg-red-600/20 border border-red-600/50 text-[9px] sm:text-[10px] font-bold text-red-500 rounded tracking-widest">LIVE</span>
        </div>
        <button onClick={handleLogout} className="p-2 sm:p-3 bg-zinc-200/50 dark:bg-white/5 rounded-full hover:bg-zinc-300 dark:hover:bg-white/10 transition-colors">
          <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative overflow-visible min-h-0">
        {/* Optimized Scaling: 0.7 for Mobile, 1.0 for Desktop/Tablet */}
        <div className="relative z-10 w-full flex items-center justify-center transform scale-[0.70] sm:scale-100 transition-transform duration-500 origin-center">
          <HUD state={hudState} onClick={handleMicClick} />
        </div>
        
        <div className="mt-2 sm:mt-4 text-center px-4 sm:px-8 animate-fade-in min-h-[60px] z-20">
          <p className="text-lg sm:text-xl font-medium text-zinc-800 dark:text-white tracking-wide max-w-md mx-auto leading-relaxed drop-shadow-sm line-clamp-2">
            {userInputPreview || (hudState === HUDState.LISTENING ? 'Listening...' : '')}
          </p>
          <div className={`mt-2 sm:mt-3 text-[9px] sm:text-[10px] font-mono tracking-[0.5em] uppercase transition-colors ${hudState === HUDState.LISTENING ? 'text-nexa-green' : hudState === HUDState.THINKING ? 'text-nexa-yellow' : 'text-zinc-400 dark:text-zinc-600'}`}>
            {hudState === HUDState.LISTENING ? 'Neural Input Active' : hudState === HUDState.THINKING ? 'Quantum Processing' : 'System Standby'}
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 pb-6 sm:pb-12 flex flex-col items-center gap-4 sm:gap-6 z-50">
        <div className="w-full max-w-lg relative">
          <input 
            type="text" 
            placeholder="Command Nexa..." 
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') processInput(textInputValue); }}
            className="w-full bg-zinc-200/50 dark:bg-white/5 border border-zinc-300 dark:border-white/10 rounded-full py-3 sm:py-4 px-5 sm:px-6 text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-nexa-cyan/30 transition-all backdrop-blur-xl"
          />
          <button 
            type="button"
            onClick={() => processInput(textInputValue)}
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-nexa-cyan transition-colors p-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
        <div className="text-[9px] sm:text-[10px] font-mono text-zinc-400 dark:text-zinc-700 tracking-[0.3em] sm:tracking-[0.4em] uppercase">
          Human Intelligence Engine &copy; 2025
        </div>
      </div>

      <UserSettingsPanel isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} config={config} onConfigChange={setConfig} />
    </div>
  );
};

export default App;