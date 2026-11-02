import type { Route } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Overline label, display value, one caption line. Clickable tiles open the
 * filtered list (DESIGN.md 9). Compact money has its exact value in `exact`.
 */
export function KpiTile({
  label,
  caption,
  exact,
  href,
  ...figure
}: {
  label: string;
  caption?: ReactNode;
  /** Full value shown on hover and spoken, e.g. "₹12,40,000.00" behind "₹12.4 L". */
  exact?: string;
  href?: Route;
} & (
  | { value: string; unavailable?: false }
  /** The figure does not exist yet (its module is not built): the tile says so instead of showing a made-up zero. */
  | { unavailable: true; value?: undefined }
)) {
  const { value, unavailable = false } = figure;
  const body = (
    <>
      <p className="text-overline font-semibold tracking-[0.06em] text-ink-secondary uppercase">{label}</p>
      <p
        title={exact}
        className={cn(
          'mt-2 font-semibold text-ink tabular',
          unavailable ? 'text-h2 text-ink-secondary' : 'text-display tracking-[-0.01em]',
        )}
      >
        {unavailable ? (
          'Not available yet'
        ) : exact ? (
          <>
            <span aria-hidden="true">{value}</span>
            <span className="sr-only">{exact}</span>
          </>
        ) : (
          value
        )}
      </p>
      {caption ? <p className="mt-1 text-caption text-ink-secondary">{caption}</p> : null}
    </>
  );
  const box = 'block rounded-lg border border-line bg-surface p-5';
  return href ? (
    <Link href={href} className={cn(box, 'transition-colors hover:border-line-strong hover:bg-row-hover')}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}
