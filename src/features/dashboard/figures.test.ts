import { describe, expect, it } from 'vitest';
import { collectionChange } from './figures';

describe('collectionChange', () => {
  it('states a rise and a fall in whole percent against last month', () => {
    expect(collectionChange('118.00', '100.00')).toBe('+18% vs last month');
    expect(collectionChange('82.00', '100.00')).toBe('−18% vs last month');
    expect(collectionChange('310000.00', '262500.00')).toBe('+18% vs last month');
  });

  it('rounds half away from zero', () => {
    expect(collectionChange('100.50', '100.00')).toBe('+1% vs last month');
    expect(collectionChange('99.50', '100.00')).toBe('−1% vs last month');
    expect(collectionChange('100.40', '100.00')).toBe('No change vs last month');
  });

  it('says no change when the two months are equal', () => {
    expect(collectionChange('500.00', '500.00')).toBe('No change vs last month');
  });

  it('has no delta when last month collected nothing, or an amount is not a number', () => {
    expect(collectionChange('500.00', '0.00')).toBeNull();
    expect(collectionChange('x', '100.00')).toBeNull();
  });
});
