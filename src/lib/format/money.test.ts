import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyCompact } from './money';

describe('formatMoney', () => {
  it.each([
    ['124500.00', '₹1,24,500.00'],
    ['0.00', '₹0.00'],
    ['999', '₹999.00'],
    ['1000.5', '₹1,000.50'],
    ['12345678.90', '₹1,23,45,678.90'],
    ['-94725.00', '-₹94,725.00'],
    ['007.10', '₹7.10'],
  ])('%s → %s', (input, expected) => {
    expect(formatMoney(input)).toBe(expected);
  });

  it('keeps digits a float would lose', () => {
    expect(formatMoney('90071992547409.99')).toBe('₹9,00,71,99,25,47,409.99');
  });

  it('returns anything that is not a decimal string unchanged', () => {
    expect(formatMoney('n/a')).toBe('n/a');
  });
});

describe('formatMoneyCompact', () => {
  it.each([
    ['680000.00', '₹6.8 L'],
    ['310000.00', '₹3.1 L'],
    ['100000.00', '₹1 L'],
    ['12000000.00', '₹1.2 Cr'],
    ['94725.00', '₹94,725'],
  ])('%s → %s', (input, expected) => {
    expect(formatMoneyCompact(input)).toBe(expected);
  });
});
