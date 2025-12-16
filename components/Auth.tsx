import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { playStartupSound, playUserLoginSound, playAdminLoginSound, playErrorSound, initGlobalAudio } from '../services/audioService';
import InstallPWAButton from './InstallPWAButton';
import { syncUserProfile } from '../services/memoryService';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
  onResume?: () => void;      // New prop for resuming session
  isResuming?: boolean;       // New prop to check if we are just unlocking
  savedUserName?: string;     // Name to display if resuming
}

// --- VISUAL COMPONENTS ---

const BracketInput = ({ name, placeholder, type = 'text', value, onChange, autoFocus, variant = 'cyan', className = '' }: any) => {
  const colorClass = variant === 'red' ? 'text-red-500' : 'text-nexa-cyan';
  const borderClass = variant === 'red' ? 'bg-red-500' : 'bg-nexa-cyan';
  const placeholderClass = variant === 'red' ? 'placeholder-red-500/20' : 'placeholder-nexa-cyan/20 dark:placeholder-nexa-cyan/20';

  return (
    <div className="relative group z-50 my-4">
      <div className="flex items-center">
        <span className={`${colorClass} opacity-50 text-2xl font-light group-focus-within:opacity-100 transition-opacity duration-300`}>[</span>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
          className={`w-full bg-transparent border-none text-zinc-800 dark:text-white text-center font-mono text-base focus:ring-0 focus:outline-none ${placeholderClass} z-50 tracking-widest relative z-10 ${className}`}
          placeholder={placeholder}
          autoComplete="off"
        />
        <span className={`${colorClass} opacity-50 text-2xl font-light group-focus-within:opacity-100 transition-opacity duration-300`}>]</span>
      </div>
      <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-[1px] ${borderClass} group-focus-within:w-full transition-all duration-300`}></div>
    </div>
  );
};

const CyberButton = ({ onClick, label, secondary = false, loading = false, icon = null }: any) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`
      w-full py-4 px-6 font-bold tracking-[0.2em] uppercase transition-all duration-200 z-50 cursor-pointer clip-corner relative z-20 flex items-center justify-center gap-3
      ${secondary 
        ? 'bg-transparent border border-nexa-cyan/30 text-nexa-cyan/60 hover:text-black dark:hover:text-white hover:border-nexa-cyan' 
        : 'bg-nexa-cyan text-black hover:bg-zinc-800 dark:hover:bg-white hover:shadow-[0_0_20px_rgba(41,223,255,0.6)]'
      }
    `}
    style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
  >
    {loading ? (
      <span className="flex items-center justify-center gap-2">
         <span className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce"></span>
         PROCESSING
      </span>
    ) : (
      <>
        {icon && <span className="w-5 h-5">{icon}</span>}
        {label}
      </>
    )}
  </button>
);


// --- MAIN AUTH COMPONENT ---

const Auth: React.FC<AuthProps> = ({ onLogin, onResume, isResuming = false, savedUserName = '' }) => {
  const [mode, setMode] = useState<'INIT' | 'USER_CREATE' | 'ADMIN' | 'KEY_INPUT'>('INIT');
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '', // Used as unique ID
    gender: 'male',
    username: '', // Admin login
    password: '', // Admin login
    customApiKey: localStorage.getItem('nexa_client_api_key') || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [glitchText, setGlitchText] = useState('SYSTEM_LOCKED');
  // Dynamic Text based on whether we are resuming or starting fresh
  const [initStatusText, setInitStatusText] = useState(isResuming ? 'SYSTEM STANDBY' : 'TAP TO CONNECT');

  // Check connectivity options
  const hasSystemKey = !!process.env.API_KEY && process.env.API_KEY !== 'undefined' && process.env.API_KEY.trim() !== '';
  const hasCustomKey = !!localStorage.getItem('nexa_client_api_key');

  useEffect(() => {
    const headerTexts = ['SYSTEM_LOCKED', 'ENCRYPTION_ACTIVE', 'AWAITING_USER', 'NEXA_PROTOCOL'];
    const statusTexts = ['CALIBRATING...', 'INITIALIZING CORE...', 'AWAITING INPUT...'];
    let headerInterval: any, statusInterval: any;

    if (mode === 'INIT') {
      headerInterval = setInterval(() => setGlitchText(headerTexts[Math.floor(Math.random() * headerTexts.length)]), 2000);
      // Only cycle status text if NOT resuming. If resuming, we keep it steady.
      if (!isResuming) {
        statusInterval = setInterval(() => setInitStatusText(statusTexts[Math.floor(Math.random() * statusTexts.length)]), 2500);
      }
    } else {
      setGlitchText('ACCESS_GATEWAY');
    }

    return () => { clearInterval(headerInterval); clearInterval(statusInterval); };
  }, [mode, isResuming]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handlePowerUpClick = async () => {
    // 1. IMPORTANT: Initialize global audio context here on direct user gesture
    await initGlobalAudio();
    playStartupSound();

    // 2. Branch Logic
    if (isResuming && onResume) {
        setLoading(true);
        setInitStatusText('RESTORING SESSION...');
        // Small delay for effect
        setTimeout(() => {
            onResume(); 
        }, 1000);
    } else {
        setLoading(true);
        setInitStatusText('AUTHENTICATING...');
        setTimeout(() => { setLoading(false); setMode('USER_CREATE'); }, 1500);
    }
  };

  const handleAdminLogin = () => {
    if (formData.username === 'Chandan' && formData.password === 'Nexa') {
      const adminProfile: UserProfile = { name: 'Chandan', mobile: 'admin_001', role: UserRole.ADMIN, gender: 'male' };
      completeLogin(adminProfile);
    } else {
      playErrorSound();
      setError('// ERROR: INVALID CREDENTIALS');
    }
  };

  const handleUserCreate = async () => {
    if (!formData.name.trim()) {
        playErrorSound();
        setError('// ERROR: NAME REQUIRED');
        return;
    }
    
    if (!/^\d{10}$/.test(formData.mobile.trim())) {
        playErrorSound();
        setError('// ERROR: VALID 10-DIGIT MOBILE REQUIRED');
        return;
    }

    setLoading(true);
    
    const userId = formData.mobile.trim();
    
    const profile: UserProfile = {
         name: formData.name,
         mobile: userId, 
         role: UserRole.USER,
         gender: formData.gender as 'male' | 'female' | 'other'
    };

    await syncUserProfile(profile);
    completeLogin(profile);
  };

  const saveCustomKey = () => {
    if (formData.customApiKey.trim().length < 10) {
        playErrorSound();
        setError('// ERROR: INVALID API KEY FORMAT');
        return;
    }
    localStorage.setItem('nexa_client_api_key', formData.customApiKey.trim());
    setMode('INIT');
    setInitStatusText('CUSTOM KEY SAVED');
  };
  
  const clearCustomKey = () => {
      localStorage.removeItem('nexa_client_api_key');
      setFormData({...formData, customApiKey: ''});
      setMode('INIT');
      setInitStatusText('CUSTOM KEY REMOVED');
  };

  const completeLogin = (profile: UserProfile) => {
    setLoading(true);
    profile.role === UserRole.ADMIN ? playAdminLoginSound() : playUserLoginSound();
    onLogin(profile);
  };
  
  const switchToAdmin = () => {
    playErrorSound();
    setMode('ADMIN');
  };

  return (
    <div className="fixed inset-0 bg-zinc-100 dark:bg-black flex flex-col items-center justify-center p-6 z-[60] overflow-hidden transition-colors duration-500">
      {/* Visual Background Effects */}
      <div className="absolute inset-0 z-0 opacity-20"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-zinc-400 dark:border-nexa-cyan/20 rounded-full animate-spin-slow"></div><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-dashed border-zinc-400 dark:border-nexa-cyan/20 rounded-full animate-spin-reverse-slow"></div></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(41,223,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(41,223,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none"></div>
      
      {/* Header Info */}
      <div className="absolute top-8 text-center animate-fade-in z-50">
          <div className="text-[10px] text-zinc-500 dark:text-nexa-cyan/50 font-mono tracking-[0.4em]">{isResuming ? 'WELCOME BACK' : 'CREATED BY'}</div>
          <div className="text-xl font-bold text-zinc-800 dark:text-white tracking-[0.2em]">{isResuming ? savedUserName?.toUpperCase() : 'CHANDAN LOHAVE'}</div>
      </div>
      
      {/* Top Right Config Button (Only show if not resuming, or make it accessible) */}
      {mode === 'INIT' && (
          <button onClick={() => setMode('KEY_INPUT')} className="absolute top-6 right-6 p-2 text-nexa-cyan/50 hover:text-nexa-cyan border border-transparent hover:border-nexa-cyan/30 transition-all z-[70] group">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              <span className="absolute right-8 top-2 text-[9px] font-mono tracking-widest opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black px-2 py-1 border border-nexa-cyan/30">
                  {hasCustomKey ? 'CUSTOM KEY ACTIVE' : 'USE OWN API KEY'}
              </span>
              {hasCustomKey && <div className="absolute top-1 right-1 w-2 h-2 bg-nexa-cyan rounded-full animate-pulse"></div>}
          </button>
      )}

      {/* MISSING KEY WARNING */}
      {mode === 'INIT' && !hasSystemKey && !hasCustomKey && (
          <div className="absolute top-20 bg-red-500/10 border border-red-500/50 px-4 py-2 rounded text-[10px] text-red-500 font-mono animate-pulse z-[70]">
              SYSTEM WARNING: HOST API KEY MISSING
          </div>
      )}

      <div className="relative w-full max-w-sm z-50">
        <div className={`absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div><div className={`absolute -top-4 -right-4 w-8 h-8 border-t-2 border-r-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div><div className={`absolute -bottom-4 -left-4 w-8 h-8 border-b-2 border-l-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div><div className={`absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div>
        
        {/* Main Card Content */}
        <div className={`backdrop-blur-md border p-6 relative transition-all duration-500 ${mode === 'ADMIN' ? 'bg-red-900/10 border-red-500/20' : 'bg-white/60 dark:bg-black/60 border-zinc-200 dark:border-nexa-cyan/10'}`}>
          {error && <div className="mb-6 p-2 bg-red-900/20 border-l-2 border-red-500 text-red-500 text-[10px] font-mono tracking-wider animate-pulse">{error}</div>}
          
          {mode === 'INIT' && (
            <div className="flex flex-col items-center py-10 animate-fade-in relative">
              <div onClick={handlePowerUpClick} className="relative w-40 h-40 flex items-center justify-center cursor-pointer group">
                  <div className={`absolute inset-0 rounded-full border-2 ${loading ? 'border-t-nexa-cyan border-r-nexa-cyan border-b-transparent border-l-transparent animate-spin' : 'border-nexa-cyan/30'} transition-all duration-500`}></div>
                  <div className={`absolute inset-2 rounded-full border ${loading ? 'border-t-transparent border-r-transparent border-b-nexa-cyan border-l-nexa-cyan animate-spin-reverse-slow' : 'border-nexa-cyan/20'} transition-all duration-500`}></div>
                  
                  {/* Reactor Core */}
                  <div className={`w-24 h-24 rounded-full bg-nexa-cyan/10 backdrop-blur-md flex items-center justify-center border border-nexa-cyan/50 shadow-[0_0_15px_rgba(41,223,255,0.3)] group-hover:shadow-[0_0_25px_rgba(41,223,255,0.6)] transition-all duration-500`}>
                      <div className="text-3xl font-bold text-nexa-cyan tracking-wider animate-pulse">NEXA</div>
                  </div>
              </div>
              <div className="mt-8 text-nexa-cyan/60 font-mono text-xs tracking-[0.3em] animate-pulse">
                  {isResuming ? 'TAP TO RESUME' : initStatusText}
              </div>
              {hasCustomKey && <div className="mt-2 px-2 py-1 bg-nexa-cyan/10 border border-nexa-cyan/30 text-[9px] text-nexa-cyan tracking-widest font-mono">USING CUSTOM KEY</div>}
              
              {/* Show Logout Option if Resuming */}
              {isResuming && (
                  <button 
                    onClick={() => {
                        localStorage.removeItem('nexa_user');
                        window.location.reload();
                    }}
                    className="mt-6 text-[9px] text-zinc-500 hover:text-red-500 font-mono tracking-widest border-b border-zinc-800 hover:border-red-500 transition-colors"
                  >
                    DIFFERENT USER?
                  </button>
              )}
            </div>
          )}

          {mode === 'USER_CREATE' && (
            <div className="animate-slide-up space-y-3">
              <div className="text-center"><div className="text-nexa-cyan text-xs font-mono border border-nexa-cyan/30 inline-block px-2 py-1 mb-6">IDENTIFY YOURSELF</div></div>
              
              <BracketInput name="name" placeholder="ENTER NAME" value={formData.name} onChange={handleChange} autoFocus />
              <BracketInput name="mobile" placeholder="ENTER 10-DIGIT MOBILE" type="tel" value={formData.mobile} onChange={handleChange} />

              <div className="flex items-center justify-center gap-4 py-2">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={handleChange} className="accent-nexa-cyan" />
                    <span className="text-xs font-mono text-zinc-400">MALE</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={handleChange} className="accent-nexa-cyan" />
                    <span className="text-xs font-mono text-zinc-400">FEMALE</span>
                 </label>
              </div>

              <div className="pt-4">
                  <CyberButton onClick={handleUserCreate} label="INITIALIZE PROFILE" loading={loading} />
              </div>

              <div className="pt-4 space-y-4">
                  <div className="flex justify-between items-center text-center mt-2 px-1">
                      <button onClick={() => setMode('INIT')} className="text-[9px] text-zinc-500 hover:text-nexa-cyan font-mono tracking-widest uppercase transition-colors flex items-center gap-1 group"><span className="group-hover:-translate-x-1 transition-transform">&lt;&lt;</span> BACK</button>
                      <button onClick={switchToAdmin} className="text-[9px] text-zinc-500 hover:text-nexa-cyan font-mono tracking-widest uppercase transition-colors">// Admin Console</button>
                  </div>
              </div>
            </div>
          )}

          {mode === 'KEY_INPUT' && (
            <div className="animate-slide-up space-y-4">
               <div className="text-center"><div className="text-nexa-cyan text-xs font-mono border border-nexa-cyan/30 inline-block px-2 py-1 mb-2">ACCESS OVERRIDE</div></div>
               <p className="text-zinc-400 text-[10px] text-center font-mono leading-relaxed">Enter your own Gemini API Key to use this terminal without consuming the host's quota.</p>
               <BracketInput name="customApiKey" placeholder="AI_STUDIO_KEY" value={formData.customApiKey} onChange={handleChange} autoFocus className="password-hidden" />
               <div className="pt-4 space-y-3">
                   <CyberButton onClick={saveCustomKey} label="SAVE & REBOOT" loading={loading} />
                   {hasCustomKey && <button onClick={clearCustomKey} className="w-full py-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-500 text-xs font-mono tracking-widest transition-colors">REMOVE KEY & USE DEFAULT</button>}
                   <div className="text-center mt-2">
                       <button onClick={() => setMode('INIT')} className="text-[9px] text-zinc-500 hover:text-nexa-cyan font-mono tracking-widest uppercase transition-colors inline-block pt-2">CANCEL OPERATION</button>
                   </div>
               </div>
            </div>
          )}

          {mode === 'ADMIN' && (<div className="animate-slide-up relative z-10"><div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(220,38,38,0.05)_0px,rgba(220,38,38,0.05)_10px,transparent_10px,transparent_20px)] pointer-events-none -z-10"></div><div className="text-center mb-6"><div className="inline-flex items-center gap-2 border border-red-500/50 px-3 py-1 bg-red-500/10 backdrop-blur-sm"><div className="w-2 h-2 bg-red-500 animate-pulse rounded-full"></div><span className="text-red-500 text-[10px] font-mono tracking-[0.2em] uppercase">Security Level 8</span></div></div><div className="absolute top-10 right-4 opacity-5 pointer-events-none"><svg className="w-24 h-24 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17a2 2 0 100-4 2 2 0 000 4zm6-9a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h1V6a5 5 0 0110 0v2h1zM8 6a4 4 0 018 0v2H8V6z"/></svg></div><div className="space-y-4 relative z-20"><BracketInput name="username" placeholder="IDENTITY_ID" type="text" value={formData.username} onChange={handleChange} autoFocus variant="red" className="password-hidden" /><BracketInput name="password" placeholder="ACCESS_KEY" type="text" value={formData.password} onChange={handleChange} variant="red" className="password-hidden" /></div><div className="pt-8 space-y-4 relative z-20"><button onClick={handleAdminLogin} disabled={loading} className="w-full py-4 bg-red-600 text-white font-bold tracking-[0.2em] hover:bg-red-500 hover:shadow-[0_0_25px_rgba(220,38,38,0.8)] transition-all clip-corner relative overflow-hidden group" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}><div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div><span className="relative z-10 flex items-center justify-center gap-2">{loading ? 'AUTHENTICATING...' : <>AUTHORIZE OVERRIDE <span className="text-xs opacity-70">{'>>'}</span></>}</span></button><div className="mt-2"><button onClick={() => setMode('USER_CREATE')} className="text-[9px] text-red-500/60 hover:text-red-500 font-mono tracking-widest uppercase transition-colors flex items-center justify-center gap-2 w-full group"><span className="group-hover:-translate-x-1 transition-transform">&lt;&lt;</span> ABORT SEQUENCE</button></div></div></div>)}
        </div>
        <div className="flex justify-between mt-2 px-2"><div className={`text-[8px] ${mode === 'ADMIN' ? 'text-red-500/40' : 'text-nexa-cyan/40'} font-mono`}>SECURE CONNECTION</div><div className={`text-[8px] ${mode === 'ADMIN' ? 'text-red-500/40' : 'text-nexa-cyan/40'} font-mono`}>V.9.0.3</div></div>
      </div>
      <div className="absolute bottom-16 text-center text-[8px] font-mono text-zinc-400 dark:text-nexa-cyan/30 tracking-widest animate-fade-in z-50">© 2025 CHANDAN LOHAVE. ALL RIGHTS RESERVED.</div>
      <InstallPWAButton />
      <style>{`.clip-corner { clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); }`}</style>
    </div>
  );
};

export default Auth;