import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ themeMag, setTheme, isDark, isAtTop }) {
  const isMagneticActive = themeMag.position.x !== 0 || themeMag.position.y !== 0;

  const glideY = isAtTop ? 'calc(4.05rem - 1.5rem)' : '0px';
  const glideX = isAtTop ? 'calc(-6.85rem + 1.5rem)' : '0px';

  return (
    <button 
      ref={themeMag.ref} 
      // We use onTouchMove for mobile to separate it from the click
      onMouseMove={themeMag.handleMouseMove} 
      onMouseLeave={themeMag.reset}
      onClick={(e) => {
        themeMag.reset(); // Reset magnetic immediately on click to prevent hopping
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
      }} 
      
      className={`z-[10000] p-3.5 rounded-2xl border active:scale-90 transform-gpu fixed touch-none ${
        isDark 
          ? 'bg-zinc-900/80 border-white/10 text-[rgb(var(--theme-primary))]' 
          : 'bg-white/80 border-[rgb(var(--theme-primary))]/20 text-[rgb(var(--theme-primary))] shadow-lg shadow-[var(--theme-primary-glow)]'
      }`} 
      
      style={{ 
        top: '1.5rem', 
        right: '1.5rem',
        
        // Use a single translate3d to prevent the browser from separating the two movements
        transform: `translate3d(calc(${glideX} + ${themeMag.position.x}px), calc(${glideY} + ${themeMag.position.y}px), 0)`,
        
        transition: isMagneticActive 
          ? 'background-color 0.3s, border-color 0.3s, color 0.3s, box-shadow 0.3s' 
          : 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.4s, border-color 0.4s, color 0.4s, box-shadow 0.4s',
        
        transitionProperty: 'transform, background-color, border-color, color, box-shadow'
      }}
    >
      <div className="pointer-events-none flex items-center justify-center">
        {isDark ? <Sun size={18}/> : <Moon size={18}/>}
      </div>
    </button>
  );
}
