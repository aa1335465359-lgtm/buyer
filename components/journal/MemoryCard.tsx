import React, { useRef } from 'react';
import { MemoryResult } from '../../types';
import * as htmlToImage from 'html-to-image';

interface MemoryCardProps {
  memory: MemoryResult | null;
  isGenerating?: boolean;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, isGenerating }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const colors = {
    sunset: { bg: 'from-[#FFECE3] to-[#FFD8C9]', accent: 'text-[#E07A5F]', blob1: 'bg-[#FFA88C]', blob2: 'bg-[#FFC3A0]' },
    ocean: { bg: 'from-[#E3F2FD] to-[#BBDEFB]', accent: 'text-[#1976D2]', blob1: 'bg-[#90CAF9]', blob2: 'bg-[#64B5F6]' },
    matcha: { bg: 'from-[#F1F8E9] to-[#DCEDC8]', accent: 'text-[#689F38]', blob1: 'bg-[#C5E1A5]', blob2: 'bg-[#AED581]' },
    lavender: { bg: 'from-[#F3E5F5] to-[#E1BEE7]', accent: 'text-[#8E24AA]', blob1: 'bg-[#CE93D8]', blob2: 'bg-[#BA68C8]' },
    peach: { bg: 'from-[#FBE9E7] to-[#FFCCBC]', accent: 'text-[#F4511E]', blob1: 'bg-[#FFAB91]', blob2: 'bg-[#FF8A65]' },
    stone: { bg: 'from-[#ECEFF1] to-[#CFD8DC]', accent: 'text-[#546E7A]', blob1: 'bg-[#B0BEC5]', blob2: 'bg-[#90A4AE]' },
    abyssal: { bg: 'from-[#1A237E] to-[#0D47A1]', accent: 'text-[#8C9EFF]', blob1: 'bg-[#3F51B5]', blob2: 'bg-[#303F9F]', isDark: true },
    warm_ember: { bg: 'from-[#3E2723] to-[#4E342E]', accent: 'text-[#FFCC80]', blob1: 'bg-[#795548]', blob2: 'bg-[#5D4037]', isDark: true },
    frost: { bg: 'from-[#E0F7FA] to-[#B2EBF2]', accent: 'text-[#0097A7]', blob1: 'bg-[#80DEEA]', blob2: 'bg-[#4DD0E1]' },
    gold: { bg: 'from-[#FFF8E1] to-[#FFECB3]', accent: 'text-[#FF8F00]', blob1: 'bg-[#FFE082]', blob2: 'bg-[#FFD54F]' },
  };

  const theme = memory ? colors[memory.colorTheme as keyof typeof colors] || colors.stone : colors.stone;

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `quietly-mark-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image', err);
    }
  };

  if (!memory && !isGenerating) {
    return (
      <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6">
        <div className="flex justify-between items-center mb-6 px-1">
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#958D85] uppercase">Today's Mark</h3>
        </div>
        
        <div className="bg-gradient-to-br from-[#FAAE9D]/5 to-[#A3D2C3]/5 rounded-[2rem] p-8 shrink-0 flex flex-col items-center justify-center min-h-[420px] border border-white/50 backdrop-blur-sm relative overflow-hidden group">
          {/* Abstract SVG blocks */}
          <svg className="w-48 h-48 mb-8 opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700 ease-out" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
             {/* Background blur */}
             <circle cx="100" cy="100" r="60" fill="#A3D2C3" opacity="0.15" filter="blur(20px)" />
             <circle cx="130" cy="80" r="50" fill="#FAAE9D" opacity="0.15" filter="blur(20px)" />
             {/* Geometry 1: Sun / Circle */}
             <circle cx="70" cy="70" r="35" fill="#FAAE9D" className="drop-shadow-md" />
             {/* Geometry 2: Arch */}
             <path d="M100,150 A40,40 0 0,1 180,150 Z" fill="#958D85" opacity="0.8" className="drop-shadow-md" />
             {/* Geometry 3: Block */}
             <rect x="50" y="120" width="60" height="30" rx="15" fill="#A3D2C3" className="drop-shadow-sm" />
             {/* Geometry 4: Small accent */}
             <circle cx="160" cy="60" r="10" fill="#E2D8F0" />
          </svg>

          <p className="text-[#8c8681] text-sm font-serif font-bold tracking-[0.2em]">还在酝酿中</p>
          <p className="text-[#958D85]/60 text-xs mt-3 leading-loose text-center font-sans">
             留下哪怕只言片语<br/>这里将凝结出你的专属印记
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6">
      <div className="flex justify-between items-center mb-6 px-1">
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#958D85] uppercase">Today's Mark</h3>
        {memory && !isGenerating && (
          <button 
            onClick={handleSaveImage}
            className="text-[10px] uppercase tracking-widest text-[#8c8681] hover:text-[#4A443F] flex items-center gap-1.5 transition-colors font-bold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            保存
          </button>
        )}
      </div>

      <div 
        ref={cardRef} 
        className={`bg-gradient-to-br ${theme.bg} rounded-[2rem] p-8 shadow-sm flex flex-col relative overflow-hidden transition-all duration-700 min-h-[420px] shrink-0`}
      >
        {/* Grain overlay for texture */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay z-0" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
        ></div>

        {/* Decorative dynamic shapes */}
        {memory?.shapeStyle === 'organic' && (
           <>
             <div className={`absolute -top-10 -right-10 w-64 h-64 rounded-full ${theme.blob1} mix-blend-multiply opacity-50 blur-3xl z-0`}></div>
             <div className={`absolute bottom-0 left-0 w-48 h-48 rounded-full ${theme.blob2} mix-blend-multiply opacity-40 blur-2xl translate-y-10 -translate-x-10 z-0`}></div>
           </>
        )}
        {memory?.shapeStyle === 'geometric' && (
           <>
             <div className={`absolute bottom-0 right-0 w-48 h-48 ${theme.blob1} mix-blend-multiply opacity-30 rotate-45 translate-x-16 translate-y-16 z-0`}></div>
             <div className={`absolute top-0 left-0 w-32 h-32 ${theme.blob2} mix-blend-multiply opacity-30 -rotate-12 -translate-x-10 -translate-y-10 z-0`}></div>
           </>
        )}
        {memory?.shapeStyle === 'minimal' && (
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border border-[${theme.accent}] rounded-full opacity-10 z-0`}></div>
        )}

        <div className="relative z-10 flex flex-col h-full">
          {isGenerating ? (
            <div className="m-auto flex flex-col items-center">
               <div className="w-8 h-8 border-2 border-white/50 border-t-white rounded-full animate-spin mb-4"></div>
               <p className={`text-sm font-serif ${('isDark' in theme && theme.isDark) ? 'text-white/70' : 'text-[#4A443F]/70'} tracking-widest`}>正在凝结印记...</p>
            </div>
          ) : memory && (
            <>
              <div className="mb-auto">
                <span className={`inline-block px-4 py-1.5 rounded-full ${('isDark' in theme && theme.isDark) ? 'bg-black/20' : 'bg-white/50'} backdrop-blur-md text-xs font-bold tracking-widest ${theme.accent} mb-6 shadow-sm border border-white/20`}>
                  {memory.mood}
                </span>
                <h4 className={`font-serif text-2xl leading-[1.6] ${('isDark' in theme && theme.isDark) ? 'text-white/90' : 'text-[#4A443F]'} mb-8 whitespace-pre-wrap font-medium`}>{memory.quote}</h4>
                <div className="flex flex-wrap gap-2">
                  {memory.keywords.map((kw, i) => (
                    <span key={i} className={`text-xs ${('isDark' in theme && theme.isDark) ? 'text-white/60' : 'text-[#4A443F]/60'}`}>#{kw}</span>
                  ))}
                </div>
              </div>
              
              <div className={`mt-8 pt-6 border-t ${('isDark' in theme && theme.isDark) ? 'border-white/10' : 'border-[#4A443F]/10'} flex justify-between items-end`}>
                 <div>
                    <p className={`text-[9px] font-bold tracking-[0.3em] ${('isDark' in theme && theme.isDark) ? 'text-white/40' : 'text-[#4A443F]/40'} uppercase mb-1.5`}>Quietly</p>
                    <p className={`text-[11px] font-serif tracking-widest ${('isDark' in theme && theme.isDark) ? 'text-white/60' : 'text-[#4A443F]/60'}`}>{memory.stampText}</p>
                 </div>
                 <div className={`w-10 h-10 rounded-full ${theme.blob1} mix-blend-multiply opacity-80 flex items-center justify-center shadow-sm border border-white/20`}>
                    <div className="w-2.5 h-2.5 rounded-full bg-white opacity-80"></div>
                 </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
