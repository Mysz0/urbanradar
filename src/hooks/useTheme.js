import { useState, useEffect, useLayoutEffect, useRef } from 'react';

// Hardcoded fallback colors for immediate meta tag setting on page load
const THEME_COLORS = {
  emerald: { light: '#f0fdf4', dark: '#0a0a0a' },
  koi: { light: '#fffcfb', dark: '#0c0a09' },
  sakura: { light: '#fdf2f8', dark: '#0f0609' },
  winter: { light: '#f8fafc', dark: '#020617' },
  abyss: { light: '#f0f9ff', dark: '#020617' },
  supernova: { light: '#faf5ff', dark: '#080510' },
  salmon: { light: '#fffbf8', dark: '#0c0504' },
  marble: { light: '#ffffff', dark: '#000000' }
};

export function useTheme() {
  const [mode, setMode] = useState(localStorage.getItem('theme-mode') || 'dark');
  const [appStyle, setAppStyle] = useState(localStorage.getItem('app-style') || 'emerald');
  
  const [isAtTop, setIsAtTop] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isNavbarShrunk, setIsNavbarShrunk] = useState(false);

  const themeUpdateIdRef = useRef(0);

  const isDark = mode === 'dark';

  useLayoutEffect(() => {
    const root = window.document.documentElement;

    themeUpdateIdRef.current += 1;
    const updateId = themeUpdateIdRef.current;

    root.setAttribute('data-theme', appStyle);
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = mode;

    // Set fallback meta tag immediately using hardcoded colors
    // This ensures iOS Safari's address bar matches the theme even on page reload
    const fallbackColor = THEME_COLORS[appStyle]?.[isDark ? 'dark' : 'light'] || '#0a0a0a';
    const head = document.head;
    if (head) {
      head.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', fallbackColor);
      head.appendChild(meta);
    }

    // remove any previously set inline var if present (fixes stale inline value)
    root.style.removeProperty('--theme-map-bg');
    document.body.style.removeProperty('--theme-map-bg');

    requestAnimationFrame(() => {
      // Ignore stale frames if the user spam-toggled.
      if (themeUpdateIdRef.current !== updateId) return;

      // CLEANUP: Remove any stale safe-area filler elements from previous code versions
      const oldTop = document.getElementById('safe-area-top');
      const oldBottom = document.getElementById('safe-area-bottom');
      if (oldTop) oldTop.remove();
      if (oldBottom) oldBottom.remove();

      // read from both root and body to be robust across inheritance and specificity
      const rootBg = getComputedStyle(root).getPropertyValue('--theme-map-bg').trim();
      const bodyBg = getComputedStyle(document.body).getPropertyValue('--theme-map-bg').trim();
      const bgColor = rootBg || bodyBg;

      if (bgColor) {
        // Ensure the page background is correct (iOS translucent status bar shows this)
        document.documentElement.style.backgroundColor = bgColor;
        document.body.style.backgroundColor = bgColor;

        // iOS Safari can be picky about updating the browser UI color dynamically.
        // Update meta tag with the computed color from CSS
        const head = document.head;
        if (head) {
          head.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
          const meta = document.createElement('meta');
          meta.setAttribute('name', 'theme-color');
          meta.setAttribute('content', bgColor);
          head.appendChild(meta);
        }

        // Force a repaint to help Safari apply changes
        // eslint-disable-next-line no-unused-expressions
        document.body.offsetHeight;
      }
    });

    // Second update with setTimeout for dynamically switched themes
    // Safari needs extra time to compute CSS variables after data-theme attribute changes
    setTimeout(() => {
      if (themeUpdateIdRef.current !== updateId) return;

      const rootBg = getComputedStyle(root).getPropertyValue('--theme-map-bg').trim();
      const bodyBg = getComputedStyle(document.body).getPropertyValue('--theme-map-bg').trim();
      const bgColor = rootBg || bodyBg;

      if (bgColor) {
        document.documentElement.style.backgroundColor = bgColor;
        document.body.style.backgroundColor = bgColor;

        const head = document.head;
        if (head) {
          head.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
          const meta = document.createElement('meta');
          meta.setAttribute('name', 'theme-color');
          meta.setAttribute('content', bgColor);
          head.appendChild(meta);
        }

        document.body.offsetHeight;
      }
    }, 50);

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