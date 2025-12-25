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
      
      className={`z-[10000] p-3.5 rounded-2xl border active:scale-90 will-change-transform transition-all duration-300 ${
        isDark 
          ? 'bg-zinc-900/80 border-white/10 text-[rgb(var(--theme-primary))]' 
          : 'bg-white/80 border-[rgb(var(--theme-primary))]/20 text-[rgb(var(--theme-primary))] shadow-lg shadow-[var(--theme-primary-glow)]'
      } ${isAtTop ? 'absolute' : 'fixed'}`}
      
      style={{ 
        top: isAtTop ? '4.05rem' : '1.5rem', 
        right: isAtTop ? '6.85rem' : '1.5rem',
        
        transform: `translate(${themeMag.position.x}px, ${themeMag.position.y}px)`,
        
        transition: isMagneticActive 
          ? 'none' 
          : 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        transitionProperty: isMagneticActive ? 'none' : 'top, right, background-color, border-color, color, transform, shadow'
      }}
    >
      {isDark ? <Sun size={18}/> : <Moon size={18}/>}
    </button>
  );
}
