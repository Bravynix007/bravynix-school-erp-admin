'use client';

import { useEffect, useState } from 'react';

/**
 * Whole seconds left until `until` (epoch ms), ticking once a second; 0 when
 * passed. A new `until` may read up to a second high until the next tick.
 */
export function useCountdown(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);

  if (until === null) return 0;
  return Math.max(0, Math.ceil((until - now) / 1000));
}

/** 42 → "0:42", 125 → "2:05". */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
