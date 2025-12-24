import React, { useState, useEffect, useCallback, useRef } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import UserSettingsPanel from './components/UserSettingsPanel';
import StudyHubPanel from './components/StudyHubPanel';
import ManageAccountsModal from './components/ManageAccountsModal';
import InstallPWAButton from './components/InstallPWAButton';
import CriticalAlert from './components/CriticalAlert';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig } from './types';
import { generateTextResponseStream, generateIntroductoryMessage, generateAdminBriefing, getHinglishDateTime } from './services/geminiService';
import { playMicOnSound, playErrorSound, playSystemNotificationSound, playAngerEffect, stopAngerEffect } from './services/audioService';
import { appendMessageToMemory, clearAllMemory, getLocalMessages, getAdminNotifications, clearAdminNotifications, logAdminNotification, setUserPenitenceStatus, checkUserPenitenceStatus } from './services/memoryService';
import { speak as speakTextTTS, stop as stopTextTTS, speakIntro as speakIntroTTS } from './services/ttsService';
import ControlDeck from './components/ControlDeck';

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
  interface SpeechRecognitionEvent extends Event { results: any; }
  interface SpeechRecognitionErrorEvent extends Event { error: string; }
  interface Navigator {
      getBattery: () => Promise<any>;
      share: (data?: ShareData) => Promise<void>;
      vibrate(pattern: VibratePattern): boolean;
  }
}

// --- ICONS ---
const GearIcon = () => ( <svg className="w-5 h-5 text-nexa-red/80 dark:hover:text-white hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.065 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.572c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const LogoutIcon = () => ( <svg className="w-5 h-5 text-nexa-red/80 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const StudyIcon = () => ( <svg className="w-5 h-5 text-nexa-blue/80 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> );

const StatusBar = ({ userName, onLogout, onSettings, latency, onStudyHub, hudState }: any) => {
    const isAngry = hudState === HUDState.WARNING || hudState === HUDState.PROTECT;
    const titleClass = isAngry ? 'text-nexa-red drop-shadow-[0_0_10px_theme(colors.nexa.red)]' : 'text-zinc-900 dark:text-white/90 drop-shadow-[0_0_10px_rgba(41,223,255,0.5)]';
    const userClass = isAngry ? 'text-nexa-red' : 'text-nexa-cyan';
    const userBarClass = isAngry ? 'bg-nexa-red' : 'bg-nexa-cyan';
    
    return (
        <div className="w-full h-16 shrink-0 flex justify-between items-center px-6 border-b border-zinc-200 dark:border-nexa-cyan/10 bg-white/80 dark:bg-black/80 backdrop-blur-md z-40 relative">
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-start">
                    <div className={`text-[10px] ${userClass} font-mono tracking-widest uppercase transition-colors duration-300`}>{userName}</div>
                    <div className="flex gap-1 mt-1">
                        <div className={`w-8 h-1 ${userBarClass} shadow-[0_0_5px_currentColor] transition-colors duration-300`}></div>
                        <div className={`w-2 h-1 ${userBarClass}/50 transition-colors duration-300`}></div>
                        <div className={`w-1 h-1 ${userBarClass}/20 transition-colors duration-300`}></div>
                    </div>
                </div>
                {latency !== null && (
                    <div className="hidden sm:block text-[9px] font-mono text-zinc-500 dark:text-nexa-cyan/60 border-l border-zinc-200 dark:border-nexa-cyan/20 pl-4">
                        LATENCY: <span className="text-zinc-800 dark:text-white">{latency}ms</span>
                    </div>
                )}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className={`text-xl font-bold tracking-[0.3em] ${titleClass} transition-all duration-300`}>NEXA</div>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={onStudyHub} className="p-2 hover:bg-zinc-200 dark:hover:bg-nexa-blue/20 rounded-full transition-colors group relative"><StudyIcon /><span className="absolute -bottom-8 right-0 text-[9px] font-mono bg-nexa-blue text-black px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">STUDY HUB</span></button>
                <button onClick={onSettings} className="p-2 hover:bg-zinc-200 dark:hover:bg-nexa-cyan/10 rounded-full transition-colors"><GearIcon /></button>
                <button onClick={onLogout} className="p-2 hover:bg-red-500/10 rounded-full transition-colors"><LogoutIcon /></button>
            </div>
        </div>
    );
};

const KeyboardInput = ({ onSend, disabled, variant = 'cyan', isVisible }: any) => { 
  const [text, setText] = useState(''); 
  const isRed = variant === 'red';
  const borderColor = isRed ? 'border-red-500/80 focus:border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)] focus:shadow-[0_0_30px_rgba(220,38,38,0.6)]' : 'border-nexa-cyan/60 focus:border-nexa-cyan shadow-[0_0_15px_rgba(41,223,255,0.2)] focus:shadow-[0_0_30px_rgba(41,223,255,0.6)]';
  const textColor = isRed ? 'text-red-400 placeholder-red-500/60 drop-shadow-[0_0_2px_rgba(220,38,38,0.8)]' : 'text-nexa-cyan placeholder-nexa-cyan/60 drop-shadow-[0_0_2px_rgba(41,223,255,0.8)]';
  const btnColor = isRed ? 'text-red-500 drop-shadow-[0_0_5px_currentColor]' : 'text-nexa-cyan drop-shadow-[0_0_5px_currentColor]';
  const inputBg = 'bg-zinc-950/95 dark:bg-black/95';

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!text.trim() || disabled) return; onSend(text, 'text'); setText(''); }; 
  
  if (!isVisible) return null; 
  
  return ( 
    <form onSubmit={handleSubmit} className="w-full px-4 pb-4 z-50 relative shrink-0 animate-slide-up">
        <div className={`relative flex items-center group rounded-full transition-all duration-300 ${isRed ? 'hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'hover:shadow-[0_0_20px_rgba(41,223,255,0.3)]'}`}>
            <div className={`absolute inset-0 rounded-full blur-md transition-all opacity-60 ${isRed ? 'bg-red-900/60' : 'bg-nexa-cyan/30'}`}></div>
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={disabled ? "PROCESSING..." : (isRed ? "COMMAND OVERRIDE..." : "ENTER COMMAND...")} disabled={disabled} className={`relative w-full ${inputBg} border-2 ${borderColor} rounded-full px-6 py-3 pr-14 text-base font-mono ${textColor} focus:outline-none transition-all uppercase tracking-widest disabled:opacity-50 font-bold`} />
            <button type="submit" disabled={!text.trim() || disabled} className={`absolute right-3 p-3 rounded-full ${btnColor} hover:bg-white/10 active:scale-95 disabled:opacity-30 transition-all z-10`}><svg className="w-6 h-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg></button>
        </div>
    </form> 
  ); 
};

type TypingMessage = {
  id: number;
  fullText: string;
  audioDuration: number;
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingMessage, setTypingMessage] = useState<TypingMessage | null>(null);
  const [hudState, setHudState] = useState<HUDState>(HUDState.IDLE);
  const [config, setConfig] = useState<AppConfig>({ animationsEnabled: true, hudRotationSpeed: 1, micRotationSpeed: 1, theme: 'system', voiceQuality: 'intelligent' });
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isStudyHubOpen, setIsStudyHubOpen] = useState(false);
  const [isManageAccountsModalOpen, setIsManageAccountsModalOpen] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(true);
  const [latency, setLatency] = useState<number | null>(null);
  const [adminNameClickCount, setAdminNameClickCount] = useState(0);
  const [isProtocolXSettingVisible, setIsProtocolXSettingVisible] = useState(false);
  const [isProtocolXManuallyActive, setIsProtocolXManuallyActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [visualEffect, setVisualEffect] = useState<'none' | 'glitch' | 'alert'>('none');
  const [abuseWarningCount, setAbuseWarningCount] = useState(0);
  const [criticalAlert, setCriticalAlert] = useState<{ title: string; message: string; } | null>(null);
  const [isInPenitence, setIsInPenitence] = useState(false);
  const recognitionRef = useRef<any>(null);
  const introPlayedRef = useRef<boolean>(false);
  const remindersShownRef = useRef<{rest?: boolean, duty?: boolean}>({});
  const lastInputRef = useRef<{text: string, time: number}>({text: '', time: 0});
  const isProcessingRef = useRef<boolean>(false);

  const getIdleState = useCallback(() => {
    if (user && user.role === UserRole.ADMIN && isProtocolXManuallyActive) {
      return HUDState.LATE_NIGHT;
    }
    return HUDState.IDLE;
  }, [user, isProtocolXManuallyActive]);

  const handleLogout = useCallback(() => {
    stopTextTTS();
    stopAngerEffect();
    setUser(null);
    localStorage.removeItem('nexa_user_session');
    setMessages([]);
    setAbuseWarningCount(0);
    setIsSessionLocked(true);
    introPlayedRef.current = false;
    isProcessingRef.current = false;
    setIsInPenitence(false);
    setIsProtocolXManuallyActive(false);
    setIsProtocolXSettingVisible(false);
    setAdminNameClickCount(0);
  }, []);

  const handleFunctionCall = useCallback(async (fc: any) => {
    const { name, args } = fc;
    let confirmationText = "Okay sir, kaam ho gaya.";
  
    try {
      if (name === 'makeCall') {
        window.open(`tel:${(args.number || '').replace(/\D/g, '')}`);
        if ('vibrate' in navigator) navigator.vibrate(100);
        confirmationText = `Theek hai, ${args.number} par call kar rahi hoon.`;
      } else if (name === 'sendWhatsApp') {
        window.open(`https://wa.me/${(args.number || '').replace(/\D/g, '')}?text=${encodeURIComponent(args.message)}`, '_blank');
        if ('vibrate' in navigator) navigator.vibrate(100);
        confirmationText = `WhatsApp message taiyaar hai ${args.number} ke liye.`;
      } else if (name === 'openApp') {
        const appName = args.appName.toLowerCase();
        if (appName.includes('youtube')) { window.open('https://www.youtube.com', '_blank'); confirmationText = "Theek hai, YouTube open kar rahi hoon."; } 
        else if (appName.includes('chrome') || appName.includes('google')) { window.open('https://www.google.com', '_blank'); confirmationText = "Chrome open kar rahi hoon."; } 
        else if (appName.includes('whatsapp')) { window.location.href = 'whatsapp://'; confirmationText = "WhatsApp open kar rahi hoon."; } 
        else { confirmationText = `${args.appName} open kar rahi hoon... yeh action sirf conceptual hai.`; }
      } else if (name === 'setAlarm') { confirmationText = `Theek hai, ${args.time} ka alarm set ho gaya hai. Yeh ek simulated action hai.`; } 
      else if (name === 'findContact') {
        if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
          try {
            const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
            if (contacts.length > 0 && contacts[0].tel.length > 0) {
              const { name: contactNameArr, tel } = contacts[0];
              const number = tel[0];
              const contactName = contactNameArr[0] || args.name;
              const command = messages.slice().reverse().find(m => m.role === 'user')?.text.toLowerCase() || '';
              if (command.includes('call') || command.includes('phone')) {
                window.open(`tel:${number.replace(/\D/g, '')}`);
                if ('vibrate' in navigator) navigator.vibrate(100);
                confirmationText = `${contactName} mil gaya. Abhi call kar rahi hoon.`;
              } else if (command.includes('whatsapp') || command.includes('message')) {
                window.open(`https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${contactName}.`)}`, '_blank');
                if ('vibrate' in navigator) navigator.vibrate(100);
                confirmationText = `${contactName} mil gaya. WhatsApp open kar rahi hoon.`;
              } else { confirmationText = `Mujhe ${contactName} ka number mil gaya hai: ${number}. Ab kya karna hai?`; }
            } else { confirmationText = `Sorry, aapne jo contact select kiya, uske liye number nahi mila.`; }
          } catch (ex) { confirmationText = "Theek hai, maine contact search cancel kar diya hai."; }
        } else { confirmationText = "Sorry, main is browser par aapke contacts access nahi kar sakti. Aap number direct bata sakte hain."; }
      } else if (name === 'shareContent') {
        if (navigator.share) { await navigator.share({ title: 'Shared from NEXA', text: args.text, url: args.url }); if ('vibrate' in navigator) navigator.vibrate(100); confirmationText = 'Theek hai, share dialog open kar rahi hoon.'; } 
        else { confirmationText = "Sorry, aapka browser native share feature support nahi karta."; }
      } else if (name === 'setClipboardText') {
        if (navigator.clipboard) { await navigator.clipboard.writeText(args.text); if ('vibrate' in navigator) navigator.vibrate(100); confirmationText = 'Clipboard par copy ho gaya.'; } 
        else { confirmationText = "Sorry, main is browser par clipboard access nahi kar sakti."; }
      } else if (name === 'getClipboardText') {
        if (navigator.clipboard) { const text = await navigator.clipboard.readText(); confirmationText = text ? `Aapke clipboard mein yeh hai: "${text}"` : "Aapka clipboard khaali hai."; } 
        else { confirmationText = "Sorry, main is browser par clipboard access nahi kar sakti. Aapko permission deni pad sakti hai."; }
      } else if (name === 'getBatteryStatus') {
        if (navigator.getBattery) { const battery = await navigator.getBattery(); confirmationText = `Aapki battery ${Math.floor(battery.level * 100)} percent hai. Aur device abhi ${battery.charging ? 'charge ho raha hai' : 'charge nahi ho raha'}.`; } 
        else { confirmationText = "Sorry, main is device par battery information access nahi kar sakti."; }
      }
      const modelMsg: ChatMessage = { role: 'model', text: confirmationText, timestamp: Date.now() };
      speakTextTTS(user!, confirmationText, config, (audioDuration) => { setHudState(HUDState.SPEAKING); setTypingMessage({id: modelMsg.timestamp, fullText: modelMsg.text, audioDuration}); setMessages(prev => [...prev, modelMsg]); }, () => { setHudState(getIdleState()); setIsProcessing(false); isProcessingRef.current = false; setTypingMessage(null); });
    } catch (e) {
      console.error("Function call execution error", e);
      const errorMsg: ChatMessage = { role: 'model', text: "Sorry, woh action complete karne mein ek error aa gaya.", timestamp: Date.now() };
      speakTextTTS(user!, errorMsg.text, config, (audioDuration) => { setHudState(HUDState.WARNING); setTypingMessage({id: errorMsg.timestamp, fullText: errorMsg.text, audioDuration}); setMessages(prev => [...prev, errorMsg]); }, () => { setHudState(getIdleState()); setIsProcessing(false); isProcessingRef.current = false; setTypingMessage(null); });
    }
  }, [user, config, getIdleState, messages]);

  const processInput = useCallback(async (text: string, inputSource: 'text' | 'mic') => {
    if (!user || isProcessingRef.current) return;
    if (recognitionRef.current) try { recognitionRef.current.abort(); } catch(e) {}
    stopTextTTS();
    const normalizedText = text.trim().toLowerCase();
    const now = Date.now();
    if (normalizedText === lastInputRef.current.text && (now - lastInputRef.current.time) < 2000) return;

    isProcessingRef.current = true;
    setIsProcessing(true);
    setHudState(HUDState.THINKING);
    lastInputRef.current = { text: normalizedText, time: now };

    const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    await appendMessageToMemory(user, userMsg);
    
    setVisualEffect('none');
    const startTime = Date.now();
    
    try {
        const stream = await generateTextResponseStream(text, user, isProtocolXManuallyActive, abuseWarningCount);
        let fullText = '';
        let detectedFunctionCalls: any[] | null = null;
        let firstChunk = true;
        
        for await (const chunk of stream) {
            if (firstChunk) {
                setLatency(Date.now() - startTime);
                firstChunk = false;
            }
            if (chunk.functionCalls) { detectedFunctionCalls = chunk.functionCalls; break; }
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
            }
        }

        if (detectedFunctionCalls) { 
            handleFunctionCall(detectedFunctionCalls[0]); 
            return; 
        }

        const finalFullText = fullText.trim();
        let finalState = getIdleState();
        let shouldLockout = false;
        if (finalFullText.includes("[[STATE:WARNING]]")) { finalState = HUDState.WARNING; }
        if (finalFullText.includes("[[STATE:PROTECT]]")) { finalState = HUDState.PROTECT; }
        
        let cleanText = finalFullText.replace(/\[\[.*?\]\]/g, '').trim();

        if (finalState === HUDState.WARNING || finalState === HUDState.PROTECT) {
            playErrorSound();
            if (user.role === UserRole.USER) setAbuseWarningCount(c => c + 1);
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
            const alertTitle = finalState === HUDState.WARNING ? 'PROTOCOL WARNING' : 'PROTOCOL VIOLATION';
            setCriticalAlert({ title: alertTitle, message: cleanText });
            setTimeout(() => setCriticalAlert(null), 3500);
        }
        if (finalFullText.includes("[[VISUAL:GLITCH]]")) setVisualEffect('glitch');
        if (finalFullText.includes("[[VISUAL:ALERT]]")) setVisualEffect('alert');
        
        if (finalFullText.includes("[[ACTION:LOCKOUT]]")) {
            if (user.role === UserRole.USER) {
                shouldLockout = true;
                setUserPenitenceStatus(user, true);
                logAdminNotification(`User '${user.name}' (ID: ${user.mobile}) locked out. Input: '${text}'.`);
                setCriticalAlert({ title: 'SESSION TERMINATED', message: cleanText });
            }
        }

        if (finalFullText.includes("[[ACTION:APOLOGY_DETECTED]]")) {
            setIsInPenitence(false);
            cleanText = "Apology noted. Admin has been notified for review.";
            logAdminNotification(`User '${user.name}' has apologized. Review required.`);
        }

        if (!cleanText) { 
            setHudState(getIdleState()); 
            if (shouldLockout) setTimeout(handleLogout, 4000);
            setIsProcessing(false);
            isProcessingRef.current = false;
            return;
        }
        
        const modelMsgId = Date.now();
        const finalModelMsg: ChatMessage = { role: 'model', text: cleanText, timestamp: modelMsgId, isAngry: finalState === HUDState.WARNING || finalState === HUDState.PROTECT };
        await appendMessageToMemory(user, finalModelMsg);
        
        speakTextTTS(user, cleanText, config, 
            (audioDuration) => { 
                setHudState(finalState); 
                setTypingMessage({id: finalModelMsg.timestamp, fullText: finalModelMsg.text, audioDuration });
                setMessages(prev => [...prev, finalModelMsg]);
            }, 
            () => { 
                setHudState(getIdleState()); 
                setVisualEffect('none'); 
                if (shouldLockout) setTimeout(handleLogout, 2000); 
                setIsProcessing(false); 
                isProcessingRef.current = false;
                setTypingMessage(null);
            }, 
            finalModelMsg.isAngry
        );
    } catch (error: any) { 
        console.error("Input processing error:", error);
        let errorText = "System mein ek unknown error aa gaya. Please try again.";
        if (error.message.includes("TIMEOUT")) errorText = "Core connection time-out ho gaya. Network check karke dobara try karein.";
        else if (error.message.includes("CORE_OFFLINE")) errorText = "AI Core offline hai. API key check karein.";
        const errorMsg: ChatMessage = { role: 'model', text: errorText, timestamp: Date.now(), isAngry: true };
        
        speakTextTTS(user, errorText, config, 
            (audioDuration) => { 
                setMessages(prev => [...prev, errorMsg]); 
                setTypingMessage({id: errorMsg.timestamp, fullText: errorMsg.text, audioDuration });
                setHudState(HUDState.WARNING); 
                playErrorSound(); 
            }, 
            () => {
                setHudState(getIdleState());
                setIsProcessing(false);
                isProcessingRef.current = false;
                setTypingMessage(null);
            }, 
            true
        );
        setVisualEffect('none');
    }
  }, [user, getIdleState, isProtocolXManuallyActive, handleLogout, abuseWarningCount, config, handleFunctionCall]);

  useEffect(() => {
    const reminderInterval = setInterval(async () => {
        if (user?.role !== UserRole.ADMIN || isProcessingRef.current || !introPlayedRef.current) return;
        const now = new Date();
        const hour = now.getHours();
        if (hour === 23 && !remindersShownRef.current.rest) {
            const hinglishTime = await getHinglishDateTime(user);
            const timeText = hinglishTime ? `abhi samay ${hinglishTime.time} ho raha hai` : "raat ke 11 baj gaye hain";
            const reminderText = `Sir, ${timeText}. Main aapko aaraam karne ki salaah dungi. Aapki sehat meri priority hai.`;
            speakTextTTS(user, reminderText, config, () => {}, () => {});
            remindersShownRef.current.rest = true;
        }
        if (hour === 7 && !remindersShownRef.current.duty) {
             speakTextTTS(user, "Good morning Sir. Ek chhota sa reminder, aapke kaam intezaar kar rahe hain. Main online hoon aur assist karne ke liye taiyaar hoon.", config, () => {}, () => {});
             remindersShownRef.current.duty = true;
        }
        if (hour === 0) remindersShownRef.current = {};
    }, 60 * 1000);
    return () => clearInterval(reminderInterval);
  }, [user, config]);

  useEffect(() => {
    const body = document.body;
    body.classList.remove('danger-mode');
    if (hudState === HUDState.WARNING || hudState === HUDState.PROTECT) { body.classList.add('danger-mode'); playAngerEffect(); } 
    else { stopAngerEffect(); }
    return () => stopAngerEffect();
  }, [hudState]);
  
  useEffect(() => {
    const applyTheme = (theme: AppConfig['theme']) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(theme === 'system' ? systemTheme : theme);
    };
    applyTheme(config.theme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => { if (config.theme === 'system') applyTheme('system'); });
    return () => mediaQuery.removeEventListener('change', () => { if (config.theme === 'system') applyTheme('system'); });
  }, [config.theme]);

  useEffect(() => {
    const savedUser = localStorage.getItem('nexa_user_session');
    if (savedUser) { 
        const profile = JSON.parse(savedUser);
        setUser(profile); 
        setMessages(getLocalMessages(profile));
        if (profile.role === UserRole.USER) setIsInPenitence(checkUserPenitenceStatus(profile));
    }
    const savedConfig = localStorage.getItem('nexa_config');
    if (savedConfig) setConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) }));
  }, []);
  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.onstart = () => { stopTextTTS(); setHudState(HUDState.LISTENING); setIsListening(true); };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isProcessingRef.current) return;
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) processInput(transcript, 'mic');
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => { if (event.error !== 'no-speech') playErrorSound(); setHudState(getIdleState()); setIsListening(false); };
    recognition.onend = () => { setIsListening(false); setHudState(prevState => prevState === HUDState.LISTENING ? getIdleState() : prevState); };
    recognitionRef.current = recognition;
  }, [getIdleState, processInput]);

  const triggerIntro = useCallback(async (currentUser: UserProfile) => {
    if (introPlayedRef.current) return;
    introPlayedRef.current = true;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setHudState(HUDState.THINKING);

    if (currentUser.role === UserRole.ADMIN) {
        const notifications = await getAdminNotifications();
        if (notifications?.length > 0) {
            const briefingText = await generateAdminBriefing(notifications, currentUser);
            await clearAdminNotifications();
            const briefingMsg: ChatMessage = { role: 'model', text: briefingText, timestamp: Date.now(), isIntro: true };
            speakTextTTS(currentUser, briefingText, config, (audioDuration) => { setHudState(HUDState.SPEAKING); setTypingMessage({id: briefingMsg.timestamp, fullText: briefingMsg.text, audioDuration}); setMessages(prev => [...prev, briefingMsg]); }, () => { setIsProcessing(false); isProcessingRef.current = false; setHudState(getIdleState()); setTypingMessage(null); });
            return;
        }
    }
    try {
        let introText = await generateIntroductoryMessage(currentUser);
        const introMsg: ChatMessage = { role: 'model', text: introText, timestamp: Date.now(), isIntro: true };
        await appendMessageToMemory(currentUser, introMsg);
        speakIntroTTS(currentUser, introMsg.text, config, (audioDuration) => { setHudState(HUDState.SPEAKING); setTypingMessage({id: introMsg.timestamp, fullText: introMsg.text, audioDuration}); setMessages(prev => [...prev, introMsg]); }, () => { setIsProcessing(false); isProcessingRef.current = false; setHudState(getIdleState()); setTypingMessage(null); });
    } catch (e) { console.error("Intro Error", e); setIsProcessing(false); isProcessingRef.current = false; setHudState(getIdleState()); }
  }, [getIdleState, config]);

  const handleResumeSession = () => { setIsSessionLocked(false); if (user) setTimeout(() => triggerIntro(user), 500); };
  const handleLogin = (profile: UserProfile) => { setUser(profile); localStorage.setItem('nexa_user_session', JSON.stringify(profile)); setMessages(getLocalMessages(profile)); if (profile.role === UserRole.USER) setIsInPenitence(checkUserPenitenceStatus(profile)); setIsSessionLocked(false); setTimeout(() => triggerIntro(profile), 500); };
  
  const handleMicClick = () => {
    if (!recognitionRef.current) return;

    // If currently listening, stop recognition.
    if (isListening) {
        try { recognitionRef.current.stop(); } catch(e) {}
        return;
    }
    
    // If the system is processing (speaking or thinking), interrupt it.
    if (isProcessingRef.current) {
        stopTextTTS();
        isProcessingRef.current = false;
        setIsProcessing(false);
        setTypingMessage(null); // Immediately stop typewriter
        // The onEnd callback from TTS might fire later, but we are taking control now.
    }

    // After any necessary interruption, start listening.
    setIsKeyboardOpen(false);
    playMicOnSound();
    if ('vibrate' in navigator) navigator.vibrate(50);
    try {
        recognitionRef.current.start();
    } catch (e) {
        console.warn("Speech recognition start failed, possibly already stopping/starting.", e);
        playErrorSound();
    }
  };

  const handleAdminNameClick = () => setAdminNameClickCount(prev => { const newCount = prev + 1; if (newCount >= 5) setIsProtocolXSettingVisible(true); return newCount; });
  const handleProtocolXToggle = (isActive: boolean) => { setIsProtocolXManuallyActive(isActive); if (isActive) { playSystemNotificationSound(); if(user) speakTextTTS(user, "Protocol X Activated, Sir.", config, () => {}, () => {}); setHudState(HUDState.LATE_NIGHT); } else { setHudState(getIdleState()); } };
  const handleLockProtocolX = () => { setIsProtocolXManuallyActive(false); setIsProtocolXSettingVisible(false); setAdminNameClickCount(0); setHudState(HUDState.IDLE); playSystemNotificationSound(); };

  if (!user || isSessionLocked) return <Auth onLogin={handleLogin} onResume={handleResumeSession} isResuming={!!user} savedUserName={user?.name} />;
  const visualEffectClass = visualEffect === 'glitch' ? 'glitch-effect' : visualEffect === 'alert' ? 'alert-effect' : '';

  return ( <div className={`relative w-full h-full bg-zinc-100 dark:bg-black flex flex-col overflow-hidden transition-all duration-700 ${visualEffectClass}`}><div className="perspective-grid"></div><div className="vignette"></div><div className="scanlines"></div><StatusBar userName={user.name} onLogout={handleLogout} latency={latency} onSettings={() => user.role === UserRole.ADMIN ? setIsAdminPanelOpen(true) : setIsUserSettingsOpen(true)} onStudyHub={() => { setIsStudyHubOpen(true); setHudState(HUDState.STUDY_HUB); }} hudState={hudState} /><div className="flex-1 flex flex-col relative z-10 overflow-hidden"><div className="flex-[0.45] flex items-center justify-center min-h-[250px]"><HUD state={hudState} rotationSpeed={config.hudRotationSpeed} /></div><div className="flex-[0.55] flex justify-center w-full px-4 pb-4 overflow-hidden"><ChatPanel messages={messages} userName={user.name} userRole={user.role} hudState={hudState} typingMessage={typingMessage} onTypingComplete={() => setTypingMessage(null)} /></div></div><KeyboardInput onSend={(t: string) => processInput(t, 'text')} disabled={isProcessing} variant={user.role === UserRole.ADMIN ? 'red' : 'cyan'} isVisible={isKeyboardOpen} /><ControlDeck onMicClick={handleMicClick} hudState={hudState} rotationSpeedMultiplier={config.micRotationSpeed} onToggleKeyboard={() => setIsKeyboardOpen(!isKeyboardOpen)} isKeyboardOpen={isKeyboardOpen} />{user.role === UserRole.ADMIN ? (<AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} config={config} onConfigChange={(c) => { setConfig(c); localStorage.setItem('nexa_config', JSON.stringify(c)); }} onClearMemory={() => { clearAllMemory(user); window.location.reload(); }} onManageAccounts={() => setIsManageAccountsModalOpen(true)} onViewStudyHub={() => {setIsStudyHubOpen(true); setHudState(HUDState.STUDY_HUB);}} onAdminNameClick={handleAdminNameClick} isProtocolXSettingVisible={isProtocolXSettingVisible} isProtocolXManuallyActive={isProtocolXManuallyActive} onProtocolXToggle={handleProtocolXToggle} onLockProtocolX={handleLockProtocolX} />) : (<UserSettingsPanel isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} config={config} onConfigChange={(c) => { setConfig(c); localStorage.setItem('nexa_config', JSON.stringify(c)); }} user={user} />)}<StudyHubPanel isOpen={isStudyHubOpen} onClose={() => {setIsStudyHubOpen(false); setHudState(getIdleState()); }} user={user} onStartLesson={(subject) => processInput(`Start a lesson on ${subject.courseName}, course code ${subject.courseCode}`, 'text')} /><ManageAccountsModal isOpen={isManageAccountsModalOpen} onClose={() => setIsManageAccountsModalOpen(false)} /><InstallPWAButton /><CriticalAlert alert={criticalAlert} /></div> );
};

export default App;