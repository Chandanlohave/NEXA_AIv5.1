import React, { useMemo } from 'react';
import { HUDState } from '../types';

interface HUDProps {
  state: HUDState;
  rotationSpeed?: number;
}

const HUD: React.FC<HUDProps> = ({ state, rotationSpeed = 1 }) => {
  const animationsEnabled = rotationSpeed > 0;
  let primaryColor = "text-nexa-cyan";
  let borderColor = "border-nexa-cyan";
  let shadowColor = "shadow-nexa-cyan";
  let animationSpeedMultiplier = 1;
  let glitchClass = "";

  if (state === HUDState.LISTENING) {
    primaryColor = "text-nexa-red";
    borderColor = "border-nexa-red";
    shadowColor = "shadow-nexa-red";
    animationSpeedMultiplier = 1.2;
  } else if (state === HUDState.THINKING) {
    primaryColor = "text-nexa-yellow";
    borderColor = "border-nexa-yellow";
    shadowColor = "shadow-nexa-yellow";
    animationSpeedMultiplier = 2.0;
  } else if (state === HUDState.WARNING) { 
    primaryColor = "text-white";
    borderColor = "border-nexa-red";
    shadowColor = "shadow-nexa-red";
    animationSpeedMultiplier = 4.0;
    glitchClass = animationsEnabled ? "animate-glitch-shake" : "";
  } else if (state === HUDState.PROTECT) { 
    primaryColor = "text-nexa-cyan";
    borderColor = "border-red-500";
    shadowColor = "shadow-red-600";
    animationSpeedMultiplier = 5.0;
    glitchClass = animationsEnabled ? "animate-glitch-shake" : "";
  } else if (state === HUDState.LATE_NIGHT) { 
    primaryColor = "text-purple-300";
    borderColor = "border-purple-400/80";
    shadowColor = "shadow-purple-400";
    animationSpeedMultiplier = 0.5;
  } else if (state === HUDState.STUDY_HUB) { 
    primaryColor = "text-nexa-blue";
    borderColor = "border-nexa-blue";
    shadowColor = "shadow-nexa-blue";
    animationSpeedMultiplier = 0.8; 
  }

  const intenseGlow = `shadow-[0_0_30px_rgba(var(--tw-shadow-color),0.8)] ${shadowColor}`;

  return (
    <div className={`relative flex items-center justify-center transition-all duration-500 ${state === HUDState.SPEAKING || state === HUDState.WARNING || state === HUDState.PROTECT ? 'scale-105' : 'scale-100'} ${glitchClass}`}>
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
        <div className={`absolute inset-0 rounded-full ${intenseGlow} ${state === HUDState.WARNING || state === HUDState.PROTECT ? 'opacity-60 bg-red-600/20' : state === HUDState.LATE_NIGHT ? 'opacity-40 animate-pulse-fast' : 'opacity-20'} blur-xl transition-all duration-500`}></div>
        <div className={`absolute w-full h-full rounded-full border-2 border-dashed ${borderColor} opacity-60 ${animationsEnabled ? 'animate-spin-slow' : ''}`} style={{ animationDuration: `${12 / (rotationSpeed * animationSpeedMultiplier)}s` }}></div>
        <div className={`absolute w-[88%] h-[88%] rounded-full border-[0.5px] ${borderColor} opacity-40 ${animationsEnabled ? 'animate-spin' : ''}`} style={{ animationDuration: `${20 / (rotationSpeed * animationSpeedMultiplier)}s` }}></div>
        <div className={`absolute w-[78%] h-[78%] rounded-full border-2 ${borderColor} border-t-transparent border-l-transparent opacity-80 ${animationsEnabled ? 'animate-spin-reverse-slow' : ''}`} style={{ animationDuration: `${8 / (rotationSpeed * animationSpeedMultiplier)}s` }}></div>
        <div className={`absolute w-[45%] h-[45%] rounded-full border ${borderColor} transition-all duration-500 ${state === HUDState.PROTECT ? 'bg-red-600/40 animate-pulse' : ''}`}></div>
        <div className={`relative z-10 text-xl sm:text-2xl font-light tracking-[0.1em] ${primaryColor} font-mono transition-colors duration-500`}>
          {state === HUDState.PROTECT ? "SHIELD ACTIVE" : state.toUpperCase()}
        </div>
        {(state === HUDState.SPEAKING || state === HUDState.WARNING || state === HUDState.PROTECT || state === HUDState.LATE_NIGHT) && animationsEnabled && (
           <>
             <div className={`absolute inset-0 rounded-full border-2 ${borderColor} opacity-40 animate-ping`}></div>
             {state === HUDState.PROTECT && <div className={`absolute -inset-6 rounded-full border-4 border-nexa-cyan/20 animate-ping delay-150`}></div>}
           </>
        )}
      </div>
    </div>
  );
};

export default HUD;