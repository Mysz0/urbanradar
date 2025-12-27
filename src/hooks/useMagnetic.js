import { useState, useRef, useCallback } from 'react';

export const useMagnetic = () => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e) => {
    if (!ref.current) return;
    
    const { clientX, clientY } = e;
    
    // On mobile, clientX/Y can be undefined for certain events
    if (clientX === undefined || clientY === undefined) return;

    const { left, top, width, height } = ref.current.getBoundingClientRect();
    
    const x = (clientX - (left + width / 2)) * 0.35;
    const y = (clientY - (top + height / 2)) * 0.35;
    
    setPosition({ x, y });
  }, []);

  const reset = useCallback(() => setPosition({ x: 0, y: 0 }), []);

  return { ref, position, handleMouseMove, reset };
};
