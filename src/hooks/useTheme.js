import { useState, useEffect, useLayoutEffect } from 'react';

export function useTheme() {
  const [mode, setMode] = useState(localStorage.getItem('theme-mode') || 'dark');
  const [appStyle, setAppStyle] = useState(localStorage.getItem('app-style') || 'emerald');
  
  const [isAtTop, setIsAtTop] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isNavbarShrunk, setIsNavbarShrunk] = useState(false);

  const isDark = mode === 'dark';

  useLayoutEffect(() => {
    const root = window.document.documentElement;
    
    // 1. Attributes & Classes
    root.classList.toggle('dark', isDark);
    root.setAttribute('data-theme', appStyle);
    root.style.colorScheme = mode;

    // 2. Browser UI / Safe Area Sync
    const bgColor = getComputedStyle(root).getPropertyValue('--theme-map-bg').trim();
    
    if (bgColor) {
      // Force background to HTML/Body for iOS safe area
      root.style.backgroundColor = bgColor;
      document.body.style.backgroundColor = bgColor;

      // Update mobile browser chrome color
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', bgColor);
      }
    }

    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('app-style', appStyle);
  }, [mode, isDark, appStyle]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsAtTop(currentScrollY < 120);
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsNavbarShrunk(true);
      } else if (lastScrollY - currentScrollY > 15 || currentScrollY < 10) {
        setIsNavbarShrunk(false);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return { mode, setMode, appStyle, setAppStyle, isDark, isAtTop, isNavbarShrunk };
}
