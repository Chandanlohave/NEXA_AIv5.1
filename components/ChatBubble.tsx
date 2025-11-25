import React, { useEffect, useState } from 'react';

interface ChatBubbleProps {
  text: string;
  isVisible: boolean;
  onComplete?: () => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ text, isVisible, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    if (!isVisible) {
      setDisplayedText('');
      return;
    }

    setDisplayedText('');
    let index = 0;
    
    // Calculate speed based on length to sync roughly with audio start 
    // (Actual sync handled by parent, this is just visual typewriting)
    const speed = 30; 

    const intervalId = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(intervalId);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, isVisible, onComplete]);

  if (!isVisible && !displayedText) return null;

  return (
    <div className="w-[85%] mx-auto mt-8 p-4 bg-black/60 border border-nexa-cyan/50 rounded-lg backdrop-blur-sm shadow-[0_0_15px_rgba(41,223,255,0.2)]">
      <p className="font-mono text-nexa-cyan text-lg leading-relaxed shadow-black drop-shadow-md">
        {displayedText}
        <span className="inline-block w-2 h-4 ml-1 bg-nexa-cyan animate-blink align-middle"></span>
      </p>
    </div>
  );
};

export default ChatBubble;