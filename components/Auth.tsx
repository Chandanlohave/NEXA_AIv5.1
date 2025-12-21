import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { playStartupSound, playUserLoginSound, playAdminLoginSound, playErrorSound, initGlobalAudio } from '../services/audioService';
import InstallPWAButton from './InstallPWAButton';
import { syncUserProfile } from '../services/memoryService';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
  onResume?: () => void;      
  isResuming?: boolean;       
  savedUserName?: string;     
}

const BracketInput = ({ name, placeholder, type = 'text', value, onChange, autoFocus, variant = 'cyan', className = '' }: any) => {
  const isRed = variant === 'red';
  const colorClass = isRed ? 'text-nexa-red' : 'text-nexa-cyan';
  const glowClass = isRed ? 'shadow-[0_0_15px_rgba(255,42,42,0.4)]' : 'shadow-[0_0_15px_rgba(41,223,255,0.4)]';
  const borderClass = isRed ? 'bg-nexa-red' : 'bg-nexa-cyan';
  const placeholderClass = isRed ? 'placeholder-red-900/40' : 'placeholder-zinc-400 dark:placeholder-nexa-cyan/20';

  return (
    <div className="relative group z-50 my-6">
      <div className="flex items-center justify-center gap-2">
        <span className={`${colorClass} text-3xl font-extralight opacity-40 group-focus-within:opacity-100 group-focus-within:animate-pulse transition-all duration-500`}>[</span>
        <div className="relative flex-1 max-w-[240px]">
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            autoFocus={autoFocus}
            className={`w-full bg-white/5 dark:bg-black/20 border-b border-transparent group-focus-within:border-${isRed ? 'red-500' : 'nexa-cyan'}/30 text-zinc-800 dark:text-white text-center font-mono text-sm focus:ring-0 focus:outline-none ${placeholderClass} z-50 tracking-[0.2em] relative transition-all py-2 rounded-sm uppercase ${className}`}
            placeholder={placeholder}
            autoComplete="off"
          />
          <div className={`absolute bottom-0 left-0 h-[1px] w-0 group-focus-within:w-full ${borderClass} transition-all duration-700 opacity-50`}></div>
        </div>
        <span className={`${colorClass} text-3xl font-extralight opacity-40 group-focus-within:opacity-100 group-focus-within:animate-pulse transition-all duration-500`}>]</span>
      </div>
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-10 bg-${isRed ? 'red-500' : 'nexa-cyan'}/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 -z-10`}></div>
    </div>
  );
};

const CyberButton = ({ onClick, label, secondary = false, loading = false, icon = null }: any) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`
      w-full py-4 px-6 font-bold tracking-[0.3em] uppercase transition-all duration-300 z-50 cursor-pointer clip-corner relative z-20 flex items-center justify-center gap-3 group
      ${secondary 
        ? 'bg-transparent border border-nexa-cyan/30 text-nexa-cyan/60 hover:text-white hover:border-nexa-cyan' 
        : 'bg-nexa-cyan text-black hover:bg-white hover:shadow-[0_0_25px_rgba(41,223,255,0.8)] active:scale-95'
      }
    `}
    style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
  >
    {loading ? (
      <span className="flex items-center justify-center gap-3">
         <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></span>
         <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></span>
         <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
      </span>
    ) : (
      <>
        {icon && <span className="w-5 h-5 group-hover:scale-110 transition-transform">{icon}</span>}
        <span className="relative z-10">{label}</span>
      </>
    )}
  </button>
);


const Auth: React.FC<AuthProps> = ({ onLogin, onResume, isResuming = false, savedUserName = '' }) => {
  const [mode, setMode] = useState<'INIT' | 'USER_CREATE' | 'ADMIN' | 'KEY_INPUT'>('INIT');
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '', 
    gender: 'male',
    username: '', 
    password: '', 
    customApiKey: localStorage.getItem('nexa_client_api_key') || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [glitchText, setGlitchText] = useState('SYSTEM_LOCKED');
  const [initStatusText, setInitStatusText] = useState(isResuming ? 'SYSTEM STANDBY' : 'TAP TO CONNECT');

  const hasSystemKey = (!!process.env.API_KEY && process.env.API_KEY !== 'undefined' && process.env.API_KEY !== '');
  const hasCustomKey = !!localStorage.getItem('nexa_client_api_key');

  useEffect(() => {
    const headerTexts = ['SYSTEM_LOCKED', 'ENCRYPTION_ACTIVE', 'AWAITING_USER', 'NEXA_PROTOCOL'];
    const statusTexts = ['CALIBRATING...', 'INITIALIZING CORE...', 'AWAITING INPUT...'];
    let headerInterval: any, statusInterval: any;

    if (mode === 'INIT') {
      headerInterval = setInterval(() => setGlitchText(headerTexts[Math.floor(Math.random() * headerTexts.length)]), 2000);
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
    await initGlobalAudio();
    playStartupSound();

    if (isResuming && onResume) {
        setLoading(true);
        setInitStatusText('RESTORING SESSION...');
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
      <div className="absolute inset-0 z-0 opacity-20"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-zinc-400 dark:border-nexa-cyan/20 rounded-full animate-spin-slow"></div><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-dashed border-zinc-400 dark:border-nexa-cyan/20 rounded-full animate-spin-reverse-slow"></div></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(41,223,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(41,223,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none"></div>
      
      <div className="absolute top-8 text-center animate-fade-in z-50">
          <div className="text-[10px] text-zinc-500 dark:text-nexa-cyan/50 font-mono tracking-[0.4em] uppercase">{isResuming ? 'Biometric Link Ready' : 'Project NEXA'}</div>
          <div className="text-xl font-bold text-zinc-800 dark:text-white tracking-[0.3em] uppercase">{isResuming ? savedUserName : 'Initial Boot'}</div>
      </div>
      
      {mode === 'INIT' && (
          <button onClick={() => setMode('KEY_INPUT')} className="absolute top-6 right-6 p-3 text-nexa-cyan/50 hover:text-nexa-cyan border border-nexa-cyan/10 hover:border-nexa-cyan/50 rounded-full bg-nexa-cyan/5 backdrop-blur-md transition-all z-[70] group">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              <span className="absolute right-12 top-2 text-[9px] font-mono tracking-widest opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black/90 px-3 py-1.5 border border-nexa-cyan/30 rounded text-nexa-cyan shadow-xl transition-opacity">
                  {hasCustomKey ? 'OVERRIDE_ACTIVE' : 'CONFIGURE_PRIVATE_KEY'}
              </span>
              {hasCustomKey && <div className="absolute top-1 right-1 w-2 h-2 bg-nexa-cyan rounded-full animate-pulse"></div>}
          </button>
      )}

      <div className="relative w-full max-w-sm z-50">
        <div className={`absolute -top-6 -left-6 w-12 h-12 border-t border-l ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} opacity-40 transition-all duration-500 group-hover:w-16 group-hover:h-16`}></div><div className={`absolute -top-6 -right-6 w-12 h-12 border-t border-r ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} opacity-40 transition-all duration-500`}></div><div className={`absolute -bottom-6 -left-6 w-12 h-12 border-b border-l ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} opacity-40 transition-all duration-500`}></div><div className={`absolute -bottom-6 -right-6 w-12 h-12 border-b border-r ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} opacity-40 transition-all duration-500`}></div>
        
        <div className={`backdrop-blur-xl border p-8 relative transition-all duration-700 ${mode === 'ADMIN' ? 'bg-red-950/20 border-red-500/30 shadow-[0_0_50px_rgba(255,42,42,0.15)]' : 'bg-white/40 dark:bg-black/40 border-zinc-200/50 dark:border-nexa-cyan/20 shadow-[0_0_50px_rgba(41,223,255,0.15)]'} rounded-sm`}>
          {error && <div className="mb-6 p-3 bg-red-900/20 border-l-2 border-red-500 text-red-500 text-[10px] font-mono tracking-widest animate-pulse uppercase">{error}</div>}
          
          {mode === 'INIT' && (
            <div className="flex flex-col justify-center items-center pt-4 pb-2 animate-fade-in relative" style={{ minHeight: '340px' }}>
              <div onClick={handlePowerUpClick} className="relative w-44 h-44 flex items-center justify-center cursor-pointer group">
                  <div className={`absolute inset-0 rounded-full border border-dashed ${loading ? 'border-nexa-cyan animate-spin' : 'border-nexa-cyan/30'} transition-all duration-500`}></div>
                  <div className={`absolute inset-4 rounded-full border ${loading ? 'border-nexa-cyan/60 animate-spin-reverse-slow' : 'border-nexa-cyan/10'} transition-all duration-700`}></div>
                  
                  <div className={`w-28 h-28 rounded-full bg-nexa-cyan/5 backdrop-blur-md flex flex-col items-center justify-center border border-nexa-cyan/40 shadow-[0_0_30px_rgba(41,223,255,0.2)] group-hover:shadow-[0_0_50px_rgba(41,223,255,0.4)] group-active:scale-95 transition-all duration-500`}>
                      <div className="text-4xl font-black text-nexa-cyan tracking-tighter italic">NX</div>
                      <div className="text-[8px] font-mono text-nexa-cyan/60 tracking-[0.4em] mt-1 uppercase">Active</div>
                  </div>
              </div>
              <div className="mt-10 text-nexa-cyan font-mono text-[10px] tracking-[0.5em] animate-pulse uppercase">
                  {isResuming ? 'Verify Biometrics' : initStatusText}
              </div>
              
              {isResuming && (
                  <button 
                    onClick={() => {
                        localStorage.removeItem('nexa_user');
                        window.location.reload();
                    }}
                    className="mt-8 text-[9px] text-zinc-500 hover:text-red-500 font-mono tracking-[0.3em] uppercase border-b border-zinc-300 dark:border-zinc-800 hover:border-red-500 transition-all"
                  >
                    Switch Identity
                  </button>
              )}
            </div>
          )}

          {mode === 'USER_CREATE' && (
            <div className="animate-slide-up space-y-4">
              <div className="text-center"><div className="text-nexa-cyan text-[10px] font-mono border border-nexa-cyan/20 inline-block px-4 py-1.5 mb-8 tracking-[0.3em] uppercase">User Calibration</div></div>
              
              <BracketInput name="name" placeholder="IDENT_NAME" value={formData.name} onChange={handleChange} autoFocus />
              <BracketInput name="mobile" placeholder="COMMS_ID_10" type="tel" value={formData.mobile} onChange={handleChange} />

              <div className="flex items-center justify-center gap-8 py-4">
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={handleChange} className="accent-nexa-cyan w-4 h-4" />
                    <span className="text-[10px] font-mono text-zinc-500 group-hover:text-nexa-cyan transition-colors tracking-widest">MALE</span>
                 </label>
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={handleChange} className="accent-nexa-cyan w-4 h-4" />
                    <span className="text-[10px] font-mono text-zinc-500 group-hover:text-nexa-cyan transition-colors tracking-widest">FEMALE</span>
                 </label>
              </div>

              <div className="pt-6">
                  <CyberButton onClick={handleUserCreate} label="Initialize Core" loading={loading} />
              </div>

              <div className="pt-6 flex justify-between items-center px-1">
                  <button onClick={() => setMode('INIT')} className="text-[10px] text-zinc-500 hover:text-nexa-cyan font-mono tracking-widest uppercase transition-colors flex items-center gap-2 group"><span className="group-hover:-translate-x-1 transition-transform opacity-50">{'<<'}</span> Cancel</button>
                  <button onClick={switchToAdmin} className="text-[10px] text-zinc-500/40 hover:text-red-500 font-mono tracking-widest uppercase transition-colors">Admin_OS</button>
              </div>
            </div>
          )}

          {mode === 'KEY_INPUT' && (
            <div className="animate-slide-up space-y-4">
               <div className="text-center"><div className="text-nexa-cyan text-[10px] font-mono border border-nexa-cyan/20 inline-block px-4 py-1.5 mb-4 tracking-[0.3em] uppercase">Override Matrix</div></div>
               <p className="text-zinc-500 dark:text-zinc-400 text-[10px] text-center font-mono leading-relaxed tracking-wider px-2">Link your private Google GenAI key to bypass global rate limits and ensure maximum priority.</p>
               <BracketInput name="customApiKey" placeholder="GENAI_TOKEN_SECURE" type="password" value={formData.customApiKey} onChange={handleChange} autoFocus />
               <div className="pt-6 space-y-4">
                   <CyberButton onClick={saveCustomKey} label="Sync & Reboot" loading={loading} />
                   {hasCustomKey && <button onClick={clearCustomKey} className="w-full py-3 border border-red-900/30 text-red-500/70 hover:bg-red-500/10 hover:text-red-500 text-[10px] font-mono tracking-[0.3em] uppercase transition-all rounded-sm">Purge Key Data</button>}
                   <div className="text-center pt-2">
                       <button onClick={() => setMode('INIT')} className="text-[10px] text-zinc-500 hover:text-nexa-cyan font-mono tracking-widest uppercase transition-all">Return to Boot</button>
                   </div>
               </div>
            </div>
          )}

          {mode === 'ADMIN' && (
            <div className="animate-slide-up relative z-10">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-3 border border-red-500/40 px-5 py-2 bg-red-500/5 backdrop-blur-sm rounded-sm">
                  <div className="w-2 h-2 bg-red-500 animate-ping rounded-full"></div>
                  <span className="text-red-500 text-[10px] font-mono tracking-[0.4em] uppercase">Root Authority</span>
                </div>
              </div>
              <div className="space-y-6">
                <BracketInput name="username" placeholder="ROOT_IDENT" type="text" value={formData.username} onChange={handleChange} autoFocus variant="red" />
                <BracketInput name="password" placeholder="SECURE_PASS" type="password" value={formData.password} onChange={handleChange} variant="red" />
              </div>
              <div className="pt-10 space-y-6">
                <button onClick={handleAdminLogin} disabled={loading} className="w-full py-5 bg-red-600/90 text-white font-black tracking-[0.4em] hover:bg-red-500 hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all clip-corner uppercase text-xs" style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}>
                   {loading ? 'Validating...' : 'Authorize_Link'}
                </button>
                <button onClick={() => setMode('USER_CREATE')} className="text-[10px] text-red-500/50 hover:text-red-500 font-mono tracking-widest uppercase transition-all flex items-center justify-center gap-2 w-full group">
                   <span className="group-hover:-translate-x-1 transition-transform">{'<<'}</span> Abort Override
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-between mt-4 px-2 opacity-30"><div className={`text-[8px] ${mode === 'ADMIN' ? 'text-red-500' : 'text-nexa-cyan'} font-mono uppercase tracking-[0.2em]`}>Secured_Line</div><div className={`text-[8px] ${mode === 'ADMIN' ? 'text-red-500' : 'text-nexa-cyan'} font-mono tracking-[0.2em]`}>NEXA_V12_LOHAVE</div></div>
      </div>
      <div className="absolute bottom-16 text-center text-[9px] font-mono text-zinc-400 dark:text-nexa-cyan/20 tracking-[0.5em] animate-fade-in z-50 uppercase">Master Control Center</div>
      <InstallPWAButton />
    </div>
  );
};

export default Auth;