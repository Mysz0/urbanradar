import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ themeMag, setTheme, isDark, isAtTop }) {
  const isMagneticActive = themeMag.position.x !== 0 || themeMag.position.y !== 0;

  return (
    <button 
      ref={themeMag.ref} 
      onMouseMove={themeMag.handleMouseMove} 
      onMouseLeave={themeMag.reset}
      onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))} 
      
      className={`z-[10000] p-3.5 rounded-2xl border active:scale-90 will-change-transform ${
        isDark 
          ? 'bg-zinc-900/80 border-white/10 text-[rgb(var(--theme-primary))]' 
          : 'bg-white/80 border-[rgb(var(--theme-primary))]/20 text-[rgb(var(--theme-primary))] shadow-lg shadow-[var(--theme-primary-glow)]'
      } ${isAtTop ? 'absolute' : 'fixed'}`}
      
      style={{ 
        top: isAtTop ? '4.05rem' : '1.5rem', 
        right: isAtTop ? '6.85rem' : '1.5rem',
        
        // This is the floating/traveling part
        transform: `translate(${themeMag.position.x}px, ${themeMag.position.y}px)`,
        
        // --- THE FIX ---
        // We only animate the transform (the travel) and the colors.
        // We never animate 'top' or 'right' (the layout position).
        transition: isMagneticActive 
          ? 'none' 
          : 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.5s ease, border-color 0.5s ease, color 0.5s ease, box-shadow 0.5s ease',
        transitionProperty: isMagneticActive 
          ? 'none' 
          : 'transform, background-color, border-color, color, box-shadow'
      }}
    >
      {isDark ? <Sun size={18}/> : <Moon size={18}/>}
    </button>
  );
}
