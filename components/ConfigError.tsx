import React from 'react';

// FIX: Removed onKeySubmit prop as API key is now handled by environment variables.
interface ConfigErrorProps {}

// FIX: Changed component to be a display-only error message as per guidelines.
const ConfigError: React.FC<ConfigErrorProps> = () => {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 z-[100] text-center font-mono">
      <div className="w-full max-w-md border-2 border-nexa-red/50 bg-black/50 p-8 shadow-[0_0_40px_rgba(255,42,42,0.4)] animate-fade-in backdrop-blur-sm">
        <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-3 h-3 bg-nexa-red animate-pulse rounded-full"></div>
            <h1 className="text-xl font-bold text-nexa-red tracking-[0.2em]">SYSTEM OFFLINE</h1>
            <div className="w-3 h-3 bg-nexa-red animate-pulse rounded-full"></div>
        </div>
        <p className="text-zinc-300 text-md leading-relaxed">
            Configuration Error
        </p>
        <div className="my-6 h-[1px] bg-nexa-red/30 w-1/2 mx-auto"></div>
        <p className="text-zinc-300 text-sm leading-loose mb-6">
          Hello. I'm currently unable to connect to my core processing matrix. The Google Gemini API key is missing or invalid. Please ensure the API_KEY environment variable is set correctly by the application host.
        </p>
      </div>
    </div>
  );
};

export default ConfigError;
