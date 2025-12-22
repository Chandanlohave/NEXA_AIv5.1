import React, { useState } from 'react';
import { AppConfig } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
  onClearMemory: () => void;
  onManageAccounts: () => void;
  onViewStudyHub: () => void;
  onAdminNameClick: () => void;
  isProtocolXSettingVisible: boolean;
  isProtocolXManuallyActive: boolean;
  onProtocolXToggle: (isActive: boolean) => void;
  onLockProtocolX: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen, 
  onClose, 
  config, 
  onConfigChange, 
  onClearMemory, 
  onManageAccounts, 
  onViewStudyHub,
  onAdminNameClick,
  isProtocolXSettingVisible,
  isProtocolXManuallyActive,
  onProtocolXToggle,
  onLockProtocolX
}) => {
  const [newApiKey, setNewApiKey] = useState('');

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

  const handleSaveApiKey = () => {
    if (newApiKey.trim().length > 10) {
        localStorage.setItem('nexa_admin_api_key', newApiKey.trim());
        alert('API Key updated. The app will now reload to use the new key.');
        window.location.reload();
    } else {
        alert('Please enter a valid API key.');
    }
  };

  const ThemeButton: React.FC<{label: string, value: AppConfig['theme']}> = ({ label, value }) => {
    const isActive = config.theme === value;
    return (
      <button 
        onClick={() => onConfigChange({...config, theme: value})}
        className={`flex-1 py-2 text-xs font-mono uppercase transition-colors ${isActive ? 'bg-nexa-cyan text-black' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-nexa-cyan/50'}`}
      >
        {label}
      </button>
    )
  };

  return (
    <div className="absolute top-16 right-4 w-72 bg-white/80 dark:bg-black/90 border border-zinc-300 dark:border-nexa-cyan rounded-lg backdrop-blur-md p-4 z-50 shadow-[0_0_20px_rgba(41,223,255,0.3)] animate-fade-in">
      <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div onClick={onAdminNameClick} className="cursor-pointer group">
          <h2 className="text-nexa-cyan font-mono text-sm tracking-wider">ADMIN CONTROL</h2>
          <p className="text-zinc-500 text-[9px] font-mono group-hover:text-nexa-cyan transition-colors">Chandan Lohave // Level: ∞</p>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-black dark:hover:text-white text-2xl leading-none">&times;</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-zinc-700 dark:text-zinc-400 text-xs font-mono mb-1">Appearance</label>
          <div className="flex gap-1">
            <ThemeButton label="Light" value="light" />
            <ThemeButton label="Dark" value="dark" />
            <ThemeButton label="System" value="system" />
          </div>
        </div>

        <div>
          <label className="block text-zinc-700 dark:text-zinc-400 text-xs font-mono mb-1">HUD Rotation Speed</label>
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
          <label className="block text-zinc-700 dark:text-zinc-400 text-xs font-mono mb-1">Mic Rotation Speed</label>
          <input 
            type="range" 
            min="0.2" 
            max="5" 
            step="0.1"
            value={config.micRotationSpeed || 1}
            onChange={(e) => onConfigChange({...config, micRotationSpeed: parseFloat(e.target.value)})}
            className="w-full accent-nexa-cyan" 
          />
        </div>

        <div>
          <label className="block text-zinc-700 dark:text-zinc-400 text-xs font-mono mb-1">Animations</label>
          <button 
            onClick={() => onConfigChange({...config, animationsEnabled: !config.animationsEnabled})}
            className={`w-full py-2 text-xs font-mono border ${config.animationsEnabled ? 'border-nexa-cyan text-nexa-cyan' : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-500'}`}
          >
            {config.animationsEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
          <p className="text-zinc-500 text-[10px] font-mono mt-1 text-center">Toggles HUD rotation &amp; effects.</p>
        </div>

        {isProtocolXSettingVisible && (
          <div className="pt-3 mt-2 border-t border-red-500/30 space-y-3 bg-red-900/10 p-2 animate-fade-in">
              <label className="flex justify-between items-center text-red-400 text-xs font-mono cursor-pointer">
                  <span>PROTOCOL X</span>
                  <div className="relative">
                      <input
                          type="checkbox"
                          checked={isProtocolXManuallyActive}
                          onChange={(e) => onProtocolXToggle(e.target.checked)}
                          className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </div>
              </label>
              
              <button 
                onClick={onLockProtocolX}
                className="w-full py-1 bg-red-950/50 border border-red-500/30 text-red-500/70 hover:text-red-500 hover:border-red-500 text-[10px] font-mono uppercase tracking-widest transition-all"
              >
                LOCK & HIDE
              </button>
              
              <p className="text-red-500/60 text-[9px] font-mono text-center">
                  Manual override active. Click LOCK to hide.
              </p>
          </div>
        )}

        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <div>
            <label className="block text-zinc-700 dark:text-zinc-400 text-xs font-mono mb-1">Update Admin API Key</label>
            <div className="flex gap-2">
              <input 
                type="password"
                placeholder="Enter new Gemini API Key"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                className="flex-1 bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white px-2 py-1 text-xs focus:border-nexa-cyan outline-none"
              />
              <button onClick={handleSaveApiKey} className="px-3 bg-nexa-cyan text-black font-bold text-xs hover:bg-white transition-colors">SAVE</button>
            </div>
            <p className="text-zinc-500 dark:text-zinc-600 text-[10px] font-mono mt-1">Saves key to browser. Reloads app.</p>
          </div>

           <button 
             onClick={handleExportLogs}
             className="w-full py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white text-xs font-mono transition-colors"
           >
             EXPORT SYSTEM LOGS
           </button>
           
           <button 
             onClick={onManageAccounts}
             className="w-full py-2 border border-nexa-cyan/30 text-nexa-cyan hover:text-white hover:border-nexa-cyan text-xs font-mono transition-colors"
           >
             MANAGE USER DATA
           </button>

           <button 
             onClick={onViewStudyHub}
             className="w-full py-2 border border-nexa-blue/30 text-nexa-blue hover:text-white hover:border-nexa-blue text-xs font-mono transition-colors"
           >
             VIEW EXAM SCHEDULE & STUDY HUB
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