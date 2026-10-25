import type { Route } from 'next';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Overline label, display value, one caption line. Clickable tiles open the
 * filtered list (DESIGN.md 9). Compact money has its exact value in `exact`.
 */
export function KpiTile({
  label,
  value,
  caption,
  exact,
  href,
}: {
  label: string;
  value: string;
  caption?: string;
  /** Full value shown on hover and spoken, e.g. "₹12,40,000.00" behind "₹12.4 L". */
  exact?: string;
  href?: Route;
}) {
  const body = (
    <>
      <p className="text-overline font-semibold tracking-[0.06em] text-ink-secondary uppercase">{label}</p>
      <p
        title={exact}
        aria-label={exact ? `${value}, ${exact}` : undefined}
        className="mt-2 text-display font-semibold tracking-[-0.01em] text-ink tabular"
      >
        {value}
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
