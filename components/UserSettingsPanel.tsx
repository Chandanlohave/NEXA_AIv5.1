import React, { useState, useEffect } from 'react';
import { AppConfig, UserProfile } from '../types';
import { saveUserApiKey, getUserApiKey } from '../services/memoryService';
import { playSystemNotificationSound } from '../services/audioService';

interface UserSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
  user: UserProfile;
}

const VoiceQualityToggle: React.FC<{ config: AppConfig, onConfigChange: (c: AppConfig) => void }> = ({ config, onConfigChange }) => (
  <div>
    <label className="block text-zinc-700 dark:text-zinc-400 text-xs font-mono mb-1">Voice Quality</label>
    <div className="flex gap-1">
      <button
        onClick={() => onConfigChange({ ...config, voiceQuality: 'hd' })}
        className={`flex-1 py-2 text-xs font-mono uppercase transition-colors ${config.voiceQuality === 'hd' ? 'bg-nexa-cyan text-black' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-nexa-cyan/50'}`}
      >
        High Quality (Gemini)
      </button>
      <button
        onClick={() => onConfigChange({ ...config, voiceQuality: 'standard' })}
        className={`flex-1 py-2 text-xs font-mono uppercase transition-colors ${config.voiceQuality === 'standard' ? 'bg-nexa-yellow text-black' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-nexa-yellow/50'}`}
      >
        Standard (Offline)
      </button>
    </div>
    <p className="text-zinc-500 text-[10px] font-mono mt-1 text-center">Gemini voice provides the best experience.</p>
  </div>
);

const UserSettingsPanel: React.FC<UserSettingsPanelProps> = ({ isOpen, onClose, config, onConfigChange, user }) => {
  const [apiKey, setApiKey] = useState('');
  const [currentApiKey, setCurrentApiKey] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      const storedKey = getUserApiKey(user);
      if (storedKey) {
        setCurrentApiKey(storedKey);
      }
    }
  }, [isOpen, user]);

  const handleApiKeySave = () => {
    if (apiKey.trim() && user) {
      saveUserApiKey(user, apiKey.trim());
      setCurrentApiKey(apiKey.trim());
      setApiKey('');
      playSystemNotificationSound();
    }
  };

  if (!isOpen) return null;

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
    <div className="absolute top-16 right-4 w-72 bg-white/80 dark:bg-black/90 border border-zinc-300 dark:border-nexa-cyan/80 rounded-lg backdrop-blur-md p-4 z-50 shadow-[0_0_20px_rgba(41,223,255,0.3)] animate-fade-in">
      <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <h2 className="text-nexa-cyan font-mono text-sm tracking-wider">USER SETTINGS</h2>
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

        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-zinc-700 dark:text-zinc-400 text-xs font-mono">API Key Management</label>
            <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nexa-cyan/70 hover:text-nexa-cyan text-[10px] font-mono tracking-wider uppercase"
            >
                Get Key
            </a>
          </div>
          <div className="text-zinc-500 text-[10px] font-mono mb-2">
            Current: {currentApiKey ? `${currentApiKey.substring(0, 4)}...${currentApiKey.slice(-4)}` : 'Not Set'}
          </div>
          <input 
            type="password"
            placeholder="Enter new Google Gemini API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-white px-2 py-1.5 text-xs font-mono focus:border-nexa-cyan focus:ring-0 outline-none"
          />
          <button 
             onClick={handleApiKeySave}
             className="w-full mt-2 py-2 border border-nexa-cyan/30 text-nexa-cyan hover:text-white hover:border-nexa-cyan text-xs font-mono transition-colors"
           >
             UPDATE KEY
           </button>
        </div>

        <div>
          <label className="block text-zinc-700 dark:text-zinc-400 text-xs font-mono mb-1">HUD Animation Speed</label>
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
      </div>
    </div>
  );
};

export default UserSettingsPanel;