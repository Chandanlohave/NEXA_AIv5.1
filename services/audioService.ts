// A self-contained service for generating UI sound effects using the Web Audio API.

// SINGLETON AUDIO CONTEXT FOR THE WHOLE APP
// This ensures SFX and TTS share the same "unlocked" state.
let globalAudioCtx: AudioContext | null = null;

export const getAudioContext = (): AudioContext => {
    if (!globalAudioCtx && typeof window !== 'undefined') {
        // Mobile browsers often need 'webkitAudioContext'
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        globalAudioCtx = new AudioContextClass({ 
            latencyHint: 'interactive',
            sampleRate: 24000 // Force 24kHz to match Gemini output if possible, reduces resampling artifacts
        });
    }
    return globalAudioCtx!;
};

/**
 * CRITICAL: Call this on the first user interaction (click/tap)
 * This "unlocks" the audio engine on mobile devices.
 */
export const initGlobalAudio = async () => {
    const ctx = getAudioContext();
    
    // 1. Resume Context
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
        } catch (e) {
            console.error("Audio resume failed during init", e);
        }
    }
    
    // 2. Play a Silent Buffer (The "Mobile Unlock" Trick)
    // We play a very short buffer of 0.1s to force the audio hardware to wake up.
    try {
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        console.log("NEXA Core: Audio Engine Unlocked");
    } catch (e) {
        console.error("Audio unlock buffer failed", e);
    }
};

// Helper to play sounds
const play = (nodes: (ctx: AudioContext, time: number) => AudioNode[]) => {
    const ctx = getAudioContext();
    
    // Always try to resume if suspended
    if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.error("Audio resume failed", e));
    }
    
    const now = ctx.currentTime;
    const soundNodes = nodes(ctx, now);
    if (soundNodes.length > 0) {
        soundNodes[soundNodes.length-1].connect(ctx.destination);
    }
};

// --- SFX DEFINITIONS ---

export const playStartupSound = () => {
    play((ctx, now) => {
        const totalDuration = 1.5;
        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(0, now);
        mainGain.gain.linearRampToValueAtTime(0.9, now + 0.05); // Faster, louder attack
        mainGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);

        // 1. Low-end punch
        const punchOsc = ctx.createOscillator();
        punchOsc.type = 'sine';
        punchOsc.frequency.setValueAtTime(120, now);
        punchOsc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        const punchGain = ctx.createGain();
        punchGain.gain.setValueAtTime(1.0, now);
        punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        punchOsc.connect(punchGain);
        punchGain.connect(mainGain);

        // 2. High-energy riser
        const riserOsc = ctx.createOscillator();
        riserOsc.type = 'sawtooth';
        riserOsc.frequency.setValueAtTime(200, now);
        riserOsc.frequency.exponentialRampToValueAtTime(6000, now + 0.5); // Very fast rise
        const riserGain = ctx.createGain();
        riserGain.gain.setValueAtTime(0, now);
        riserGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
        riserGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        riserOsc.connect(riserGain);
        riserGain.connect(mainGain);

        // 3. Impact/Clang at 0.5s
        const impactTime = now + 0.5;
        
        // White noise burst
        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) { data[i] = Math.random() * 2 - 1; }
        noise.buffer = buffer;
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 3000;
        noiseFilter.Q.value = 10;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, impactTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, impactTime + 0.2);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(mainGain);

        // Metallic clang using FM synthesis
        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(600, impactTime);
        carrier.frequency.exponentialRampToValueAtTime(100, impactTime + 0.6);

        const modulator = ctx.createOscillator();
        modulator.type = 'square';
        modulator.frequency.setValueAtTime(900, impactTime);
        modulator.frequency.exponentialRampToValueAtTime(150, impactTime + 0.6);
        
        const modulatorGain = ctx.createGain();
        modulatorGain.gain.setValueAtTime(800, impactTime); // Modulation depth
        modulatorGain.gain.exponentialRampToValueAtTime(1, impactTime + 0.6);

        const clangGain = ctx.createGain();
        clangGain.gain.setValueAtTime(0, impactTime);
        clangGain.gain.linearRampToValueAtTime(0.6, impactTime + 0.02);
        clangGain.gain.exponentialRampToValueAtTime(0.0001, impactTime + 0.8);
        
        modulator.connect(modulatorGain);
        modulatorGain.connect(carrier.frequency); // FM
        carrier.connect(clangGain);
        clangGain.connect(mainGain);

        punchOsc.start(now);
        punchOsc.stop(now + 0.4);
        riserOsc.start(now);
        riserOsc.stop(now + 0.5);
        noise.start(impactTime);
        carrier.start(impactTime);
        carrier.stop(impactTime + 0.8);
        modulator.start(impactTime);
        modulator.stop(impactTime + 0.8);

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