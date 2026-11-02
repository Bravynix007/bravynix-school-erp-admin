import { describe, expect, it } from 'vitest';
import { fromPaise, sumDue, toPaise } from './due-math';

describe('toPaise and fromPaise', () => {
  it.each([
    ['50', 5000n],
    ['50.5', 5050n],
    ['50.05', 5005n],
    ['0.00', 0n],
    ['-2500.00', -250000n],
    ['-0.50', -50n],
    ['999999999999.99', 99999999999999n],
  ])('%s is %s paise', (text, paise) => {
    expect(toPaise(text)).toBe(paise);
  });

  it('refuses what is not an amount', () => {
    for (const text of ['', '-', '.', 'abc', '1.234', '1,000']) expect(toPaise(text)).toBeUndefined();
  });

  it('writes paise back with two decimals and a sign', () => {
    expect(fromPaise(5005n)).toBe('50.05');
    expect(fromPaise(-50n)).toBe('-0.50');
    expect(fromPaise(0n)).toBe('0.00');
  });
});

describe('sumDue', () => {
  it('multiplies the students by the rate and adds the adjustment, exactly', () => {
    expect(sumDue(1650, '50.00', '-2500.00')).toEqual({
      base: '82500.00',
      total: '80000.00',
      negative: false,
    });
    expect(sumDue(3, '0.10', '0')).toEqual({ base: '0.30', total: '0.30', negative: false });
  });

  it('keeps digits a float would lose', () => {
    expect(sumDue(1_000_000, '99999.99', '')?.base).toBe('99999990000.00');
  });

  it('treats an empty or half-typed adjustment as nothing', () => {
    expect(sumDue(10, '50.00', '')?.total).toBe('500.00');
    expect(sumDue(10, '50.00', '-')?.total).toBe('500.00');
  });

  it('says when the total would go below zero', () => {
    expect(sumDue(10, '50.00', '-500.01')).toEqual({ base: '500.00', total: '-0.01', negative: true });
    expect(sumDue(10, '50.00', '-500.00')?.negative).toBe(false);
  });

  it('has no sum while an amount is not a number', () => {
    expect(sumDue(10, 'x', '0')).toBeUndefined();
    expect(sumDue(Number.NaN, '50.00', '0')).toBeUndefined();
  });
});
