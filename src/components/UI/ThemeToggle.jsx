import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ themeMag, setTheme, isDark, isAtTop }) {
  // We check if the magnetic effect is active to disable transitions
  const isMagneticActive = themeMag.position.x !== 0 || themeMag.position.y !== 0;

  return (
    <button 
      ref={themeMag.ref} 
      onMouseMove={themeMag.handleMouseMove} 
      onMouseLeave={themeMag.reset}
      onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))} 
      
      className={`z-[10000] p-3.5 rounded-2xl border active:scale-90 will-change-transform ${
        isDark 
          ? 'bg-zinc-900/80 border-white/10 text-emerald-400' 
          : 'bg-white/80 border-emerald-200 text-emerald-600 shadow-lg'
      } ${isAtTop ? 'absolute' : 'fixed'}`}
      
      style={{ 
        // Positions based on scroll state
        top: isAtTop ? '4.15rem' : '1.5rem', 
        right: isAtTop ? '6.8rem' : '1.5rem',
        
        // Magnetic displacement
        transform: `translate(${themeMag.position.x}px, ${themeMag.position.y}px)`,
        
        // Disable layout transitions ONLY when the magnet is pulling.
        // This makes the transition between header and corner smooth, 
        // but keeps the magnet snappy.
        transition: isMagneticActive 
          ? 'none' 
          : 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        transitionProperty: isMagneticActive ? 'none' : 'top, right, background-color, border-color, color, transform'
      }}
    >
      {isDark ? <Sun size={18}/> : <Moon size={18}/>}
    </button>
  );
}
