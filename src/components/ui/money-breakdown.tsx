import { formatMoney } from '@/lib/format/money';

export interface MoneyRow {
  label: string;
  /** Exact decimal string; a leading "-" shows as a deduction. */
  amount: string;
  note?: string;
}

/** Ledger rows, a strong rule, then the total in h2 (DESIGN.md 9). */
export function MoneyBreakdown({
  rows,
  total,
  label,
}: {
  rows: MoneyRow[];
  total: { label: string; amount: string };
  label: string;
}) {
  return (
    <dl aria-label={label} className="flex flex-col">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-6 border-b border-line-subtle py-2.5"
        >
          <dt className="min-w-0 text-body text-ink">
            {row.label}
            {row.note ? <span className="block text-caption text-ink-tertiary">{row.note}</span> : null}
          </dt>
          <dd className="text-body text-ink tabular">{formatMoney(row.amount)}</dd>
        </div>
      ))}
      <div className="mt-1 flex items-baseline justify-between gap-6 border-t-2 border-ink pt-3">
        <dt className="text-h2 font-semibold text-ink">{total.label}</dt>
        <dd className="text-h2 font-semibold text-ink tabular">{formatMoney(total.amount)}</dd>
      </div>
    </dl>
  );
}
