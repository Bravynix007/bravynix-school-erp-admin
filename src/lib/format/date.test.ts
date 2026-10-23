import { describe, expect, it } from 'vitest';
import { formatInstant, formatSchoolDate, formatStamp } from './date';

describe('dates', () => {
  it('formats a school day without a time zone shift', () => {
    expect(formatSchoolDate('2026-10-23')).toBe('23-10-2026');
  });

  it('shows instants in IST, 24 h', () => {
    expect(formatInstant('2026-10-23T04:45:00.000Z')).toBe('23-10-2026 10:15');
    // 18:30 UTC is already the next day in India.
    expect(formatInstant('2026-10-23T18:30:00.000Z')).toBe('24-10-2026 00:00');
  });

  it('stamps a person or System', () => {
    const at = '2026-10-23T04:45:00.000Z';
    expect(formatStamp({ id: 'p1', displayName: 'R. Nair', roleName: 'Super Admin' }, at)).toBe(
      'R. Nair · 23-10-2026 10:15',
    );
    expect(formatStamp({ id: null, displayName: 'System', roleName: null }, at)).toBe(
      'System · 23-10-2026 10:15',
    );
  });
});
