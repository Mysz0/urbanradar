import React from 'react';

// WINTER: Frost overlay & Shimmering Ice
const WinterEffect = () => (
  <>
    <div className="frozen-surface" />
    <div className="fixed inset-0 pointer-events-none z-0 opacity-20" 
         style={{ background: 'var(--ice-shimmer)', backgroundSize: '400% 400%', animation: 'shimmerMove 20s linear infinite' }} />
  </>
);

// SAKURA: Falling petals & Pink glow
const SakuraEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(244,172,183,0.15),transparent_60%)]" />
    <div className="absolute inset-0 opacity-30">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="absolute bg-[rgb(var(--theme-primary))] rounded-full blur-[1px]"
             style={{
               width: '8px', height: '5px', left: `${Math.random() * 100}%`, top: '-5%',
               animation: `fallingPetal ${10 + Math.random() * 10}s linear infinite`,
               animationDelay: `${Math.random() * 5}s`
             }} />
      ))}
    </div>
  </div>
);

// KOI: Water ripples
const KoiEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div className="absolute inset-0 opacity-20" 
         style={{ background: 'radial-gradient(circle at 50% 50%, rgba(234,68,38,0.05) 0%, transparent 70%)' }} />
    <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border border-[rgb(var(--theme-primary))] opacity-10 animate-ping" 
         style={{ animationDuration: '8s' }} />
  </div>
);

// ABYSS: Floating bubbles & Deep sea light
const AbyssEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    {[...Array(12)].map((_, i) => (
      <div key={i} className="absolute bg-white rounded-full opacity-10"
           style={{
             width: '4px', height: '4px', left: `${Math.random() * 100}%`, bottom: '-5%',
             animation: `floatUp ${5 + Math.random() * 10}s ease-in infinite`,
             animationDelay: `${Math.random() * 5}s`
           }} />
    ))}
  </div>
);

// SUPERNOVA: Pulsing starfield
const SupernovaEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.1),transparent_80%)] animate-pulse" />
    <div className="absolute inset-0 opacity-20"
         style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
  </div>
);

export default function ThemeAtmosphere({ activeStyle }) {
  switch (activeStyle) {
    case 'winter': return <WinterEffect />;
    case 'sakura': return <SakuraEffect />;
    case 'koi': return <KoiEffect />;
    case 'abyss': return <AbyssEffect />;
    case 'supernova': return <SupernovaEffect />;
    default: return null; // Emerald, Salmon, and Marble stay clean/minimal
  }
}
