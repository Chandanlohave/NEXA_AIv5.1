import React from 'react';
import { AppConfig } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
  onClearMemory: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, config, onConfigChange, onClearMemory }) => {
  if (!isOpen) return null;

  const handleExportLogs = () => {
    const logs = {
      system: 'NEXA V9.0',
      timestamp: new Date().toISOString(),
      config: config,
      status: 'OPTIMAL'
    };
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NEXA_LOGS_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute top-16 right-4 w-72 bg-black/90 border border-nexa-cyan rounded-lg backdrop-blur-md p-4 z-50 shadow-[0_0_20px_rgba(41,223,255,0.3)]">
      <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
        <h2 className="text-nexa-cyan font-mono text-sm tracking-wider">ADMIN CONTROL</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">&times;</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-zinc-400 text-xs font-mono mb-1">HUD Rotation Speed</label>
          <input 
            type="range" 
            min="0.2" 
            max="5" 
            step="0.1"
            value={config.hudRotationSpeed}
            onChange={(e) => onConfigChange({...config, hudRotationSpeed: parseFloat(e.target.value)})}
            className="w-full accent-nexa-cyan" 
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-xs font-mono mb-1">Animations</label>
          <button 
            onClick={() => onConfigChange({...config, animationsEnabled: !config.animationsEnabled})}
            className={`w-full py-2 text-xs font-mono border ${config.animationsEnabled ? 'border-nexa-cyan text-nexa-cyan' : 'border-zinc-700 text-zinc-500'}`}
          >
            {config.animationsEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        <div className="pt-2 border-t border-zinc-800 space-y-2">
           <button 
             onClick={handleExportLogs}
             className="w-full py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-white text-xs font-mono transition-colors"
           >
             EXPORT SYSTEM LOGS
           </button>
           
           <button 
             className="w-full py-2 border border-zinc-700 text-zinc-500 cursor-not-allowed text-xs font-mono"
             disabled
           >
             MANAGE ACCOUNTS (LOCKED)
           </button>

           <button 
             onClick={onClearMemory}
             className="w-full py-2 bg-red-900/30 border border-red-500 text-red-500 hover:bg-red-900/50 text-xs font-mono transition-colors"
           >
             PURGE MEMORY BANKS
           </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;