
import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

// --- HELPER COMPONENTS ---

const BracketInput = ({ name, placeholder, type = 'text', value, onChange, autoFocus, variant = 'cyan' }: any) => {
  const colorClass = variant === 'red' ? 'text-red-500' : 'text-nexa-cyan';
  const borderClass = variant === 'red' ? 'bg-red-500' : 'bg-nexa-cyan';
  const placeholderClass = variant === 'red' ? 'placeholder-red-500/20' : 'placeholder-nexa-cyan/20';

  return (
    <div className="relative group z-50 my-6">
      <div className="flex items-center">
        <span className={`${colorClass} opacity-50 text-2xl font-light group-focus-within:opacity-100 transition-opacity duration-300`}>[</span>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
          className={`w-full bg-transparent border-none text-white text-center font-mono text-base focus:ring-0 focus:outline-none ${placeholderClass} z-50 tracking-widest relative z-10`}
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
        ? 'bg-transparent border border-nexa-cyan/30 text-nexa-cyan/60 hover:text-white hover:border-nexa-cyan' 
        : 'bg-nexa-cyan text-black hover:bg-white hover:shadow-[0_0_20px_rgba(41,223,255,0.6)]'
      }
    `}
    style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
  >
    {loading ? (
      <span className="flex items-center justify-center gap-2">
         <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
         PROCESSING
      </span>
    ) : label}
  </button>
);

// --- MAIN AUTH COMPONENT ---

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'INIT' | 'USER' | 'ADMIN' | 'OTP'>('INIT');
  
  // Inputs
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    mobile: '',
    otp: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [glitchText, setGlitchText] = useState('SYSTEM_LOCKED');

  // Random glitch effect for header
  useEffect(() => {
    const texts = ['SYSTEM_LOCKED', 'ENCRYPTION_ACTIVE', 'AWAITING_KEY', 'NEXA_PROTOCOL'];
    let interval: any;
    if (mode === 'INIT') {
      interval = setInterval(() => {
        setGlitchText(texts[Math.floor(Math.random() * texts.length)]);
      }, 2000);
    } else {
      setGlitchText('ACCESS_GATEWAY');
    }
    return () => clearInterval(interval);
  }, [mode]);

  // Handle Input Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // --- FLOW HANDLERS ---

  const initiateSystem = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setMode('USER');
    }, 1500);
  };

  const handleAdminLogin = () => {
    if (formData.username === 'Chandan' && formData.password === 'Nexa') {
      completeLogin({
        name: 'Chandan',
        mobile: '0000000000',
        role: UserRole.ADMIN,
        theme: 'DARK_NEON',
        chatHistory: [],
        preferences: { voice: 'default', speed: 1, pitch: 1 }
      });
    } else {
      setError('// ERROR: INVALID CREDENTIALS');
    }
  };

  const requestOtp = () => {
    // Validation Rule: Full name must be alphabets/spaces only, min 3 chars
    const nameRegex = /^[a-zA-Z\s]{3,}$/;

    if (!nameRegex.test(formData.fullName)) {
      setError('// ERROR: INVALID NAME (MIN 3 CHARS, ALPHA ONLY)');
      return;
    }
    if (formData.mobile.length !== 10 || isNaN(Number(formData.mobile))) {
      setError('// ERROR: INVALID MOBILE (10 DIGITS)');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(code);
      setLoading(false);
      setMode('OTP');
    }, 1500);
  };

  const verifyOtp = () => {
    if (formData.otp === generatedOtp) {
      completeLogin({
        name: formData.fullName,
        mobile: formData.mobile,
        role: UserRole.USER,
        theme: 'DARK_NEON',
        chatHistory: [],
        preferences: { voice: 'default', speed: 1, pitch: 1 }
      });
    } else {
      setError('// ERROR: MISMATCH DETECTED');
    }
  };

  const completeLogin = (profile: UserProfile) => {
    setLoading(true);
    setTimeout(() => {
      onLogin(profile);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 z-[60] overflow-hidden">
      
      {/* --- BACKGROUND LAYERS --- */}
      <div className="absolute inset-0 z-0 opacity-20">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-nexa-cyan/20 rounded-full animate-spin-slow"></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-dashed border-nexa-cyan/20 rounded-full animate-spin-reverse-slow"></div>
      </div>
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(41,223,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(41,223,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none"></div>

      {/* --- MAIN HUD CONTAINER --- */}
      <div className="relative w-full max-w-sm z-50">
        
        {/* Frame Markers (Responsive Color) */}
        <div className={`absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div>
        <div className={`absolute -top-4 -right-4 w-8 h-8 border-t-2 border-r-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div>
        <div className={`absolute -bottom-4 -left-4 w-8 h-8 border-b-2 border-l-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div>
        <div className={`absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 ${mode === 'ADMIN' ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div>
        
        {/* Top Status Bar */}
        <div className={`flex justify-between items-center mb-8 border-b ${mode === 'ADMIN' ? 'border-red-500/20' : 'border-nexa-cyan/20'} pb-2 transition-colors duration-500`}>
           <div className={`text-[10px] ${mode === 'ADMIN' ? 'text-red-500' : 'text-nexa-cyan'} font-mono tracking-widest`}>{glitchText}</div>
           <div className="flex gap-1">
              <div className={`w-1 h-1 ${mode === 'ADMIN' ? 'bg-red-500' : 'bg-nexa-cyan'} animate-pulse`}></div>
              <div className={`w-1 h-1 ${mode === 'ADMIN' ? 'bg-red-500' : 'bg-nexa-cyan'} animate-pulse delay-75`}></div>
              <div className={`w-1 h-1 ${mode === 'ADMIN' ? 'bg-red-500' : 'bg-nexa-cyan'} animate-pulse delay-150`}></div>
           </div>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className={`backdrop-blur-md border p-6 relative transition-all duration-500 ${mode === 'ADMIN' ? 'bg-red-900/10 border-red-500/20' : 'bg-black/60 border-nexa-cyan/10'}`}>
          
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-2 bg-red-900/20 border-l-2 border-red-500 text-red-500 text-[10px] font-mono tracking-wider animate-pulse">
              {error}
            </div>
          )}

          {/* MODE: INIT */}
          {mode === 'INIT' && (
            <div className="flex flex-col items-center py-10 animate-fade-in">
               {/* Animated Core Reactor */}
               <div 
                 onClick={initiateSystem}
                 className="relative w-32 h-32 flex items-center justify-center cursor-pointer group"
               >
                  <div className="absolute inset-0 bg-nexa-cyan/10 rounded-full blur-xl group-hover:bg-nexa-cyan/30 transition-all duration-500"></div>
                  <div className="absolute w-full h-full border-2 border-nexa-cyan rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute w-[80%] h-[80%] border-2 border-dashed border-nexa-cyan/50 rounded-full animate-spin-reverse-slow"></div>
                  <div className="absolute w-[40%] h-[40%] bg-nexa-cyan rounded-full animate-pulse shadow-[0_0_20px_currentColor]"></div>
               </div>
               
               <div className="mt-8 text-center space-y-2">
                 <h1 className="text-4xl font-bold text-white tracking-widest">NEXA</h1>
                 <div className="text-nexa-cyan/60 text-xs font-mono tracking-[0.3em] group-hover:text-nexa-cyan transition-colors">
                   {loading ? 'INITIALIZING...' : 'TAP TO CONNECT'}
                 </div>
               </div>
            </div>
          )}

          {/* MODE: USER */}
          {mode === 'USER' && (
            <div className="animate-slide-up space-y-6">
               <div className="text-center">
                  <div className="text-nexa-cyan text-xs font-mono border border-nexa-cyan/30 inline-block px-2 py-1 mb-4">IDENTITY REQUIRED</div>
               </div>
               
               <div>
                 <BracketInput name="fullName" placeholder="NAME" value={formData.fullName} onChange={handleChange} autoFocus />
                 <BracketInput name="mobile" placeholder="MOBILE" type="tel" value={formData.mobile} onChange={handleChange} />
               </div>

               <div className="pt-4 space-y-4">
                 <CyberButton onClick={requestOtp} label="INITIATE" loading={loading} />
                 <div className="text-center">
                   <button onClick={() => setMode('ADMIN')} className="text-[9px] text-zinc-600 hover:text-nexa-cyan font-mono tracking-widest uppercase transition-colors">
                     // Admin Console
                   </button>
                 </div>
               </div>
            </div>
          )}

          {/* MODE: ADMIN */}
          {mode === 'ADMIN' && (
            <div className="animate-slide-up relative z-10">
               {/* Danger Background Pattern */}
               <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(220,38,38,0.05)_0px,rgba(220,38,38,0.05)_10px,transparent_10px,transparent_20px)] pointer-events-none -z-10"></div>
               
               <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 border border-red-500/50 px-3 py-1 bg-red-500/10 backdrop-blur-sm">
                     <div className="w-2 h-2 bg-red-500 animate-pulse rounded-full"></div>
                     <span className="text-red-500 text-[10px] font-mono tracking-[0.2em] uppercase">Security Level 8</span>
                  </div>
               </div>

               {/* Decorative Lock (Background) */}
               <div className="absolute top-10 right-4 opacity-5 pointer-events-none">
                  <svg className="w-24 h-24 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17a2 2 0 100-4 2 2 0 000 4zm6-9a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h1V6a5 5 0 0110 0v2h1zM8 6a4 4 0 018 0v2H8V6z"/></svg>
               </div>
               
               <div className="space-y-4 relative z-20">
                 <BracketInput name="username" placeholder="IDENTITY_ID" value={formData.username} onChange={handleChange} autoFocus variant="red" />
                 <BracketInput name="password" placeholder="ACCESS_KEY" type="password" value={formData.password} onChange={handleChange} variant="red" />
               </div>

               <div className="pt-8 space-y-4 relative z-20">
                 <button
                   onClick={handleAdminLogin}
                   disabled={loading}
                   className="w-full py-4 bg-red-600 text-white font-bold tracking-[0.2em] hover:bg-red-500 hover:shadow-[0_0_25px_rgba(220,38,38,0.8)] transition-all clip-corner relative overflow-hidden group"
                   style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                 >
                   <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                   <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? 'AUTHENTICATING...' : <>AUTHORIZE OVERRIDE <span className="text-xs opacity-70">>></span></>}
                   </span>
                 </button>
                 
                 <div className="mt-2">
                    <button onClick={() => setMode('USER')} className="text-[9px] text-red-500/60 hover:text-red-500 font-mono tracking-widest uppercase transition-colors flex items-center justify-center gap-2 w-full group">
                      <span className="group-hover:-translate-x-1 transition-transform">&lt;&lt;</span> ABORT SEQUENCE
                    </button>
                 </div>
               </div>
            </div>
          )}

          {/* MODE: OTP */}
          {mode === 'OTP' && (
            <div className="animate-slide-up text-center space-y-8 py-4">
              <div className="space-y-2">
                 <div className="text-nexa-cyan text-xs font-mono">SECURE TRANSMISSION RECEIVED</div>
                 <div className="text-white text-3xl font-mono tracking-[0.3em] border border-nexa-cyan/20 py-4 bg-nexa-cyan/5">
                   {generatedOtp}
                 </div>
                 <div className="text-[9px] text-zinc-500">Wait time: 00:00:00</div>
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  maxLength={4}
                  value={formData.otp}
                  onChange={(e) => {
                    setFormData({ ...formData, otp: e.target.value });
                    setError('');
                  }}
                  className="w-full bg-transparent border-b-2 border-nexa-cyan text-white text-center text-4xl font-mono focus:outline-none py-2 tracking-[0.5em]"
                  placeholder="____"
                  autoFocus
                />
                
                <CyberButton onClick={verifyOtp} label="AUTHENTICATE" loading={loading} />
              </div>
            </div>
          )}

        </div>

        {/* Footer Data */}
        <div className="flex justify-between mt-2 px-2">
           <div className={`text-[8px] ${mode === 'ADMIN' ? 'text-red-500/40' : 'text-nexa-cyan/40'} font-mono`}>SECURE CONNECTION</div>
           <div className={`text-[8px] ${mode === 'ADMIN' ? 'text-red-500/40' : 'text-nexa-cyan/40'} font-mono`}>V.9.0.1</div>
        </div>

      </div>

      {/* Styles for clip-path support */}
      <style>{`
        .clip-corner {
          clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
        }
      `}</style>
    </div>
  );
};

export default Auth;
