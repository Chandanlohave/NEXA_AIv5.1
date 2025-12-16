// A self-contained service for generating UI sound effects using the Web Audio API.

// SINGLETON AUDIO CONTEXT FOR THE WHOLE APP
let globalAudioCtx: AudioContext | null = null;

export const getAudioContext = (): AudioContext => {
    if (!globalAudioCtx && typeof window !== 'undefined') {
        // FIX: Removed forced sampleRate: 24000. Let browser decide native hardware rate (usually 44.1k or 48k).
        // This prevents crashes on Android devices that don't support arbitrary context rates.
        globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ 
            latencyHint: 'interactive'
        });
    }
    return globalAudioCtx!;
};

/**
 * Crucial: Call this on the first user interaction (click/tap)
 */
export const initGlobalAudio = async () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        await ctx.resume();
    }
    
    // Play a silent buffer to fully "warm up" the audio pipeline on iOS/Android
    // Use the context's native sample rate for the buffer to ensure compatibility
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
};

const play = (nodes: (ctx: AudioContext, time: number) => AudioNode[]) => {
    const ctx = getAudioContext();
    
    // Ensure active
    if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.error("Audio resume failed", e));
    }
    
    const now = ctx.currentTime;
    const soundNodes = nodes(ctx, now);
    if (soundNodes.length > 0) {
        soundNodes[soundNodes.length-1].connect(ctx.destination);
    }
};

export const playStartupSound = () => {
    play((ctx, now) => {
        // Increased duration and gain for a more powerful effect
        const totalDuration = 2.0; 
        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(0, now);
        mainGain.gain.linearRampToValueAtTime(0.35, now + 0.05); // Louder
        mainGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);

        // Layer 1: Arc Reactor Power Hum
        const coreHum = ctx.createOscillator();
        coreHum.type = 'sawtooth';
        coreHum.frequency.setValueAtTime(50, now);
        coreHum.frequency.exponentialRampToValueAtTime(120, now + 1.2); // Longer ramp
        const coreFilter = ctx.createBiquadFilter();
        coreFilter.type = 'lowpass';
        coreFilter.frequency.setValueAtTime(80, now);
        coreFilter.frequency.exponentialRampToValueAtTime(500, now + 1.2);
        coreHum.connect(coreFilter);
        coreFilter.connect(mainGain);

        // Layer 2: Mechanical Servo Clicks
        for (let i = 0; i < 5; i++) { // More clicks
            const clickTime = now + 0.8 + i * 0.1;
            const noise = ctx.createBufferSource();
            const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let j = 0; j < data.length; j++) { data[j] = Math.random() * 2 - 1; }
            noise.buffer = buffer;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 3000 + i * 500;
            noiseFilter.Q.value = 20;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.3, clickTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.05);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(mainGain);
            noise.start(clickTime);
        }
        
        // Layer 3: System Online Chime
        const onlineChime = ctx.createOscillator();
        onlineChime.type = 'sine';
        onlineChime.frequency.value = getNoteFrequency('A6');
        const chimeGain = ctx.createGain();
        chimeGain.gain.setValueAtTime(0, now + 1.5);
        chimeGain.gain.linearRampToValueAtTime(0.2, now + 1.51);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);
        onlineChime.connect(chimeGain);
        chimeGain.connect(mainGain);
        
        coreHum.start(now);
        coreHum.stop(now + 1.3);
        onlineChime.start(now + 1.5);
        onlineChime.stop(now + 1.9);

        return [mainGain];
    });
};

export const playUserLoginSound = () => {
    play((ctx, now) => {
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        ['G5', 'C6', 'E6'].forEach((note, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = getNoteFrequency(note);
            osc.connect(gainNode);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.15);
        });
        return [gainNode];
    });
};

export const playAdminLoginSound = () => {
    play((ctx, now) => {
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

        const notes = ['C5', 'E5', 'G5', 'C6'];
        notes.forEach((note, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(getNoteFrequency(note), now);
            
            const oscGain = ctx.createGain();
            oscGain.gain.setValueAtTime(0, now + i * 0.08);
            oscGain.gain.linearRampToValueAtTime(1, now + i * 0.08 + 0.01);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8);

            osc.connect(oscGain);
            oscGain.connect(gainNode);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 1);
        });
        
        const shimmer = ctx.createOscillator();
        shimmer.type = 'triangle';
        shimmer.frequency.value = getNoteFrequency('G6');
        const shimmerGain = ctx.createGain();
        shimmerGain.gain.setValueAtTime(0, now + 0.3);
        shimmerGain.gain.linearRampToValueAtTime(0.05, now + 0.4);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(gainNode);
        
        shimmer.start(now + 0.3);
        shimmer.stop(now + 1.2);

        return [gainNode];
    });
};

export const playMicOnSound = () => {
    play((ctx, now) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.1);
        return [gain];
    });
};

export const playMicOffSound = () => {
    play((ctx, now) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.1);
        return [gain];
    });
};

export const playErrorSound = () => {
    play((ctx, now) => {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        [440, 466.16].forEach(freq => { 
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = freq;
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.2);
        });
        return [gain];
    });
};

export const playSystemNotificationSound = () => {
    play((ctx, now) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.3);
        
        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(100, now);
        osc2.frequency.linearRampToValueAtTime(200, now + 0.1);
        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0.05, now);
        gain2.gain.linearRampToValueAtTime(0, now + 0.1);
        
        osc2.connect(gain2);
        osc2.start(now);
        osc2.stop(now + 0.1);

        return [gain, gain2];
    });
};

const noteFrequencies: { [note: string]: number } = {
    'C4': 261.63, 'G4': 392.00, 'C5': 523.25, 'E5': 659.25, 'G5': 783.99,
    'A5': 880.00, 'C6': 1046.50, 'C#6': 1108.73, 'E6': 1318.51, 'F#6': 1479.98,
    'A6': 1760.00, 'G6': 1567.98,
};

const getNoteFrequency = (note: string): number => {
    return noteFrequencies[note] || 440;
};