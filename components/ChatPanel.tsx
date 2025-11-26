
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, UserRole, HUDState } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[]; // This will now only contain the current turn
  isSpeaking: boolean;
  userRole?: UserRole;
  hudState?: HUDState;
}

interface TypewriterProps {
  text: string;
  onTyping: () => void;
}

const TypewriterText: React.FC<TypewriterProps> = ({ text, onTyping }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText('');
    let index = 0;
    const speed = 40; 

    const intervalId = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
        onTyping();
      } else {
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text]);

  // Clean the text for display (remove SFX tags)
  const cleanText = displayedText.replace(/\[SFX:.*?\]/g, "").trim();
  return <span>{cleanText}</span>;
};

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, isSpeaking, userRole = UserRole.USER, hudState }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // If there are no messages for the current turn, don't render the panel
  if (messages.length === 0) return null;

  return (
    <div className="w-full max-w-3xl h-full flex flex-col bg-black/40 border border-nexa-cyan/20 rounded-lg backdrop-blur-md overflow-hidden relative">
      <div className="w-full h-6 bg-nexa-cyan/5 border-b border-nexa-cyan/20 flex items-center justify-between px-3">
         <div className="text-[9px] text-nexa-cyan/70 font-mono tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-nexa-cyan/70 rounded-full animate-pulse"></span>
            /// CURRENT_TURN ///
         </div>
         <div className="text-[8px] text-nexa-cyan/30 font-mono">LIVE_FEED</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scroll-smooth no-scrollbar">
        {/* Render only the messages for the current turn */}
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLastModelMessage = !isUser && idx === messages.length - 1;

          let label = 'NEXA';
          if (isUser) {
            label = userRole === UserRole.ADMIN ? 'ADMIN' : 'USER';
          }

          const shouldAnimate = isLastModelMessage && (isSpeaking || (hudState === HUDState.THINKING));
          
          // Clean text for non-animating model messages
          const cleanFullText = msg.text.replace(/\[SFX:.*?\]/g, "").trim();

          return (
            <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
              <div className={`relative max-w-[90%] px-3 py-2 font-mono text-sm leading-relaxed ${isUser ? 'text-right border-r border-nexa-blue/30 bg-gradient-to-l from-nexa-blue/5 to-transparent' : 'text-left border-l border-nexa-cyan/30 bg-gradient-to-r from-nexa-cyan/5 to-transparent'}`}>
                <div className={`${isUser ? 'text-nexa-blue' : 'text-nexa-cyan'}`}>
                  {isUser ? (
                    <span className="whitespace-pre-wrap">{msg.text}</span>
                  ) : (
                    <>
                      {shouldAnimate ? (
                        <TypewriterText text={msg.text} onTyping={scrollToBottom} />
                      ) : (
                        <span className="whitespace-pre-wrap">{cleanFullText}</span>
                      )}
                    </>
                  )}
                </div>
                <div className={`text-[8px] uppercase tracking-widest mt-1 opacity-50 ${isUser ? 'text-nexa-blue' : 'text-nexa-cyan'}`}>
                   [{label}] {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatPanel;
