import React, { useState, useEffect } from 'react';
import { playSystemNotificationSound } from '../services/audioService';

const InstallPWAButton: React.FC = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (event: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            event.preventDefault();
            // Stash the event so it can be triggered later.
            setInstallPrompt(event);
            setIsVisible(true);
            playSystemNotificationSound();
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsVisible(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        
        // Show the install prompt
        installPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                setIsVisible(false);
            } else {
                console.log('User dismissed the install prompt');
            }
            setInstallPrompt(null);
        });
    };

    if (!isVisible) return null;
    
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-slide-up w-full max-w-xs">
            <button
                onClick={handleInstallClick}
                className="group relative w-full overflow-hidden bg-black/80 backdrop-blur-md border border-nexa-cyan/50 p-4 shadow-[0_0_20px_rgba(41,223,255,0.3)] flex items-center justify-between transition-all hover:bg-nexa-cyan/10"
            >
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center border border-nexa-cyan/30 rounded bg-nexa-cyan/5">
                        <svg className="w-6 h-6 text-nexa-cyan animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <div className="text-nexa-cyan font-bold font-mono text-xs tracking-widest">SYSTEM UPDATE</div>
                        <div className="text-zinc-400 text-[10px] font-mono">INSTALL NEXA APP PROTOCOL</div>
                    </div>
                </div>
                
                <div className="h-8 w-[1px] bg-nexa-cyan/30 mx-2"></div>

                <div className="text-nexa-cyan font-bold text-xs font-mono group-hover:text-white transition-colors">
                    INITIALIZE
                </div>

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-nexa-cyan"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-nexa-cyan"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-nexa-cyan"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-nexa-cyan"></div>
            </button>
        </div>
    );
};

export default InstallPWAButton;