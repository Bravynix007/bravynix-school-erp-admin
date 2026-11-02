import type { PriceRate } from './types';

export type RateState = 'In force' | 'Scheduled' | 'Closed';

export interface RateSpan {
  rate: PriceRate;
  state: RateState;
  /** The last day the rate applies: the day before the next one starts. `null` while it is the newest. */
  endsOn: string | null;
}

/** The day before a `YYYY-MM-DD` day, by calendar and not by time zone. */
export function dayBefore(day: string): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date - 1)).toISOString().slice(0, 10);
}

/**
 * Each rate with where it stands, from the history newest first as PLT-22 answers it. A rate newer than the one in
 * force has not started yet; with none in force, every rate is still to come.
 */
export function rateSpans(history: readonly PriceRate[]): RateSpan[] {
  const inForceAt = history.findIndex((rate) => rate.inForce);
  return history.map((rate, index) => {
    const newer = history[index - 1];
    let state: RateState = 'Closed';
    if (rate.inForce) state = 'In force';
    else if (inForceAt === -1 || index < inForceAt) state = 'Scheduled';
    return { rate, state, endsOn: newer ? dayBefore(newer.effectiveFromDate) : null };
  });
}
