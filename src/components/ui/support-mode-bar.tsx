'use client';

import { IconEye } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Button } from './button';

function format(seconds: number): string {
  const s = Math.max(0, seconds);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * The marigold strip of a read-only support session: unmistakable, always the
 * first thing on the screen (DESIGN.md goal 5). The countdown is drawn every
 * second but spoken only at 5 minutes, 1 minute and the end (DESIGN.md 15).
 * Marigold is used for nothing else.
 */
export function SupportModeBar({
  scope,
  expiresAt,
  onExit,
  now = Date.now,
}: {
  /** Who is being looked at: "Green Valley School". */
  scope: string;
  expiresAt: string;
  onExit: () => void;
  /** For tests. */
  now?: () => number;
}) {
  const end = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => Math.round((end - now()) / 1000));

  useEffect(() => {
    const tick = () => setRemaining(Math.round((end - now()) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [end, now]);

  // Derived, not stored: the text changes only when a mark is crossed, so the live region speaks then and not each second.
  const announcement =
    remaining <= 0
      ? 'Support session has ended.'
      : remaining <= 60
        ? 'Support session ends in 1 minute.'
        : remaining <= 300
          ? 'Support session ends in 5 minutes.'
          : '';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-support px-4 py-2 text-label text-ink">
      <IconEye size={18} aria-hidden="true" className="shrink-0" />
      <p className="min-w-0 flex-1 font-medium">Support session · read only · {scope}</p>
      <p className="tabular">
        <span className="font-normal">Time left </span>
        <span role="timer" aria-live="off" className="font-semibold">
          {format(remaining)}
        </span>
      </p>
      <Button variant="secondary" size="sm" onClick={onExit}>
        End session
      </Button>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
