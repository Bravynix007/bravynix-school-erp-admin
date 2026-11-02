import { describe, expect, it } from 'vitest';
import { formatCount } from './count';

describe('formatCount', () => {
  it('groups in the Indian way', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1650)).toBe('1,650');
    expect(formatCount(124500)).toBe('1,24,500');
    expect(formatCount(12345678)).toBe('1,23,45,678');
  });
});
