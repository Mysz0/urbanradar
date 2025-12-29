import React, { useMemo } from 'react';

/* ==============================================
   WINTER: Crystalline Frost
   ============================================== */
const WinterEffect = () => (
  <>
    {/* Base frost vignette */}
    <div 
      className="fixed inset-0 pointer-events-none z-0" 
      style={{ 
        background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(186, 230, 253, 0.15) 100%)'
      }} 
    />
    
    {/* Animated frost layer */}
    <div 
      className="frozen-surface" 
      style={{ 
        background: 'linear-gradient(135deg, rgba(186, 230, 253, 0.08) 0%, transparent 100%)',
        animation: 'iceBreath 10s ease-in-out infinite' 
      }} 
    />
    
    {/* Ice crystal sparkles */}
    <div 
      className="fixed inset-0 pointer-events-none z-0 opacity-20"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(186, 230, 253, 0.4) 1px, transparent 1px),
          radial-gradient(circle at 60% 70%, rgba(186, 230, 253, 0.3) 1px, transparent 1px),
          radial-gradient(circle at 80% 20%, rgba(186, 230, 253, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '200px 200px, 300px 300px, 250px 250px',
        animation: 'gentlePulse 8s ease-in-out infinite'
      }}
    />
  </>
);

/* ==============================================
   SAKURA: Soft Petal Rain
   ============================================== */
const SakuraEffect = () => {
  const petals = useMemo(() => {
    return [...Array(15)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: `${12 + Math.random() * 8}s`,
      delay: `${Math.random() * 5}s`,
      size: `${4 + Math.random() * 6}px`,
      rotation: Math.random() * 360
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Soft pink gradient backdrop */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 70% 20%, rgba(244, 114, 182, 0.12), transparent 60%)'
        }}
      />
      
      {/* Falling petals */}
      <div className="absolute inset-0">
        {petals.map((p) => (
          <div 
            key={p.id} 
            className="sakura-petal absolute bg-gradient-to-br from-[rgb(var(--theme-primary))] to-pink-200 rounded-full blur-[0.5px]"
            style={{
              width: p.size, 
              height: p.size, 
              left: p.left, 
              top: '-5%',
              animation: `fallingPetal ${p.duration} linear infinite`,
              animationDelay: p.delay,
              transform: `rotate(${p.rotation}deg)`
            }} 
          />
        ))}
      </div>
      
      {/* Ambient glow */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: 'radial-gradient(circle at 80% 80%, rgba(244, 114, 182, 0.3), transparent 70%)'
        }}
      />
    </div>
  );
};

/* ==============================================
   KOI: Water Garden
   ============================================== */
const KoiEffect = () => {
  const ripples = useMemo(() => {
    return [...Array(5)].map((_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`, 
      top: `${10 + Math.random() * 80}%`,  
      delay: i * 2, 
      size: 150 + Math.random() * 100
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div 
        className="absolute inset-0 opacity-15" 
        style={{ 
          background: 'var(--water-texture)',
          backgroundSize: '500px 500px'
        }} 
      />
      
      {ripples.map((ripple) => (
        <div 
          key={ripple.id}
          className="absolute rounded-full border"
          style={{
            width: `${ripple.size}px`,
            height: `${ripple.size}px`,
            left: ripple.left,
            top: ripple.top,
            borderColor: 'rgba(234, 68, 38, 0.3)',
            animation: `rippleOut 10s ease-out infinite`,
            animationDelay: `${ripple.delay}s`,
            animationFillMode: 'backwards',
            willChange: 'transform, opacity'
          }}
        />
      ))}
    </div>
  );
};

/* ==============================================
   ABYSS: Deep Ocean Pressure
   ============================================== */
const AbyssEffect = () => {
  const bubbles = useMemo(() => {
    return [...Array(12)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: `${10 + Math.random() * 12}s`,
      delay: `${Math.random() * 6}s`,
      size: `${2 + Math.random() * 2}px`
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Deep gradient from bottom */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(3, 21, 37, 0.4) 0%, transparent 60%)'
        }}
      />
      
      {/* Pressure zones */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            radial-gradient(ellipse at 50% 100%, rgba(14, 165, 233, 0.15), transparent 50%),
            radial-gradient(ellipse at 30% 60%, rgba(14, 165, 233, 0.08), transparent 40%)
          `
        }}
      />
      
      {/* Rising bubbles */}
      {bubbles.map((b) => (
        <div 
          key={b.id} 
          className="absolute bg-gradient-to-t from-cyan-200 to-white rounded-full"
          style={{
            width: b.size, 
            height: b.size, 
            left: b.left, 
            bottom: '-5%',
            opacity: 0.15,
            animation: `floatUp ${b.duration} ease-in infinite`,
            animationDelay: b.delay,
            boxShadow: '0 0 4px rgba(14, 165, 233, 0.3)'
          }} 
        />
      ))}
    </div>
  );
};

/* ==============================================
   SUPERNOVA: Cosmic Energy
   ============================================== */
const SupernovaEffect = () => {
  const particles = useMemo(() => {
    return [...Array(30)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Energy field base */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.08), transparent 70%)',
          animation: 'gentlePulse 6s ease-in-out infinite'
        }}
      />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Energy particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-1 h-1 bg-purple-400 rounded-full"
          style={{
            left: p.left,
            top: p.top,
            animation: `gentlePulse ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            boxShadow: '0 0 6px rgba(168, 85, 247, 0.6)'
          }}
        />
      ))}
      
      {/* Scanlines overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 3px)'
        }}
      />
    </div>
  );
};

/* ==============================================
   SALMON: Warm Coral Waves
   ============================================== */
const SalmonEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    {/* Warm gradient waves */}
    <div 
      className="absolute inset-0 opacity-25"
      style={{
        background: `
          radial-gradient(ellipse at 60% 30%, rgba(251, 113, 133, 0.15), transparent 60%),
          radial-gradient(ellipse at 30% 70%, rgba(251, 113, 133, 0.1), transparent 50%)
        `
      }}
    />
    
    {/* Organic shapes */}
    <div 
      className="absolute inset-0 opacity-10"
      style={{
        background: 'radial-gradient(circle at 20% 50%, rgba(251, 113, 133, 0.2) 0%, transparent 30%)',
        animation: 'gentlePulse 8s ease-in-out infinite'
      }}
    />
  </div>
);

/* ==============================================
   MARBLE: Minimal Architectural
   ============================================== */
const MarbleEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    {/* Subtle vignette */}
    <div 
      className="absolute inset-0 opacity-5"
      style={{
        background: 'radial-gradient(circle at 50% 50%, transparent 60%, var(--theme-text-title) 100%)'
      }}
    />
  </div>
);

/* ==============================================
   MAIN COMPONENT
   ============================================== */
function ThemeAtmosphere({ activeStyle }) {
  const effects = {
    winter: <WinterEffect />,
    sakura: <SakuraEffect />,
    koi: <KoiEffect />,
    abyss: <AbyssEffect />,
    supernova: <SupernovaEffect />,
    salmon: <SalmonEffect />,
    marble: <MarbleEffect />
  };

  return effects[activeStyle] || null;
}

export default React.memo(ThemeAtmosphere);
