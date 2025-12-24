import React, { useState } from 'react';
import { AppConfig } from '../types';
import { saveAdminApiKey } from '../services/memoryService';
import { playSystemNotificationSound } from '../services/audioService';

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

const VoiceQualityToggle: React.FC<{ config: AppConfig, onConfigChange: (c: AppConfig) => void }> = ({ config, onConfigChange }) => (
  <div>
    <label className="block text-zinc-700 dark:text-zinc-400 text-xs font-mono mb-1">Voice Quality</label>
    <div className="flex gap-1">
      <button
        onClick={() => onConfigChange({ ...config, voiceQuality: 'intelligent' })}
        className={`flex-1 py-2 text-xs font-mono uppercase transition-colors ${config.voiceQuality === 'intelligent' ? 'bg-nexa-blue text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-nexa-blue/50'}`}
      >
        Intelligent
      </button>
      <button
        onClick={() => onConfigChange({ ...config, voiceQuality: 'hd' })}
        className={`flex-1 py-2 text-xs font-mono uppercase transition-colors ${config.voiceQuality === 'hd' ? 'bg-nexa-cyan text-black' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-nexa-cyan/50'}`}
      >
        Always HD
      </button>
      <button
        onClick={() => onConfigChange({ ...config, voiceQuality: 'standard' })}
        className={`flex-1 py-2 text-xs font-mono uppercase transition-colors ${config.voiceQuality === 'standard' ? 'bg-nexa-yellow text-black' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-nexa-yellow/50'}`}
      >
        Standard
      </button>
    </div>
    <p className="text-zinc-500 text-[10px] font-mono mt-1 text-center">Intelligent mode saves quota on short replies.</p>
  </div>
);

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
  const [newAdminApiKey, setNewAdminApiKey] = useState('');

  const handleAdminApiKeySave = () => {
    if (newAdminApiKey.trim()) {
      saveAdminApiKey(newAdminApiKey.trim());
      playSystemNotificationSound();
      setNewAdminApiKey('');
      // You can add a small confirmation message state here if needed
    }
  };

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

        <VoiceQualityToggle config={config} onConfigChange={onConfigChange} />

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
          <label className="block text-zinc-700 dark:text-zinc-400 text-xs font-mono mb-1">Mic Animation Speed</label>
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
        
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <label className="block text-red-500 text-xs font-mono mb-2 uppercase">Admin API Key Override</label>
             <input 
                type="password"
                placeholder="Enter new key to override default"
                value={newAdminApiKey}
                onChange={(e) => setNewAdminApiKey(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-white px-2 py-1.5 text-xs font-mono focus:border-red-500 focus:ring-0 outline-none"
            />
            <button 
                onClick={handleAdminApiKeySave}
                className="w-full mt-2 py-2 border border-red-500/30 text-red-500 hover:text-white hover:bg-red-500 text-xs font-mono transition-colors"
            >
                UPDATE ADMIN KEY
            </button>
            <p className="text-zinc-500 text-[10px] font-mono mt-1 text-center">This key will be used until memory is purged.</p>
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