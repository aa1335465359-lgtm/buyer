
import React from 'react';
import RgbClubLayer from './RgbClubLayer';
import LaserTunnelLayer from './LaserTunnelLayer';
import OilSlickLayer from './OilSlickLayer';
import NeonBillboardLayer from './NeonBillboardLayer';
import DragonScaleLayer from './DragonScaleLayer';
import DeepNebulaLayer from './DeepNebulaLayer';
import BlackGoldLayer from './BlackGoldLayer';
import SynthwaveGridLayer from './SynthwaveGridLayer';
import ChristmasSnowLayer from './ChristmasSnowLayer';
import LandetianSkyLayer from './LandetianSkyLayer';
import ThunderstormLayer from './ThunderstormLayer';
import WindowRainOverlay from './WindowRainOverlay';
import RainyCarLayer from './RainyCarLayer';
import StarryNightLayer from './StarryNightLayer';

interface ThemeBackgroundProps {
  theme: string;
}

const ThemeBackground: React.FC<ThemeBackgroundProps> = ({ theme }) => {
  return (
    <>
      {/* === BACKGROUND LAYER (Behind UI, z-index: -1) === */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none select-none transition-all duration-500">
        
        {/* Legacy Themes */}
        {theme === 'glass' && <div className="absolute inset-0 bg-[#f8fafc]"><div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50" /></div>}
        
        {/* MINECRAFT - Improved Texture */}
        {theme === 'minecraft' && (
          <div className="absolute inset-0 bg-[#757575]" 
               style={{
                 // Simulating Stone/Gravel Noise
                 backgroundImage: `
                   linear-gradient(45deg, #6b6b6b 25%, transparent 25%, transparent 75%, #6b6b6b 75%, #6b6b6b),
                   linear-gradient(45deg, #6b6b6b 25%, transparent 25%, transparent 75%, #6b6b6b 75%, #6b6b6b)
                 `,
                 backgroundSize: '4px 4px',
                 backgroundPosition: '0 0, 2px 2px',
                 imageRendering: 'pixelated',
                 opacity: 0.1
               }}
          >
             {/* Vignette */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]"></div>
          </div>
        )}

        {/* CHRISTMAS SPECIAL: Wrapped Gift Box (Green Velvet + Ribbons) */}
        {(theme === 'christmas' || theme === 'reindeer') && (
            <div className="absolute inset-0 bg-[#0F4D2B]">
                {/* 1. Velvet Texture Base (Radial Gradient for sheen) */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a6b41_0%,#052412_100%)]"></div>
                
                {/* 2. Noise Overlay for Plush Texture */}
                <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

                {/* 3. Gold & Red Ribbons (CSS Gradients) */}
                {/* Vertical Ribbon */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-90"
                    style={{
                        background: `
                            linear-gradient(90deg, 
                                transparent calc(50% - 50px), 
                                #F6C15A calc(50% - 50px), #F6C15A calc(50% - 42px), 
                                #B22D2D calc(50% - 42px), #B22D2D calc(50% + 42px), 
                                #F6C15A calc(50% + 42px), #F6C15A calc(50% + 50px), 
                                transparent calc(50% + 50px)
                            )
                        `
                    }}
                ></div>
                {/* Horizontal Ribbon */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-90"
                    style={{
                        background: `
                            linear-gradient(0deg, 
                                transparent calc(50% - 50px), 
                                #F6C15A calc(50% - 50px), #F6C15A calc(50% - 42px), 
                                #B22D2D calc(50% - 42px), #B22D2D calc(50% + 42px), 
                                #F6C15A calc(50% + 42px), #F6C15A calc(50% + 50px), 
                                transparent calc(50% + 50px)
                            )
                        `
                    }}
                ></div>

                {/* 4. Shadow/Depth for Ribbons */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.3)_100%)] pointer-events-none"></div>

                {/* Advanced Snow Layer */}
                <ChristmasSnowLayer />
            </div>
        )}

        {/* LANDETIAN: Blue Sky Overdrive */}
        {theme === 'landetian' && <LandetianSkyLayer />}

        {/* SEWER / 1335465359: Stormy Night Base */}
        {theme === 'sewer' && (
            <>
               {/* 1. Deep Green Night Gradient (Top to Bottom) */}
               <div className="absolute inset-0 bg-gradient-to-b from-[var(--storm-bg-top)] via-[var(--storm-bg-mid)] to-[var(--storm-bg-bottom)]"></div>
               
               {/* 2. Thunderstorm Layer: Lightning + Background Structures + Flashes */}
               <ThunderstormLayer />
               
               {/* Note: CyberStormEffect (Green Matrix Rain) is rendered in App.tsx on top of this background but behind UI */}
            </>
        )}

        {/* UPDATED: RAINY - Night Highway */}
        {theme === 'rainy' && <RainyCarLayer />}

        {/* UPDATED: OIL SLICK - Canvas */}
        {theme === 'oil-slick' && <OilSlickLayer />}

        {/* UPDATED: WATERCOLOR - Starry Night */}
        {theme === 'watercolor' && <StarryNightLayer />}

        {theme === 'wooden' && <div className="absolute inset-0 bg-[#deb887]" />}
        {theme === 'kawaii' && <div className="absolute inset-0 bg-[#fff0f5]" />}
        {theme === 'paper' && <div className="absolute inset-0 bg-[#e3d5ca]" />}

        {/* === LIGHT POLLUTION 2.0 LAYERS === */}
        {theme === 'ultra-rgb' && <RgbClubLayer />}
        {theme === 'laser-tunnel' && <LaserTunnelLayer />}
        {theme === 'neon-billboard' && <NeonBillboardLayer />}
        {theme === 'dragonScale' && <DragonScaleLayer />}
        {theme === 'deepNebula' && <DeepNebulaLayer />}
        {theme === 'blackGold' && <BlackGoldLayer />}
        {theme === 'synthwaveGrid' && <SynthwaveGridLayer />}

      </div>

      {/* === FOREGROUND OVERLAYS (On Top of UI) === */}
      {/* SEWER: Window Rain Drops (Foreground Glass) */}
      {theme === 'sewer' && <WindowRainOverlay />}
    </>
  );
};

export default ThemeBackground;
