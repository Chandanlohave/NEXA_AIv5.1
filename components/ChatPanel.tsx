import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ChatMessage, UserRole, HUDState } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  userName?: string;
  userRole?: UserRole;
  hudState?: HUDState;
  typingMessage: { id: number; fullText: string; audioDuration: number; } | null;
  onTypingComplete: () => void;
}

const Typewriter: React.FC<{ fullText: string, duration: number, onComplete: () => void, isUser: boolean }> = ({ fullText, duration, onComplete, isUser }) => {
    const [displayedWords, setDisplayedWords] = useState<string[]>([]);
    const wordsRef = useRef<string[]>(fullText.split(' '));
    const [isComplete, setIsComplete] = useState(false);
    
    // Calculate speed based on word count. 
    // Average speaking rate is ~130-150 wpm. 
    // We map the audio duration to the number of words to create a sync effect.
    const wordCount = wordsRef.current.length;
    // Calculate MS per word, but clamp it so it's not too slow or too fast visually
    // If duration is missing (0), default to fast typing.
    const intervalTime = duration > 0 ? (duration * 1000) / wordCount : 50;
    
    const textStyle = isUser 
        ? 'text-nexa-blue' 
        : (fullText.includes('himmat kaise hui') ? 'text-nexa-red' : 'text-nexa-cyan');

    useEffect(() => {
        setDisplayedWords([]);
        setIsComplete(false);
        wordsRef.current = fullText.split(' ');
        let currentWordIndex = 0;

        const interval = setInterval(() => {
            if (currentWordIndex < wordsRef.current.length) {
                setDisplayedWords(prev => [...prev, wordsRef.current[currentWordIndex]]);
                currentWordIndex++;
            } else {
                clearInterval(interval);
                setIsComplete(true);
                onComplete();
            }
        }, intervalTime);

        return () => clearInterval(interval);
    }, [fullText, duration, onComplete, intervalTime]);

    return (
        <div 
            className={`whitespace-pre-wrap font-sans font-medium tracking-wide leading-relaxed dark:text-zinc-100 ${textStyle}`}
            style={{ textShadow: `0 0 10px ${isUser ? 'rgba(0,119,255,0.2)' : 'rgba(41,223,255,0.2)'}` }}
        >
            {displayedWords.join(' ')}
            {!isComplete && <span className="inline-block w-2 h-4 bg-current animate-blink ml-1 align-middle"></span>}
        </div>
    );
};


const ChatPanel: React.FC<ChatPanelProps> = ({ messages, userName, userRole = UserRole.USER, hudState, typingMessage, onTypingComplete }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAngry = hudState === HUDState.WARNING || hudState === HUDState.PROTECT;

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, hudState, scrollToBottom, typingMessage]);
  
  const headerBorderColor = isAngry ? 'dark:border-nexa-red/20' : 'dark:border-nexa-cyan/20';
  const headerBgColor = isAngry ? 'dark:bg-nexa-red/5' : 'dark:bg-nexa-cyan/5';
  const conversationLogColor = isAngry ? 'dark:text-nexa-red/80' : 'dark:text-nexa-cyan/70';

  return (
    <div className="w-full max-w-3xl h-full flex flex-col bg-white/50 dark:bg-black/40 border border-zinc-200 dark:border-nexa-cyan/20 rounded-lg backdrop-blur-md overflow-hidden relative">
      <div className={`w-full h-8 bg-zinc-100/80 ${headerBgColor} border-b border-zinc-200 ${headerBorderColor} flex items-center justify-between px-3 transition-colors duration-300`}>
         <div className={`text-[10px] text-zinc-500 ${conversationLogColor} font-mono tracking-widest uppercase flex items-center gap-2 transition-colors duration-300`}>
            <span className={`w-1.5 h-1.5 ${isAngry ? 'bg-white' : 'bg-nexa-red'} rounded-full animate-pulse`}></span>
            /// SECURE_CHANNEL_ESTABLISHED ///
         </div>
         <div className={`text-[9px] ${isAngry ? 'text-white' : 'text-nexa-red/70'} font-mono transition-colors duration-300`}>LIVE_FEED</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scroll-smooth no-scrollbar">
        {messages.length === 0 && !typingMessage && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 pointer-events-none">
                 <div className="text-[10px] font-mono text-nexa-cyan uppercase tracking-[0.5em] mb-2">System Ready</div>
                 <div className="w-16 h-[1px] bg-nexa-cyan/50"></div>
            </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          let label = 'NEXA';
          if (isUser) {
            label = userRole === UserRole.ADMIN ? 'ADMIN' : (userName || 'USER').toUpperCase();
          }

          const isCurrentlyTyping = typingMessage?.id === msg.timestamp;

          return (
            <div key={msg.timestamp + idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
              <div className={`relative max-w-[85%] px-4 py-2 text-sm md:text-base rounded-lg shadow-sm border ${isUser ? 'text-right bg-nexa-blue/5 border-nexa-blue/20' : 'text-left bg-nexa-cyan/5 border-nexa-cyan/20'}`}>
                {isCurrentlyTyping ? (
                    <Typewriter 
                        fullText={typingMessage.fullText} 
                        duration={typingMessage.audioDuration} 
                        onComplete={onTypingComplete}
                        isUser={isUser}
                    />
                ) : (
                    <div 
                        className={`whitespace-pre-wrap font-sans font-medium tracking-wide leading-relaxed dark:text-zinc-100 ${isUser ? 'text-nexa-blue' : (msg.isAngry ? 'text-nexa-red' : 'text-nexa-cyan')}`}
                        style={{ textShadow: `0 0 10px ${isUser ? 'rgba(0,119,255,0.2)' : 'rgba(41,223,255,0.2)'}` }}
                    >
                        {msg.text}
                    </div>
                )}
                <div className={`text-[9px] font-mono uppercase tracking-widest mt-2 pt-1 border-t ${isUser ? 'border-nexa-blue/10' : 'border-nexa-cyan/10'} opacity-60 ${isUser ? 'text-nexa-blue' : 'text-nexa-cyan'}`}>
                   {label} &middot; {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}
                </div>
              </div>
            </div>
          );
        })}
        
        {hudState === HUDState.LISTENING && (
          <div className="flex justify-end animate-fade-in">
            <div className="relative max-w-[90%] px-3 py-2 font-mono text-sm leading-relaxed text-right border-r border-nexa-red/30 bg-nexa-red/5">
              <div className="text-nexa-red flex items-center justify-end gap-2">
                <div className="inline-flex items-center gap-1"><span className="w-1 h-1 bg-nexa-red/70 rounded-full animate-pulse [animation-delay:-0.3s]"></span><span className="w-1 h-1 bg-nexa-red/70 rounded-full animate-pulse [animation-delay:-0.15s]"></span><span className="w-1 h-1 bg-nexa-red/70 rounded-full animate-pulse"></span></div>
                <span>LISTENING...</span>
              </div>
            </div>
          </div>
        )}

        {hudState === HUDState.THINKING && !typingMessage && (
          <div className="flex justify-start animate-slide-up">
            <div className="relative max-w-[90%] px-3 py-2 font-mono text-sm leading-relaxed text-left border-l border-nexa-yellow/30 bg-nexa-yellow/5">
              <div className="text-nexa-yellow flex items-center gap-2">
                <span>PROCESSING...</span>
                <div className="inline-flex items-center gap-1"><span className="w-1 h-1 bg-nexa-yellow/70 rounded-full animate-pulse [animation-delay:-0.3s]"></span><span className="w-1 h-1 bg-nexa-yellow/70 rounded-full animate-pulse [animation-delay:-0.15s]"></span><span className="w-1 h-1 bg-nexa-yellow/70 rounded-full animate-pulse"></span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;