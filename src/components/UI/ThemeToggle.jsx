import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ themeMag, setTheme, isDark, isAtTop }) {
  const isMagneticActive = themeMag.position.x !== 0 || themeMag.position.y !== 0;

  // Calculate the travel coordinates based on isAtTop
  // Mobile values: Absolute (4.05rem, 6.85rem) vs Fixed (1.5rem, 1.5rem)
  const baseTop = isAtTop ? '4.05rem' : '1.5rem';
  const baseRight = isAtTop ? '6.85rem' : '1.5rem';

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
        // We keep top/right here so it knows its base, 
        // but we ensure the transition is smooth.
        top: baseTop, 
        right: baseRight,
        
        // Combining the magnetic movement
        transform: `translate(${themeMag.position.x}px, ${themeMag.position.y}px)`,
        
        // We use a slightly faster duration for mobile layout shifts 
        // but keep the long duration for that 'traveling' feel.
        transition: isMagneticActive 
          ? 'none' 
          : 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        
        // Force the browser to treat background and layout shifts separately
        transitionProperty: isMagneticActive ? 'none' : 'top, right, background-color, border-color, color, box-shadow, transform'
      }}
    >
      {isDark ? <Sun size={18}/> : <Moon size={18}/>}
    </button>
  );
}
