import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ themeMag, setTheme, isDark, isAtTop }) {
  const isMagneticActive = themeMag.position.x !== 0 || themeMag.position.y !== 0;

  // Exact pixel-perfect glide offsets
  const glideY = isAtTop ? 'calc(4.05rem - 1.5rem)' : '0px';
  const glideX = isAtTop ? 'calc(-6.85rem + 1.5rem)' : '0px';

  return (
    <button 
      ref={themeMag.ref} 
      onMouseMove={themeMag.handleMouseMove} 
      onMouseLeave={themeMag.reset}
      onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))} 
      
      className={`z-[10000] p-3.5 rounded-2xl border active:scale-90 transform-gpu fixed ${
        isDark 
          ? 'bg-zinc-900/80 border-white/10 text-[rgb(var(--theme-primary))]' 
          : 'bg-white/80 border-[rgb(var(--theme-primary))]/20 text-[rgb(var(--theme-primary))] shadow-lg shadow-[var(--theme-primary-glow)]'
      }`} 
      
      style={{ 
        // Anchored base - no transitions on these properties!
        top: '1.5rem', 
        right: '1.5rem',
        
        // Combined transform for glide + magnetic
        transform: `translate3d(${glideX}, ${glideY}, 0) translate3d(${themeMag.position.x}px, ${themeMag.position.y}px, 0)`,
        
        // FIXED: Only transition specific properties. 
        // DO NOT use 'all' or 'top/right' here.
        transition: isMagneticActive 
          ? 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease' 
          : 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.4s ease, border-color 0.4s ease, color 0.4s ease, box-shadow 0.4s ease',
        
        // This helps mobile Safari ignore the layout shift
        transitionProperty: 'transform, background-color, border-color, color, box-shadow'
      }}
    >
      {isDark ? <Sun size={18}/> : <Moon size={18}/>}
    </button>
  );
}
