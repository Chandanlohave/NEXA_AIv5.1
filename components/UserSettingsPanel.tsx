import React from 'react';
import { AppConfig } from '../types';

interface UserSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
}

const UserSettingsPanel: React.FC<UserSettingsPanelProps> = ({ isOpen, onClose, config, onConfigChange }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-4 w-72 bg-black/90 border border-nexa-cyan/80 rounded-lg backdrop-blur-md p-4 z-50 shadow-[0_0_20px_rgba(41,223,255,0.3)] animate-fade-in">
      <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
        <h2 className="text-nexa-cyan font-mono text-sm tracking-wider">USER SETTINGS</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl leading-none">&times;</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-zinc-400 text-xs font-mono mb-1">HUD Animation Speed</label>
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
          <label className="block text-zinc-400 text-xs font-mono mb-1">Mic Animation Speed</label>
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
          <label className="block text-zinc-400 text-xs font-mono mb-1">Animations</label>
          <button 
            onClick={() => onConfigChange({...config, animationsEnabled: !config.animationsEnabled})}
            className={`w-full py-2 text-xs font-mono border ${config.animationsEnabled ? 'border-nexa-cyan text-nexa-cyan' : 'border-zinc-700 text-zinc-500'}`}
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