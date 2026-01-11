import React, { useEffect, useRef } from 'react';
import { HUDState } from '../types';

interface HUDProps {
  state: HUDState;
  onClick?: () => void;
}

const HUD: React.FC<HUDProps> = ({ state, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const animState = useRef({
    streaks: [] as any[],
    motes: [] as any[],
    animationId: 0,
    time: 0,
    targetColor: { r: 41, g: 223, b: 255 },
    currentColor: { r: 41, g: 223, b: 255 },
  });

  useEffect(() => {
    switch (state) {
      case HUDState.LISTENING:
        animState.current.targetColor = { r: 0, g: 255, b: 210 };
        break;
      case HUDState.THINKING:
        animState.current.targetColor = { r: 255, g: 190, b: 50 };
        break;
      case HUDState.SPEAKING:
        animState.current.targetColor = { r: 66, g: 133, b: 255 };
        break;
      default:
        animState.current.targetColor = { r: 41, g: 223, b: 255 };
        break;
    }
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // --- 4K / RETINA SCALING LOGIC ---
    const LOGICAL_SIZE = 460;
    const dpr = window.devicePixelRatio || 1;
    
    // Set the internal resolution to match the device's pixel density
    // This ensures sharp rendering on 4K/Retina displays
    canvas.width = LOGICAL_SIZE * dpr;
    canvas.height = LOGICAL_SIZE * dpr;
    
    // Lock the CSS display size
    canvas.style.width = `${LOGICAL_SIZE}px`;
    canvas.style.height = `${LOGICAL_SIZE}px`;

    // Scale the context so drawing commands work in logical pixels
    ctx.scale(dpr, dpr);
    // ---------------------------------

    const STREAK_COUNT = 450;
    const MOTE_COUNT = 200;
    const streaks: any[] = [];
    const motes: any[] = [];

    for (let i = 0; i < STREAK_COUNT; i++) {
      streaks.push({
        angle: Math.random() * Math.PI * 2,
        baseRadius: 82 + Math.random() * 28,
        speed: (0.003 + Math.random() * 0.012) * (Math.random() > 0.5 ? 1 : -1),
        arcLen: 0.05 + Math.random() * 0.7,
        // ENHANCED VISIBILITY: Thicker lines
        width: 1.2 + Math.random() * 2.8,
        // ENHANCED VISIBILITY: Higher opacity
        opacity: 0.45 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        jitter: Math.random() * 2
      });
    }

    for (let i = 0; i < MOTE_COUNT; i++) {
      motes.push({
        angle: Math.random() * Math.PI * 2,
        dist: 70 + Math.random() * 150,
        size: Math.random() * 1.5,
        speed: 0.2 + Math.random() * 0.8,
        pulse: Math.random() * Math.PI
      });
    }

    const animate = () => {
      animState.current.time += 0.016;
      const t = animState.current.time;
      const { r, g, b } = animState.current.currentColor;
      const target = animState.current.targetColor;

      animState.current.currentColor.r += (target.r - r) * 0.05;
      animState.current.currentColor.g += (target.g - g) * 0.05;
      animState.current.currentColor.b += (target.b - b) * 0.05;

      const cx = LOGICAL_SIZE / 2;
      const cy = LOGICAL_SIZE / 2;

      ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
      
      // OPTIMIZATION: Gravitational Lens / Contrast Buffer
      const isDarkMode = document.documentElement.classList.contains('dark');
      if (!isDarkMode) {
        ctx.globalCompositeOperation = 'source-over';
        const lensGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
        // Darker shadow for better contrast on light backgrounds
        lensGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        lensGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.15)');
        lensGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lensGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 140, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'lighter';

      motes.forEach((m, i) => {
        m.angle += 0.002 * m.speed;
        const drift = Math.sin(t * 0.5 + i) * 15;
        const px = cx + Math.cos(m.angle) * (m.dist + drift);
        const py = cy + Math.sin(m.angle) * (m.dist + drift);
        const mAlpha = 0.4 * (0.5 + Math.sin(t * 2 + m.pulse) * 0.5);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${mAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, m.size, 0, Math.PI * 2);
        ctx.fill();
      });

      streaks.forEach((s, i) => {
        let radius = s.baseRadius;
        let speed = s.speed;
        let arcLen = s.arcLen;

        if (state === HUDState.SPEAKING) {
          const breathing = Math.sin(t * 2.4) * 14; 
          radius += breathing + (Math.sin(t * 15 + i) * 1.5);
          arcLen *= 1.5;
          speed *= 1.4;
        } else if (state === HUDState.LISTENING) {
          const intake = Math.sin(t * 55 + i) * 5;
          radius = (s.baseRadius * 0.82) + intake;
          speed *= 3.5;
          arcLen *= 0.6;
        } else if (state === HUDState.THINKING) {
          radius *= 0.75;
          speed = (i % 2 === 0 ? 0.09 : -0.09);
          arcLen = 0.9;
        } else {
          radius += Math.sin(t + s.phase) * 6;
        }

        s.angle += speed;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, s.angle, s.angle + arcLen);
        
        const hueR = Math.min(255, r + Math.sin(t * 1.5 + i) * 35);
        const hueB = Math.min(255, b + Math.cos(t * 1.5 + i) * 55);
        // Enhanced opacity for clearer visibility
        const sAlpha = s.opacity * (0.7 + Math.sin(t * 4 + i) * 0.3);

        ctx.strokeStyle = `rgba(${hueR}, ${g}, ${hueB}, ${sAlpha})`;
        ctx.lineWidth = s.width;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (i % 20 === 0) {
          const sx = cx + Math.cos(s.angle + arcLen) * radius;
          const sy = cy + Math.sin(s.angle + arcLen) * radius;
          ctx.fillStyle = `rgba(255, 255, 255, ${sAlpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, s.width * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.globalCompositeOperation = 'destination-out';
      const voidGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70);
      voidGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      voidGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.9)');
      voidGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = voidGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'lighter';
      const rim = ctx.createRadialGradient(cx, cy, 65, cx, cy, 75);
      rim.addColorStop(0, 'transparent');
      // Stronger rim for better definition
      rim.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.8)`);
      rim.addColorStop(1, 'transparent');
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, 75, 0, Math.PI * 2);
      ctx.fill();

      animState.current.animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animState.current.animationId);
  }, [state]);

  return (
    <div 
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer active:scale-90 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group"
    >
      <canvas 
        ref={canvasRef} 
        className="relative z-10 block"
      />
      
      <div 
        className="absolute w-[240px] h-[240px] rounded-full blur-[100px] pointer-events-none transition-all duration-1000 opacity-20 group-hover:opacity-40"
        style={{ 
          backgroundColor: `rgb(${animState.current.currentColor.r}, ${animState.current.currentColor.g}, ${animState.current.currentColor.b})`,
          transform: state === HUDState.SPEAKING ? 'scale(1.5)' : 'scale(1)'
        }}
      ></div>

      <div 
        className="absolute w-[140px] h-[140px] rounded-full border border-zinc-200 dark:border-white/5 bg-zinc-100/10 dark:bg-gradient-to-br dark:from-white/5 dark:to-transparent pointer-events-none transition-transform duration-1000 shadow-xl"
        style={{ transform: `scale(${state === HUDState.LISTENING ? 0.85 : 1})` }}
      ></div>
    </div>
  );
};

export default HUD;