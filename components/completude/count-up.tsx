'use client';

import { useEffect, useState } from 'react';

/**
 * Animation de comptage — 800 ms, ease-out. Rendu SSR = valeur cible pour
 * éviter le layout shift ; l'animation démarre au mount côté client.
 */
export function CountUp({
  value,
  duration = 800,
  suffix = '',
  decimals = 0,
  className,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const initial = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(initial + (value - initial) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const shown = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();
  return <span className={className}>{shown}{suffix}</span>;
}
