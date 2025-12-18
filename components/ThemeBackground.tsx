
import React from 'react';
import OilSlickLayer from './OilSlickLayer';
import NeonBillboardLayer from './NeonBillboardLayer';
import DeepNebulaLayer from './DeepNebulaLayer';
import ChristmasSnowLayer from './ChristmasSnowLayer';
import LandetianSkyLayer from './LandetianSkyLayer';
import ThunderstormLayer from './ThunderstormLayer';
import WindowRainOverlay from './WindowRainOverlay';
import StarryNightLayer from './StarryNightLayer';
import MaillardLayer from './MaillardLayer';
import DopamineLayer from './DopamineLayer';

interface ThemeBackgroundProps {
  theme: string;
}

const ThemeBackground: React.FC<ThemeBackgroundProps> = ({ theme }) => {
  return (
    <>
      {/* === BACKGROUND LAYER (Behind UI, z-index: -1) === */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none select-none transition-all duration-500">
        
        {/* PREMIUM DEFAULT THEME: FLUID GLASS (Optimized) */}
        {theme === 'glass' && (
          <div className="absolute inset-0 bg-[#F5F7FA] overflow-hidden">
             {/* 1. Base Gradient - Softer, cleaner */}
             <div className="absolute inset-0 bg-gradient-to-br from-[#E0E7FF] via-[#F0F5FF] to-[#FFFFFF]" />
             
             {/* 2. Floating Morphing Orbs - Slower, more pastel */}
             <div className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] bg-[#C7D2FE] opacity-40 rounded-full blur-[120px] animate-[float_25s_ease-in-out_infinite]" />
             <div className="absolute top-[30%] right-[-20%] w-[50vw] h-[50vw] bg-[#BAE6FD] opacity-40 rounded-full blur-[100px] animate-[float_30s_ease-in-out_infinite_reverse]" />
             <div className="absolute bottom-[-10%] left-[10%] w-[70vw] h-[70vw] bg-[#E9D5FF] opacity-30 rounded-full blur-[140px] animate-[pulse_20s_ease-in-out_infinite]" />
             
             {/* 3. Subtle Noise Texture for premium feel */}
             <div className="absolute inset-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-multiply" />
             
             <style>{`
               @keyframes float {
                 0% { transform: translate(0, 0) rotate(0deg); }
                 33% { transform: translate(30px, 50px) rotate(10deg); }
                 66% { transform: translate(-20px, 20px) rotate(-5deg); }
                 100% { transform: translate(0, 0) rotate(0deg); }
               }
             `}</style>
          </div>
        )}
        
        {/* MINECRAFT - Authentic Panorama Scroll */}
        {theme === 'minecraft' && (
          <div className="absolute inset-0 bg-[#757575] overflow-hidden">
             {/* Dirt Texture Animation */}
             <div 
               className="absolute inset-0 opacity-100"
               style={{
                 backgroundImage: `
                   linear-gradient(30deg, #606060 12%, transparent 12.5%, transparent 87%, #606060 87.5%, #606060),
                   linear-gradient(150deg, #606060 12%, transparent 12.5%, transparent 87%, #606060 87.5%, #606060),
                   linear-gradient(30deg, #606060 12%, transparent 12.5%, transparent 87%, #606060 87.5%, #606060),
                   linear-gradient(150deg, #606060 12%, transparent 12.5%, transparent 87%, #606060 87.5%, #606060),
                   linear-gradient(60deg, #888888 25%, transparent 25.5%, transparent 75%, #888888 75%, #888888),
                   linear-gradient(60deg, #888888 25%, transparent 25.5%, transparent 75%, #888888 75%, #888888)
                 `,
                 backgroundSize: '100px 174px',
                 imageRendering: 'pixelated',
                 animation: 'scroll-bg 60s linear infinite'
               }}
             ></div>
             
             {/* Vignette Overlay */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.6)_100%)]"></div>

             <style>{`
               @keyframes scroll-bg {
                 0% { background-position: 0 0; }
                 100% { background-position: 100px 174px; }
               }
             `}</style>
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
        
        {/* MAILLARD: Vintage Fabric & Leather */}
        {theme === 'maillard' && <MaillardLayer />}
        
        {/* DOPAMINE: Vibrant Trend */}
        {theme === 'dopamine' && <DopamineLayer />}

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

        {/* UPDATED: OIL SLICK - Canvas */}
        {theme === 'oil-slick' && <OilSlickLayer />}

        {/* UPDATED: WATERCOLOR - Starry Night */}
        {theme === 'watercolor' && <StarryNightLayer />}

        {/* KAWAII: Soft Dreamy Gradient Mesh */}
        {theme === 'kawaii' && (
            <div className="absolute inset-0 bg-[#fff0f5] overflow-hidden">
                <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-[#FFDEE9] opacity-70 blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#B5FFFC] opacity-60 blur-[80px] animate-[pulse_12s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
                <div className="absolute top-[30%] left-[40%] w-[40vw] h-[40vw] rounded-full bg-[#E0C3FC] opacity-50 blur-[60px] animate-[pulse_15s_ease-in-out_infinite]" style={{ animationDelay: '5s' }} />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.2),transparent)]" />
            </div>
        )}

        {/* WOODEN: Wood Grain Texture */}
        {theme === 'wooden' && (
            <div className="absolute inset-0 bg-[#DEB887]" style={{
                backgroundImage: `
                    repeating-linear-gradient(
                        45deg,
                        #DEB887 0px,
                        #DEB887 10px,
                        #D2B48C 10px,
                        #D2B48C 11px,
                        #DEB887 11px,
                        #DEB887 20px,
                        #CD853F 20px,
                        #CD853F 21px
                    )
                `,
                backgroundSize: '100px 100px'
            }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1),rgba(0,0,0,0.2))]" />
            </div>
        )}

        {theme === 'neon-billboard' && <NeonBillboardLayer />}
        {theme === 'deepNebula' && <DeepNebulaLayer />}

      </div>

      {/* === FOREGROUND OVERLAYS (On Top of UI) === */}
      {/* SEWER: Window Rain Drops (Foreground Glass) */}
      {theme === 'sewer' && <WindowRainOverlay />}
    </>
  );
};

export default ThemeBackground;
