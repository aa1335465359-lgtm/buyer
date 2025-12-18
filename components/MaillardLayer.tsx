
import React from 'react';

const MaillardLayer: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      
      {/* 1. Base Gradient: Deep Coffee to Warm Sand (The Maillard Tone) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#3D2B1F] via-[#5D4037] to-[#8D6E63] z-0" />

      {/* 2. Leather Texture Simulation (Noise + Lighting) */}
      <div className="absolute inset-0 opacity-20 mix-blend-overlay z-0 filter contrast-125 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* 3. Linen/Fabric Weave Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-10 mix-blend-soft-light"
        style={{
            backgroundImage: `
                repeating-linear-gradient(45deg, transparent, transparent 2px, #000 2px, #000 3px),
                repeating-linear-gradient(-45deg, transparent, transparent 2px, #000 2px, #000 3px)
            `,
            backgroundSize: '8px 8px'
        }}
      />

      {/* 4. Ambient Gold Lighting (Warmth) */}
      <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-[#C6A664] opacity-20 blur-[100px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#8B4513] opacity-30 blur-[120px] mix-blend-overlay" />

      {/* 5. Vignette for Focus */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(20,10,5,0.6)_100%)] z-10" />

    </div>
  );
};

export default MaillardLayer;
