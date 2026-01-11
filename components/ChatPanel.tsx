import React, { useEffect, useRef, useCallback } from 'react';
import { ChatMessage, UserRole, HUDState } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  userName?: string;
  userRole?: UserRole;
  hudState?: HUDState;
  isAudioLoading?: boolean;
  onTypingComplete: () => void;
  onOptionClick?: (text: string) => void;
}

interface TypewriterProps {
  text: string;
  onComplete: () => void;
  onUpdate: () => void;
}

const TypewriterText: React.FC<TypewriterProps> = ({ text, onComplete, onUpdate }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let index = 0;
    const type = () => {
      if (index < text.length) {
        if (spanRef.current) spanRef.current.textContent = text.substring(0, index + 1);
        index++;
        onUpdate();
        timeoutRef.current = window.setTimeout(type, 30 + (Math.random() * 25 - 10));
      } else {
        onComplete();
      }
    };
    if (spanRef.current) spanRef.current.textContent = "";
    type();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [text, onComplete, onUpdate]);
  
  return <span ref={spanRef}></span>;
};


const ChatPanel: React.FC<ChatPanelProps> = ({ messages, userName, userRole = UserRole.USER, hudState, isAudioLoading, onTypingComplete, onOptionClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, hudState, scrollToBottom]);

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="w-full max-w-3xl h-full flex flex-col bg-white/50 dark:bg-black/40 border border-zinc-200 dark:border-nexa-cyan/20 rounded-lg backdrop-blur-md overflow-hidden relative">
      <div className="w-full h-6 bg-zinc-100/80 dark:bg-nexa-cyan/5 border-b border-zinc-200 dark:border-nexa-cyan/20 flex items-center justify-between px-3">
         <div className="text-[9px] text-zinc-500 dark:text-nexa-cyan/70 font-mono tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-nexa-red rounded-full animate-pulse"></span>
            /// CONVERSATION_LOG ///
         </div>
         <div className="text-[8px] text-nexa-red/70 font-mono">LIVE_FEED</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scroll-smooth no-scrollbar">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLastMessage = idx === messages.length - 1;
          const isModelLastMessage = isLastMessage && !isUser;

          // Hide the last model message while thinking to sync with audio
          if (isModelLastMessage && hudState === HUDState.THINKING) {
            return null;
          }

          let label = 'NEXA';
          if (isUser) {
            label = userRole === UserRole.ADMIN ? 'ADMIN' : (userName || 'USER').toUpperCase();
          }
          
          const shouldAnimate = isModelLastMessage && (hudState === HUDState.SPEAKING || hudState === HUDState.WARNING);
          const cleanTextForDisplay = msg.text.trim();

          return (
            <div key={msg.timestamp + idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-slide-up`}>
              <div className={`relative max-w-[90%] px-3 py-2 font-mono text-sm leading-relaxed ${isUser ? 'text-right border-r border-nexa-blue/30 bg-gradient-to-l from-nexa-blue/20 to-transparent' : 'text-left border-l border-nexa-cyan/30 bg-gradient-to-r from-nexa-cyan/10 to-transparent dark:from-nexa-cyan/5'}`}>
                <div className={`${isUser ? 'text-nexa-blue' : 'text-nexa-cyan'} dark:text-inherit text-zinc-800 dark:text-zinc-100`}>
                  {isUser ? (
                    <span className="whitespace-pre-wrap">{msg.text}</span>
                  ) : (
                    <>
                      {shouldAnimate ? (
                        <TypewriterText text={cleanTextForDisplay} onComplete={onTypingComplete} onUpdate={scrollToBottom} />
                      ) : (
                        <span className="whitespace-pre-wrap">{cleanTextForDisplay}</span>
                      )}
                    </>
                  )}
                </div>
                <div className={`text-[8px] uppercase tracking-widest mt-1 opacity-50 ${isUser ? 'text-nexa-blue' : 'text-nexa-cyan'}`}>
                   {label} &middot; {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}
                </div>
              </div>
              
              {/* Quick Response Chips - Render only for the last model message if suggestions exist */}
              {isModelLastMessage && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 max-w-[90%] animate-fade-in pl-2">
                      {msg.suggestions.map((option, i) => (
                          <button 
                            key={i} 
                            onClick={() => onOptionClick && onOptionClick(option)}
                            className="px-3 py-1.5 bg-black/40 border border-nexa-cyan/30 text-nexa-cyan text-[10px] font-mono uppercase tracking-wider hover:bg-nexa-cyan hover:text-black hover:border-nexa-cyan transition-all active:scale-95 rounded-sm backdrop-blur-sm"
                          >
                             {option}
                          </button>
                      ))}
                  </div>
              )}
            </div>
          );
        })}
        
        {hudState === HUDState.LISTENING && (
          <div className="flex justify-end animate-fade-in">
            <div className="relative max-w-[90%] px-3 py-2 font-mono text-sm leading-relaxed text-right border-r border-nexa-red/30 bg-gradient-to-l from-nexa-red/10 dark:from-nexa-red/5 to-transparent">
              <div className="text-nexa-red flex items-center justify-end gap-2">
                <div className="inline-flex items-center gap-1"><span className="w-1 h-1 bg-nexa-red/70 rounded-full animate-pulse [animation-delay:-0.3s]"></span><span className="w-1 h-1 bg-nexa-red/70 rounded-full animate-pulse [animation-delay:-0.15s]"></span><span className="w-1 h-1 bg-nexa-red/70 rounded-full animate-pulse"></span></div>
                <span>Listening</span>
              </div>
              <div className="text-[8px] uppercase tracking-widest mt-1 opacity-50 text-nexa-red">
                 {(userRole === UserRole.ADMIN ? 'ADMIN' : (userName || 'USER')).toUpperCase()} &middot; CAPTURING
              </div>
            </div>
          </div>
        )}

        {hudState === HUDState.THINKING && lastMessage?.role === 'user' && (
          <div className="flex justify-start animate-slide-up">
            <div className="relative max-w-[90%] px-3 py-2 font-mono text-sm leading-relaxed text-left border-l border-nexa-yellow/30 bg-gradient-to-r from-nexa-yellow/10 dark:from-nexa-yellow/5 to-transparent">
              <div className="text-nexa-yellow flex items-center gap-2">
                <span>NEXA is processing</span>
                <div className="inline-flex items-center gap-1"><span className="w-1 h-1 bg-nexa-yellow/70 rounded-full animate-pulse [animation-delay:-0.3s]"></span><span className="w-1 h-1 bg-nexa-yellow/70 rounded-full animate-pulse [animation-delay:-0.15s]"></span><span className="w-1 h-1 bg-nexa-yellow/70 rounded-full animate-pulse"></span></div>
              </div>
              <div className="text-[8px] uppercase tracking-widest mt-1 opacity-50 text-nexa-yellow">SYSTEM &middot; THINKING</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;