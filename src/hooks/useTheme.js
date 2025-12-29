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
    
    // 1. Sync Dark Mode Class
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = mode;
    localStorage.setItem('theme-mode', mode);

    // 2. Sync Aesthetic Style (emerald, sakura, etc.)
    root.setAttribute('data-theme', appStyle);
    localStorage.setItem('app-style', appStyle);

    // 3. Sync Browser UI (iPhone Status Bar / Chrome Bar)
    // We get the actual background color currently applied by your CSS variables
    const bgColor = getComputedStyle(root).getPropertyValue('--theme-map-bg').trim();
    
    // Find the meta tag you have in your HTML
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor && bgColor) {
      metaThemeColor.setAttribute('content', bgColor);
    }
  }, [mode, isDark, appStyle]);

  // Scroll Logic (Preserved)
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
