import React from 'react';
import { HUDState } from '../types';

const MicIcon = ({ rotationDuration = '8s' }: { rotationDuration?: string }) => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="coreGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"><stop offset="0%" stopColor="#ffdd44" /><stop offset="100%" stopColor="#ffcc00" /></radialGradient></defs>
      <g style={{ transformOrigin: 'center', animation: `spin ${rotationDuration} linear infinite` }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="5.85 2" transform="rotate(-11.25 12 12)" /></g>
      <circle cx="12" cy="12" r="8" stroke="rgba(0,0,0,0.7)" strokeWidth="0.5" />
      <circle cx="12" cy="12" r="7.75" fill="url(#coreGradient)" />
    </svg>
);

const ControlDeck = ({ onMicClick, hudState, rotationSpeedMultiplier = 1, onToggleKeyboard, isKeyboardOpen }: any) => {
    const isListening = hudState === HUDState.LISTENING;
    const isWarning = hudState === HUDState.WARNING;
    const isProtect = hudState === HUDState.PROTECT;
    const isThinking = hudState === HUDState.THINKING;
    const isIdle = hudState === HUDState.IDLE;
    const isSpeaking = hudState === HUDState.SPEAKING;
    const isStudyHub = hudState === HUDState.STUDY_HUB;
    const isLateNight = hudState === HUDState.LATE_NIGHT;

    let baseDuration = 8;
    if (isThinking) baseDuration = 2;
    else if (isSpeaking || isListening) baseDuration = 4;
    else if (isWarning || isProtect) baseDuration = 0.5;
    else if (isStudyHub) baseDuration = 6;
    else if (isLateNight) baseDuration = 12; // Very slow for late night mode

    const finalDuration = `${baseDuration / rotationSpeedMultiplier}s`;
    
    const buttonScale = (isListening || isWarning || isProtect || isThinking || isLateNight) ? 'scale-110' : 'hover:scale-105 active:scale-95';
    
    let iconColorClass = 'text-nexa-cyan';
    if (isListening || isWarning || isProtect) iconColorClass = 'text-nexa-red';
    else if (isThinking) iconColorClass = 'text-nexa-yellow';
    else if (isStudyHub) iconColorClass = 'text-nexa-blue';
    else if (isLateNight) iconColorClass = 'text-purple-400';
    
    const pulseClass = (isListening || isWarning || isProtect || isThinking || isStudyHub || isLateNight) ? 'animate-pulse' : '';

    return (
        <div className="w-full h-24 shrink-0 bg-gradient-to-t from-zinc-100 via-zinc-100/80 to-transparent dark:from-black dark:via-black/80 dark:to-transparent z-40 relative flex items-center justify-center">
            {/* Supply Lines & Diamond Trigger */}
            <div className="absolute w-full top-1/2 -translate-y-1/2 h-[1px] px-4 pointer-events-none">
                <div className="w-full h-full flex justify-between items-center relative">
                    <div className="flex-1 h-full bg-gradient-to-r from-transparent via-zinc-300/50 to-zinc-400/70 dark:via-nexa-cyan/20 dark:to-nexa-cyan/40"></div>
                    
                    {/* Center Gap for Mic Button */}
                    <div className="w-24 flex-shrink-0"></div>

                    {/* Right Line with Keyboard Button */}
                    <div className="flex-1 h-full bg-gradient-to-l from-transparent via-zinc-300/50 to-zinc-400/70 dark:via-nexa-cyan/20 dark:to-nexa-cyan/40 relative">
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-auto">
                            <button 
                                onClick={onToggleKeyboard}
                                className={`w-4 h-4 rotate-45 border ${isKeyboardOpen ? 'bg-nexa-cyan border-nexa-cyan shadow-[0_0_10px_rgba(41,223,255,0.8)]' : 'bg-black border-nexa-cyan/50 hover:border-nexa-cyan hover:shadow-[0_0_8px_rgba(41,223,255,0.5)]'} transition-all duration-300`}
                            ></button>
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={onMicClick} className={`relative w-20 h-20 flex items-center justify-center rounded-full transition-all duration-300 group ${buttonScale} ${isIdle ? 'animate-breathing' : ''}`}>
                <div className="absolute inset-0 rounded-full bg-white dark:bg-black shadow-inner"></div>
                <div className={`relative z-10 transition-colors duration-300 ${iconColorClass} ${pulseClass} shadow-[0_0_20px_currentColor] group-hover:shadow-[0_0_30px_currentColor]`}><div className="scale-[1.4]"><MicIcon rotationDuration={finalDuration} /></div></div>
            </button>
        </div>
    );
};

export default ControlDeck;