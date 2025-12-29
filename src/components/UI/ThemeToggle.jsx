import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ themeMag, setTheme, isDark, isAtTop }) {
  const isMagneticActive = themeMag.position.x !== 0 || themeMag.position.y !== 0;

  const glideY = isAtTop ? 'calc(4.05rem - 1.5rem)' : '0px';
  const glideX = isAtTop ? 'calc(-6.85rem + 1.5rem)' : '0px';

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    themeMag.reset(); 
    
    const nextMode = isDark ? 'light' : 'dark';
    setTheme(nextMode);
  };

  return (
    <button 
      ref={themeMag.ref} 
      onMouseMove={themeMag.handleMouseMove} 
      onMouseLeave={themeMag.reset}
      onClick={handleToggle} 
      type="button"
      className={`fixed z-[100000] p-3.5 rounded-2xl border active:scale-90 transform-gpu touch-none transition-all duration-500 flex items-center justify-center 
        /* UPDATED: Using dynamic theme variables instead of hardcoded zinc/white */
        bg-[var(--theme-card-bg)] 
        border-[var(--theme-border)] 
        text-[rgb(var(--theme-primary))] 
        backdrop-blur-md
        hover:border-[var(--theme-border-hover)]
        hover:bg-[var(--theme-card-hover)]
        shadow-[var(--theme-shadow)]
      `} 
      style={{ 
        top: '1.5rem', 
        right: '1.5rem',
        
        transform: `translate3d(calc(${glideX} + ${themeMag.position.x}px), calc(${glideY} + ${themeMag.position.y}px), 0)`,
        
        transition: isMagneticActive 
          ? 'background-color 0.3s, border-color 0.3s, color 0.3s, box-shadow 0.3s' 
          : 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.4s, border-color 0.4s, color 0.4s, box-shadow 0.4s',
        
        transitionProperty: 'transform, background-color, border-color, color, box-shadow'
      }}
    >
      <div className="pointer-events-none flex items-center justify-center">
        {isDark ? (
          <Sun size={18} className="drop-shadow-[0_0_8px_var(--theme-primary-glow)]" />
        ) : (
          <Moon size={18} className="drop-shadow-[0_0_8px_var(--theme-primary-glow)]" />
        )}
      </div>
    </button>
  );
}
