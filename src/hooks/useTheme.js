import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isAtTop, setIsAtTop] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isNavbarShrunk, setIsNavbarShrunk] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    const root = window.document.documentElement;
    isDark ? root.classList.add('dark') : root.classList.remove('dark');
    root.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme, isDark]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // INCREASED THRESHOLD: 
      // Your header is tall (pt-16 pb-32). 
      // 120px is a better sweet spot for mobile so the button only 
      // detaches when the header is actually moving off-screen.
      if (currentScrollY < 120) {
        setIsAtTop(true);
      } else if (currentScrollY > 140) {
        setIsAtTop(false);
      }

      // Navbar Shrin Logic
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

  return { theme, setTheme, isDark, isAtTop, isNavbarShrunk };
}
