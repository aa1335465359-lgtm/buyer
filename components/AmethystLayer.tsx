
import React, { useEffect, useRef } from 'react';

const AmethystLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Configuration
    // Deep, dark violet gradients for luxury feel
    const colors = [
        { r: 26, g: 22, b: 36 },   // #1A1624 Slate Violet
        { r: 10, g: 8, b: 13 },    // #0A080D Near Black
        { r: 78, g: 52, b: 92 },   // #4E345C Eggplant (Highlights)
        { r: 40, g: 30, b: 50 }    // Mid-tone
    ];

    const orbs: {x: number, y: number, r: number, vx: number, vy: number, color: any, alpha: number}[] = [];
    
    // Create large, slow moving ambient lights
    for(let i=0; i<6; i++) {
        orbs.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 300 + 200, // Giant blobs
            vx: (Math.random() - 0.5) * 0.2, // Very slow
            vy: (Math.random() - 0.5) * 0.2,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: Math.random() * 0.3 + 0.1
        });
    }

    // Occasional "Crystal Glint" particles
    const glints: {x: number, y: number, size: number, life: number, maxLife: number}[] = [];

    const animate = () => {
        // Clear with base dark color
        ctx.fillStyle = '#0A080D';
        ctx.fillRect(0, 0, width, height);

        // Draw Ambient Orbs
        orbs.forEach(orb => {
            orb.x += orb.vx;
            orb.y += orb.vy;

            // Bounce gently
            if(orb.x < -200 || orb.x > width + 200) orb.vx *= -1;
            if(orb.y < -200 || orb.y > height + 200) orb.vy *= -1;

            const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
            grad.addColorStop(0, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, ${orb.alpha})`);
            grad.addColorStop(1, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, 0)`);
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Spawn Glints (Rarely)
        if(Math.random() < 0.02) {
            glints.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2,
                life: 0,
                maxLife: 100 + Math.random() * 50
            });
        }

        // Draw Glints (Tiny gold sparkles)
        ctx.fillStyle = '#C2B280'; // Champagne Gold
        for(let i = glints.length - 1; i >= 0; i--) {
            const g = glints[i];
            g.life++;
            if(g.life > g.maxLife) {
                glints.splice(i, 1);
                continue;
            }
            
            // Fade in/out
            const opacity = Math.sin((g.life / g.maxLife) * Math.PI) * 0.8;
            ctx.globalAlpha = opacity;
            
            ctx.beginPath();
            // Cross shape for glint
            ctx.moveTo(g.x - g.size*4, g.y); ctx.lineTo(g.x + g.size*4, g.y);
            ctx.moveTo(g.x, g.y - g.size*4); ctx.lineTo(g.x, g.y + g.size*4);
            ctx.strokeStyle = '#C2B280';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            
            // Core
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#0A080D] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      {/* Texture: Brushed Metal / Noise Overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-60" />
    </div>
  );
};

export default AmethystLayer;
