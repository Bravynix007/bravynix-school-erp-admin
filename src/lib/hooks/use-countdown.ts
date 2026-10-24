'use client';

import { useEffect, useState } from 'react';

/** Whole seconds left until `until` (epoch ms), ticking once a second; 0 when passed. */
export function useCountdown(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === null) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      // Nothing changes after zero, so stop ticking.
      if (current >= until) clearInterval(timer);
    };
    // Start from the current time: a `now` left from an earlier countdown
    // would show the wrong time for up to a second (re-review R-C7).
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [until]);

  if (until === null) return 0;
  return Math.max(0, Math.ceil((until - now) / 1000));
}

/** 42 → "0:42", 125 → "2:05". */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
