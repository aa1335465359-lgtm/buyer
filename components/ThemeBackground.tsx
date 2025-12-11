
import React, { useEffect, useRef } from 'react';

interface ThemeBackgroundProps {
  theme: string;
}

const ThemeBackground: React.FC<ThemeBackgroundProps> = ({ theme }) => {
  return (
    <>
      {/* === BACKGROUND LAYER (Behind UI, z-index: -1) === */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none select-none transition-all duration-500">
        
        {/* 1. GLASS (Default) */}
        {theme === 'glass' && (
          <div className="absolute inset-0 bg-[#f8fafc]">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[120px]" />
            <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] bg-purple-200/30 rounded-full blur-[100px]" />
          </div>
        )}

        {/* 2. MINECRAFT */}
        {theme === 'minecraft' && (
          <div className="absolute inset-0 bg-[#5d4037]">
             <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='64' height='64' viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='64' height='64' fill='%23795548'/%3E%3Crect x='4' y='4' width='8' height='8' fill='%235d4037'/%3E%3Crect x='20' y='12' width='8' height='8' fill='%235d4037'/%3E%3Crect x='40' y='4' width='8' height='8' fill='%238d6e63'/%3E%3Crect x='52' y='20' width='8' height='8' fill='%235d4037'/%3E%3Crect x='12' y='36' width='8' height='8' fill='%238d6e63'/%3E%3Crect x='36' y='44' width='8' height='8' fill='%235d4037'/%3E%3Crect x='52' y='52' width='8' height='8' fill='%238d6e63'/%3E%3C/svg%3E")`,
                backgroundSize: '64px 64px',
                imageRendering: 'pixelated'
             }} />
             <div className="absolute inset-0 bg-black/20" />
          </div>
        )}

        {/* 3. WARM WOODEN */}
        {theme === 'wooden' && (
          <div className="absolute inset-0 bg-[#deb887]">
             <div className="absolute inset-0 opacity-40 mix-blend-multiply" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='wood' width='100' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M0 0 Q 50 10 100 0' stroke='%238b4513' fill='none' opacity='0.2'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23wood)'/%3E%3C/svg%3E")`,
                backgroundSize: '200px 200px'
             }} />
          </div>
        )}

        {/* 4. WATERCOLOR */}
        {theme === 'watercolor' && (
          <div className="absolute inset-0 bg-[#fff]">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 via-purple-100/30 to-pink-100/40" />
             <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-300/10 rounded-full blur-3xl" />
             <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-300/10 rounded-full blur-3xl" />
          </div>
        )}

        {/* 5. KAWAII */}
        {theme === 'kawaii' && (
          <div className="absolute inset-0 bg-[#fff0f5]">
             <div className="absolute inset-0 bg-gradient-to-br from-[#ffe4e1] via-[#fff0f5] to-[#e6e6fa]" />
             <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#ffb7ce]/30 rounded-full blur-[80px]" />
             <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#b1dfff]/30 rounded-full blur-[80px]" />
             <div className="absolute inset-0 opacity-40" style={{
                 backgroundImage: `
                     radial-gradient(circle, #ff69b4 2px, transparent 2.5px),
                     radial-gradient(circle, #7bed9f 2px, transparent 2.5px),
                     radial-gradient(circle, #ffa502 2px, transparent 2.5px)
                 `,
                 backgroundSize: '60px 60px',
                 backgroundPosition: '0 0, 20px 20px, 40px 40px'
             }} />
             <div className="absolute inset-0 overflow-hidden">
                 <div className="absolute left-[10%] bottom-[-50px] text-[#ff69b4] opacity-50 text-2xl" style={{ animation: 'float-up 12s linear infinite' }}>★</div>
                 <div className="absolute left-[30%] bottom-[-50px] text-[#ffa502] opacity-40 text-xl" style={{ animation: 'float-up 15s linear infinite 2s' }}>★</div>
                 <div className="absolute left-[60%] bottom-[-50px] w-4 h-4 rounded-full bg-[#7bed9f] opacity-50" style={{ animation: 'float-up 10s linear infinite 5s' }}></div>
                 <div className="absolute left-[85%] bottom-[-50px] w-6 h-6 rounded-full bg-[#b1dfff] opacity-40" style={{ animation: 'float-up 18s linear infinite 1s' }}></div>
                 <div className="absolute left-[50%] bottom-[-50px] text-[#ffb7ce] opacity-50 text-2xl" style={{ animation: 'float-up 20s linear infinite 7s' }}>♥</div>
             </div>
          </div>
        )}

        {/* 6. PAPER */}
        {theme === 'paper' && (
          <div className="absolute inset-0 bg-[#e3d5ca]">
             <div className="absolute inset-0 opacity-60 mix-blend-multiply" style={{
               filter: 'contrast(120%) brightness(100%)',
               backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
             }} />
             <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 29px, rgba(140, 123, 108, 0.2) 30px)',
                backgroundSize: '100% 30px'
             }} />
             <div className="absolute inset-0 bg-radial-gradient(circle, transparent 60%, rgba(62, 39, 35, 0.1) 100%)" />
          </div>
        )}

        {/* 7. CYBER MATRIX */}
        {theme === 'sewer' && (
          <div className="absolute inset-0 bg-[#050505] overflow-hidden">
             <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'linear-gradient(#39ff14 1px, transparent 1px), linear-gradient(90deg, #39ff14 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
             }} />
             <div className="absolute inset-0 z-0 opacity-40" style={{
                 backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)',
                 backgroundSize: '2px 80vh',
                 animation: 'rain-fall 0.8s linear infinite'
             }} />
             <div className="absolute inset-0 z-0 opacity-20" style={{
                 backgroundImage: 'linear-gradient(to bottom, rgba(57, 255, 20, 0) 0%, rgba(57, 255, 20, 0.3) 50%, rgba(57, 255, 20, 0) 100%)',
                 backgroundSize: '3px 60vh',
                 backgroundPosition: '50px 0',
                 animation: 'rain-fall 1.5s linear infinite'
             }} />
             <div className="absolute top-0 right-[15%] w-[400px] h-[600px] pointer-events-none">
                  <div className="absolute top-[-100px] right-[50px] w-[600px] h-[600px] bg-[#39ff14] rounded-full blur-[150px] opacity-0 mix-blend-screen"
                       style={{ animation: 'lightning-flash-area 8s infinite 2s' }} />
                  <svg className="absolute top-0 left-[100px] w-full h-full opacity-0" 
                       viewBox="0 0 200 600" preserveAspectRatio="none"
                       style={{ animation: 'lightning-bolt-strike 8s infinite 2.1s' }}>
                      <path d="M100 0 L80 150 L140 150 L40 350 L90 350 L20 600" 
                            fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="bevel" />
                  </svg>
             </div>
             <div className="absolute top-[10%] left-[5%] w-[300px] h-[500px] pointer-events-none">
                  <div className="absolute top-[-50px] left-[-50px] w-[400px] h-[400px] bg-[#ccffcc] rounded-full blur-[120px] opacity-0 mix-blend-screen"
                       style={{ animation: 'lightning-flash-area 12s infinite 6s' }} />
                  <svg className="absolute top-0 left-0 w-full h-full opacity-0" 
                       viewBox="0 0 150 400" preserveAspectRatio="none"
                       style={{ animation: 'lightning-bolt-strike 12s infinite 6.1s', transform: 'scaleX(-1)' }}>
                     <path d="M75 0 L50 100 L90 100 L30 250 L60 250 L10 400" 
                           fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="bevel" />
                  </svg>
             </div>
          </div>
        )}

        {/* 8. CHRISTMAS (Background ONLY) */}
        {(theme === 'reindeer' || theme === 'christmas') && (
          <div className="absolute inset-0 bg-[#0E2A20] overflow-hidden">
             {/* Deep Forest Gradient */}
             <div className="absolute inset-0 bg-gradient-to-b from-[#0E2A20] via-[#0A2015] to-[#05100a]" />
             
             {/* Reindeer Silhouette (Bottom Right) - Kept in background layer */}
             <svg className="absolute bottom-0 right-10 w-[300px] h-[300px] opacity-10 text-[#E8C887] pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
                <path d="M70,70 L72,80 L70,90 L60,90 L58,80 L55,75 C55,75 50,70 45,70 C40,70 42,60 45,55 C48,50 50,45 50,40 C50,35 45,30 40,30 L35,20 C35,20 30,25 25,25 L20,20 C20,20 25,15 30,10 C35,5 40,10 45,15 L50,25 C50,25 55,20 60,25 C65,30 60,35 60,35 L65,40 C65,40 70,35 75,40 C80,45 75,50 75,50 L72,55 L75,65 Z" />
             </svg>
          </div>
        )}
      </div>

      {/* === FOREGROUND LAYER (Overlays UI, z-index: 100) === */}
      {(theme === 'reindeer' || theme === 'christmas') && <ChristmasSnowLayer />}
    </>
  );
};

// --- Christmas Snow Canvas Component ---
const ChristmasSnowLayer: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        interface Flake {
            x: number;
            y: number;
            r: number;        // Radius
            d: number;        // Density (sway offset)
            a: number;        // Alpha/Opacity
            speed: number;    // Fall speed
            layer: 'near' | 'mid' | 'far';
        }

        const flakes: Flake[] = [];
        const maxFlakes = 450; // Denser snow

        // Initialize Flakes
        for (let i = 0; i < maxFlakes; i++) {
            const r = Math.random();
            let layer: Flake['layer'] = 'far';
            let radius = 0;
            let speed = 0;
            let alpha = 0;

            // 40% Far, 40% Mid, 20% Near
            if (r < 0.4) {
                // FAR (Background)
                layer = 'far';
                radius = Math.random() * 1.5 + 1; // Small
                speed = Math.random() * 0.8 + 0.5; // Moderate speed
                alpha = Math.random() * 0.3 + 0.2; 
            } else if (r < 0.8) {
                // MID
                layer = 'mid';
                radius = Math.random() * 3 + 2; 
                speed = Math.random() * 1.5 + 1; 
                alpha = Math.random() * 0.4 + 0.3;
            } else {
                // NEAR (Foreground Fluffy)
                layer = 'near';
                radius = Math.random() * 6 + 4; // Big fluffy flakes
                speed = Math.random() * 1 + 0.5; // Slower float for big ones
                alpha = Math.random() * 0.4 + 0.4;
            }

            flakes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: radius,
                d: Math.random() * maxFlakes,
                a: alpha,
                speed: speed,
                layer: layer
            });
        }

        let angle = 0;

        const draw = () => {
            ctx.clearRect(0, 0, width, height);
            angle += 0.005; // Slightly slower sway frequency

            for (let i = 0; i < maxFlakes; i++) {
                const f = flakes[i];

                // Vertical Movement (Gravity)
                f.y += f.speed;
                
                // Horizontal Movement (Gentle Sway)
                // Reduced multiplier to stop "flying all over"
                // f.layer check: nearer flakes sway slightly more visibly
                f.x += Math.sin(angle + f.d) * (f.layer === 'near' ? 0.8 : 0.3);

                // Wrap around
                if (f.y > height + 10) {
                    f.y = -10;
                    f.x = Math.random() * width;
                }
                // Wrap horizontal
                if (f.x > width + 10) {
                    f.x = -10;
                } else if (f.x < -10) {
                    f.x = width + 10;
                }

                // Drawing Soft Flake
                ctx.beginPath();
                
                // 1. Define Path
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                
                // 2. Create "Fluffy" Gradient
                const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
                g.addColorStop(0, `rgba(255, 255, 255, ${f.a})`); // Core
                g.addColorStop(0.4, `rgba(255, 255, 255, ${f.a * 0.6})`); // Soft edge start
                g.addColorStop(1, `rgba(255, 255, 255, 0)`); // Fade out
                
                // 3. Fill
                ctx.fillStyle = g;
                ctx.fill();
            }
            requestAnimationFrame(draw);
        }

        const animId = requestAnimationFrame(draw);

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', handleResize);
        }
    }, []);

    // Z-INDEX 100 to ensure it covers UI
    return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[100]" />;
}

export default ThemeBackground;
