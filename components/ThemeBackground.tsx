
import React from 'react';

interface ThemeBackgroundProps {
  theme: string;
}

const ThemeBackground: React.FC<ThemeBackgroundProps> = ({ theme }) => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none select-none transition-all duration-500">
      
      {/* 1. GLASS (Default) */}
      {theme === 'glass' && (
        <div className="absolute inset-0 bg-[#f8fafc]">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[120px]" />
          <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] bg-purple-200/30 rounded-full blur-[100px]" />
        </div>
      )}

      {/* 2. PIXEL RETRO (Console Grey) */}
      {theme === 'pixel' && (
        <div className="absolute inset-0 bg-[#c0c0c0]">
          {/* Dot Grid */}
          <div className="absolute inset-0 opacity-10" style={{ 
            backgroundImage: 'radial-gradient(#444 1.5px, transparent 1.5px)', 
            backgroundSize: '12px 12px' 
          }} />
          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{
            background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
            backgroundSize: '100% 3px, 3px 100%'
          }} />
        </div>
      )}

      {/* 3. WARM WOODEN (Texture) */}
      {theme === 'wooden' && (
        <div className="absolute inset-0 bg-[#deb887]">
           {/* Wood Grain Texture CSS */}
           <div className="absolute inset-0 opacity-40 mix-blend-multiply" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='wood' width='100' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M0 0 Q 50 10 100 0' stroke='%238b4513' fill='none' opacity='0.2'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23wood)'/%3E%3C/svg%3E")`,
              backgroundSize: '200px 200px'
           }} />
           {/* Noise overlay for texture */}
           <div className="absolute inset-0 opacity-20" style={{
               filter: 'contrast(150%) brightness(100%)',
               backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
           }} />
        </div>
      )}

      {/* 4. WATERCOLOR (Artistic) */}
      {theme === 'watercolor' && (
        <div className="absolute inset-0 bg-[#fff]">
           {/* Paper Texture */}
           <div className="absolute inset-0 opacity-30 mix-blend-multiply" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`
           }} />
           {/* Watercolor Blots */}
           <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-400/20 rounded-[40%] blur-[80px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }} />
           <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-purple-400/20 rounded-[45%] blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: '10s' }} />
           <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-pink-300/20 rounded-[50%] blur-[60px] mix-blend-multiply animate-pulse" style={{ animationDuration: '12s' }} />
        </div>
      )}

      {/* 5. KAWAII (Pattern) */}
      {theme === 'kawaii' && (
        <div className="absolute inset-0 bg-[#fff5f7]">
          {/* Polka Dots */}
           <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: 'radial-gradient(#fbcfe8 20%, transparent 20%), radial-gradient(#fbcfe8 20%, transparent 20%)',
              backgroundPosition: '0 0, 20px 20px',
              backgroundSize: '40px 40px'
           }} />
        </div>
      )}

      {/* 6. PAPER (Grid) */}
      {theme === 'paper' && (
        <div className="absolute inset-0 bg-[#fff]">
           {/* Graph Paper Grid */}
           <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '24px 24px'
           }} />
        </div>
      )}
    </div>
  );
};

export default ThemeBackground;
