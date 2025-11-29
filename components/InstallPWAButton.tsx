import React, { useState, useEffect } from 'react';

// Simple download/install icon
const InstallIcon = () => (
    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const InstallPWAButton: React.FC = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            setInstallPrompt(null);
        });
    };

    if (!installPrompt) {
        return null;
    }
    
    return (
        <button
            onClick={handleInstallClick}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center bg-nexa-cyan/10 border border-nexa-cyan/30 text-nexa-cyan px-4 py-2 text-xs font-mono tracking-widest hover:bg-nexa-cyan hover:text-black transition-all duration-300 animate-fade-in"
        >
            <InstallIcon />
            INSTALL NEXA
        </button>
    );
};

export default InstallPWAButton;
