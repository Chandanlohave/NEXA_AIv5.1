import React from 'react';

interface CriticalAlertProps {
  alert: {
    title: string;
    message: string;
  } | null;
}

const CriticalAlert: React.FC<CriticalAlertProps> = ({ alert }) => {
  if (!alert) return null;

  return (
    <div className="fixed inset-0 bg-red-950/20 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in" style={{ animationDuration: '0.2s' }}>
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="relative w-full max-w-lg text-center border-2 border-red-500 bg-black/80 shadow-[0_0_50px_rgba(255,42,42,0.6)] animate-glitch-shake p-8">
        <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-red-500 animate-pulse"></div>
        <div className="absolute -top-4 -right-4 w-12 h-12 border-t-2 border-r-2 border-red-500 animate-pulse"></div>
        <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-2 border-l-2 border-red-500 animate-pulse"></div>
        <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-red-500 animate-pulse"></div>

        <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <h1 className="text-3xl font-black text-red-400 tracking-[0.3em] uppercase drop-shadow-[0_0_10px_currentColor]">
            {alert.title}
        </h1>
        <p className="mt-4 text-white/90 font-mono text-lg leading-relaxed">
            {alert.message}
        </p>
      </div>
    </div>
  );
};

export default CriticalAlert;