import React from 'react';

const ConfigError: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 z-[100] text-center font-mono">
      <div className="w-full max-w-md border-2 border-red-500 bg-red-900/20 p-8 shadow-[0_0_40px_rgba(255,42,42,0.5)]">
        <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-3 h-3 bg-red-500 animate-pulse rounded-full"></div>
            <h1 className="text-xl font-bold text-red-500 tracking-[0.2em]">SYSTEM ALERT</h1>
            <div className="w-3 h-3 bg-red-500 animate-pulse rounded-full"></div>
        </div>
        <p className="text-zinc-300 text-lg leading-relaxed">
            API Key Configuration Error
        </p>
        <div className="my-6 h-[1px] bg-red-500/30 w-1/2 mx-auto"></div>
        <p className="text-zinc-400 text-sm leading-loose">
          The <code className="bg-red-500/20 text-white px-2 py-1">API_KEY</code> environment variable is missing or invalid.
        </p>
        <p className="text-zinc-500 text-xs mt-4 leading-normal">
          To resolve this, the administrator (Chandan) must set the <code className="bg-zinc-700 text-white px-1">VITE_API_KEY</code> in the deployment environment settings (e.g., Vercel, Netlify, Firebase).
        </p>
        <p className="mt-8 text-xs text-red-500/50">SYSTEM OFFLINE</p>
      </div>
    </div>
  );
};

export default ConfigError;
