import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { playStartupSound, playUserLoginSound, playAdminLoginSound, playErrorSound } from '../services/audioService';
import InstallPWAButton from './InstallPWAButton';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

// --- HELPER COMPONENTS ---
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

const CyberButton = ({ onClick, label, secondary = false, loading = false }: any) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`
      w-full py-4 px-6 font-bold tracking-[0.2em] uppercase transition-all duration-200 z-50 cursor-pointer clip-corner relative z-20
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
    ) : label}
  </button>
);

// --- MAIN AUTH COMPONENT ---

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'INIT' | 'USER' | 'ADMIN'>('INIT');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    mobile: '',
    gender: null as 'male' | 'female' | 'other' | null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [glitchText, setGlitchText] = useState('SYSTEM_LOCKED');
  const [initStatusText, setInitStatusText] = useState('TAP TO CONNECT');

  useEffect(() => {
    const headerTexts = ['SYSTEM_LOCKED', 'ENCRYPTION_ACTIVE', 'AWAITING_KEY', 'NEXA_PROTOCOL'];
    const statusTexts = ['CALIBRATING_NEURAL_NET...', 'SYNCING_CHRONO_DRIVES...', 'AWAITING_CONNECTION...'];
    let headerInterval: any, statusInterval: any;

    if (mode === 'INIT') {
      headerInterval = setInterval(() => setGlitchText(headerTexts[Math.floor(Math.random() * headerTexts.length)]), 2000);
      statusInterval = setInterval(() => setInitStatusText(statusTexts[Math.floor(Math.random() * statusTexts.length)]), 2500);
    } else {
      setGlitchText('ACCESS_GATEWAY');
    }

    return () => { clearInterval(headerInterval); clearInterval(statusInterval); };
  }, [mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleGenderSelect = (gender: 'male' | 'female' | 'other') => {
    setFormData({ ...formData, gender });
    setError('');
  };

  const initiateSystem = () => {
    playStartupSound();
    setLoading(true);
    setInitStatusText('CONNECTION_ESTABLISHED');
    setTimeout(() => { setLoading(false); setMode('USER'); }, 1500);
  };

  const handleAdminLogin = () => {
    if (formData.username === 'Chandan' && formData.password === 'Nexa') {
      completeLogin({ name: 'Chandan', mobile: '0000000000', role: UserRole.ADMIN, gender: 'male' });
    } else {
      playErrorSound();
      setError('// ERROR: INVALID CREDENTIALS');
    }
  };

  const handleUserLogin = () => {
    const nameRegex = /^[a-zA-Z\s]{3,}$/;
    const mobileRegex = /^[0-9]{10}$/;
    if (!nameRegex.test(formData.fullName)) {
      playErrorSound(); setError('// ERROR: INVALID NAME (MIN 3 CHARS, ALPHA ONLY)'); return;
    }
    if (!mobileRegex.test(formData.mobile)) {
      playErrorSound(); setError('// ERROR: PLEASE ENTER A VALID 10-DIGIT MOBILE NUMBER'); return;
    }
    if (!formData.gender) {
      playErrorSound(); setError('// ERROR: PLEASE SELECT YOUR GENDER'); return;
    }
    completeLogin({ name: formData.fullName, mobile: formData.mobile, role: UserRole.USER, gender: formData.gender });
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
      <div className="absolute inset-0 z-0 opacity-20"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-zinc-400 dark:border-nexa-cyan/20 rounded-full animate-spin-slow"></div><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-dashed border-zinc-400 dark:border-nexa-cyan/20 rounded-full animate-spin-reverse-slow"></div></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(41,223,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(41,223,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none"></div>
      <div className="absolute top-8 text-center animate-fade-in z-50"><div className="text-[10px] text-zinc-500 dark:text-nexa-cyan/50 font-mono tracking-[0.4em]">CREATED BY</div><div className="text-xl font-bold text-zinc-800 dark:text-white tracking-[0.2em]">CHANDAN LOHAVE</div></div>
      <div className="relative w-full max-w-sm z-50">
        <div className={`absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div><div className={`absolute -top-4 -right-4 w-8 h-8 border-t-2 border-r-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div><div className={`absolute -bottom-4 -left-4 w-8 h-8 border-b-2 border-l-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div><div className={`absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div>
        <div className={`flex justify-between items-center mb-8 border-b ${mode === 'ADMIN' ? 'border-red-500/20' : 'border-nexa-cyan/20'} pb-2 transition-colors duration-500`}>
           <div className={`text-[10px] ${mode === 'ADMIN' ? 'text-red-500' : 'text-nexa-cyan'} font-mono tracking-widest`}>{glitchText}</div>
           <div className="flex gap-1"><div className={`w-1 h-1 ${mode === 'ADMIN' ? 'bg-red-500' : 'bg-nexa-cyan'} animate-pulse`}></div><div className={`w-1 h-1 ${mode === 'ADMIN' ? 'bg-red-500' : 'bg-nexa-cyan'} animate-pulse delay-75`}></div><div className={`w-1 h-1 ${mode === 'ADMIN' ? 'bg-red-500' : 'bg-nexa-cyan'} animate-pulse delay-150`}></div></div>
        </div>
        <div className={`backdrop-blur-md border p-6 relative transition-all duration-500 ${mode === 'ADMIN' ? 'bg-red-900/10 border-red-500/20' : 'bg-white/60 dark:bg-black/60 border-zinc-200 dark:border-nexa-cyan/10'}`}>
          {error && <div className="mb-6 p-2 bg-red-900/20 border-l-2 border-red-500 text-red-500 text-[10px] font-mono tracking-wider animate-pulse">{error}</div>}
          {mode === 'INIT' && (<div className="flex flex-col items-center py-10 animate-fade-in"><div onClick={initiateSystem} className="relative w-32 h-32 flex items-center justify-center cursor-pointer group"><div className="absolute inset-0 bg-nexa-cyan/10 rounded-full blur-xl group-hover:bg-nexa-cyan/30 transition-all duration-500"></div><div className="absolute w-full h-full border-2 border-nexa-cyan rounded-full border-t-transparent animate-spin"></div><div className="absolute w-[80%] h-[80%] border-2 border-dashed border-nexa-cyan/50 rounded-full animate-spin-reverse-slow"></div><div className="absolute w-[40%] h-[40%] bg-nexa-cyan rounded-full animate-pulse shadow-[0_0_20px_currentColor]"></div></div><div className="mt-8 text-center space-y-2"><h1 className="text-4xl font-bold text-zinc-900 dark:text-white tracking-widest">NEXA</h1><div className="text-zinc-500 dark:text-nexa-cyan/60 text-xs font-mono tracking-[0.3em] group-hover:text-nexa-cyan transition-colors">{loading ? 'INITIALIZING...' : initStatusText}</div></div></div>)}
          {mode === 'USER' && (<div className="animate-slide-up space-y-3"><div className="text-center"><div className="text-nexa-cyan text-xs font-mono border border-nexa-cyan/30 inline-block px-2 py-1 mb-2">IDENTITY REQUIRED</div></div><BracketInput name="fullName" placeholder="ENTER YOUR NAME" value={formData.fullName} onChange={handleChange} autoFocus /><BracketInput name="mobile" placeholder="MOBILE NUMBER" type="tel" value={formData.mobile} onChange={handleChange} />
            <div className="flex justify-center gap-2 pt-2">
              {(['male', 'female', 'other'] as const).map(gender => (
                <button key={gender} onClick={() => handleGenderSelect(gender)} className={`flex-1 py-2 text-xs font-mono uppercase tracking-widest border transition-all ${formData.gender === gender ? 'bg-nexa-cyan text-black border-nexa-cyan' : 'bg-transparent text-zinc-500 border-zinc-400 dark:border-zinc-700 hover:border-nexa-cyan hover:text-nexa-cyan'}`}>{gender}</button>
              ))}
            </div>
            <div className="pt-4 space-y-4"><CyberButton onClick={handleUserLogin} label="LOGIN" loading={loading} /><div className="flex justify-between items-center text-center mt-2 px-1"><button onClick={() => setMode('INIT')} className="text-[9px] text-zinc-500 hover:text-nexa-cyan font-mono tracking-widest uppercase transition-colors flex items-center gap-1 group"><span className="group-hover:-translate-x-1 transition-transform">&lt;&lt;</span> BACK</button><button onClick={switchToAdmin} className="text-[9px] text-zinc-500 hover:text-nexa-cyan font-mono tracking-widest uppercase transition-colors">// Admin Console</button></div></div></div>)}
          {mode === 'ADMIN' && (<div className="animate-slide-up relative z-10"><div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(220,38,38,0.05)_0px,rgba(220,38,38,0.05)_10px,transparent_10px,transparent_20px)] pointer-events-none -z-10"></div><div className="text-center mb-6"><div className="inline-flex items-center gap-2 border border-red-500/50 px-3 py-1 bg-red-500/10 backdrop-blur-sm"><div className="w-2 h-2 bg-red-500 animate-pulse rounded-full"></div><span className="text-red-500 text-[10px] font-mono tracking-[0.2em] uppercase">Security Level 8</span></div></div><div className="absolute top-10 right-4 opacity-5 pointer-events-none"><svg className="w-24 h-24 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17a2 2 0 100-4 2 2 0 000 4zm6-9a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h1V6a5 5 0 0110 0v2h1zM8 6a4 4 0 018 0v2H8V6z"/></svg></div><div className="space-y-4 relative z-20"><BracketInput name="username" placeholder="IDENTITY_ID" type="text" value={formData.username} onChange={handleChange} autoFocus variant="red" className="password-hidden" /><BracketInput name="password" placeholder="ACCESS_KEY" type="text" value={formData.password} onChange={handleChange} variant="red" className="password-hidden" /></div><div className="pt-8 space-y-4 relative z-20"><button onClick={handleAdminLogin} disabled={loading} className="w-full py-4 bg-red-600 text-white font-bold tracking-[0.2em] hover:bg-red-500 hover:shadow-[0_0_25px_rgba(220,38,38,0.8)] transition-all clip-corner relative overflow-hidden group" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}><div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div><span className="relative z-10 flex items-center justify-center gap-2">{loading ? 'AUTHENTICATING...' : <>AUTHORIZE OVERRIDE <span className="text-xs opacity-70">{'>>'}</span></>}</span></button><div className="mt-2"><button onClick={() => setMode('USER')} className="text-[9px] text-red-500/60 hover:text-red-500 font-mono tracking-widest uppercase transition-colors flex items-center justify-center gap-2 w-full group"><span className="group-hover:-translate-x-1 transition-transform">&lt;&lt;</span> ABORT SEQUENCE</button></div></div></div>)}
        </div>
        <div className="flex justify-between mt-2 px-2"><div className={`text-[8px] ${mode === 'ADMIN' ? 'text-red-500/40' : 'text-nexa-cyan/40'} font-mono`}>SECURE CONNECTION</div><div className={`text-[8px] ${mode === 'ADMIN' ? 'text-red-500/40' : 'text-nexa-cyan/40'} font-mono`}>V.9.0.1</div></div>
      </div>
      <div className="absolute bottom-16 text-center text-[8px] font-mono text-zinc-400 dark:text-nexa-cyan/30 tracking-widest animate-fade-in z-50">© 2025 CHANDAN LOHAVE. ALL RIGHTS RESERVED.</div>
      <InstallPWAButton />
      <style>{`.clip-corner { clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); }`}</style>
    </div>
  );
};

export default Auth;