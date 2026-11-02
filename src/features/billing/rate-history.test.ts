import { describe, expect, it } from 'vitest';
import { history, rate } from '@/test/pricing';
import { dayBefore, rateSpans } from './rate-history';

describe('dayBefore', () => {
  it.each([
    ['2026-06-01', '2026-05-31'],
    ['2026-01-01', '2025-12-31'],
    ['2028-03-01', '2028-02-29'],
    ['2027-03-01', '2027-02-28'],
  ])('%s → %s', (day, expected) => {
    expect(dayBefore(day)).toBe(expected);
  });
});

describe('rateSpans', () => {
  it('marks the rate in force, the ones to come and the ones that closed, with the day each one ends', () => {
    const spans = rateSpans(history());
    expect(spans.map((span) => [span.rate.id, span.state, span.endsOn])).toEqual([
      ['r3', 'Scheduled', null],
      ['r1', 'In force', '2027-03-31'],
      ['r2', 'Closed', '2026-05-31'],
    ]);
  });

  it('calls every rate scheduled while none is in force yet', () => {
    const spans = rateSpans([
      rate({ id: 'b', effectiveFromDate: '2027-07-01', inForce: false }),
      rate({ id: 'a', effectiveFromDate: '2027-04-01', inForce: false }),
    ]);
    expect(spans.map((span) => span.state)).toEqual(['Scheduled', 'Scheduled']);
  });

  it('is empty for an Institution with no rate', () => {
    expect(rateSpans([])).toEqual([]);
  });
});
