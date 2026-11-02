/**
 * Money in whole paise, as the API works it out (API design 7.3): a decimal string never passes through a float.
 * This only previews the sum; the API's answer is the one that counts.
 */
const TWO_DECIMALS = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

/** `"1234.5"` as 123450n; `undefined` for anything that is not a decimal amount. */
export function toPaise(amount: string): bigint | undefined {
  const match = TWO_DECIMALS.exec(amount.trim());
  if (!match) return undefined;
  const [, sign = '', whole = '0', fraction = ''] = match;
  const paise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return sign === '-' ? -paise : paise;
}

export function fromPaise(paise: bigint): string {
  const negative = paise < 0n;
  const absolute = negative ? -paise : paise;
  const text = `${String(absolute / 100n)}.${String(absolute % 100n).padStart(2, '0')}`;
  return negative ? `-${text}` : text;
}

export interface DueSum {
  base: string;
  total: string;
  /** The total would be below zero, which the API refuses (`TOTAL_NEGATIVE`). */
  negative: boolean;
}

/** Students times the rate, plus the signed adjustment; `undefined` while an amount is not a number yet. */
export function sumDue(studentCount: number, rate: string, adjustment: string): DueSum | undefined {
  const perStudent = toPaise(rate);
  const adjust = toPaise(adjustment === '' || adjustment === '-' ? '0' : adjustment);
  if (perStudent === undefined || adjust === undefined || !Number.isInteger(studentCount)) return undefined;
  const base = BigInt(studentCount) * perStudent;
  const total = base + adjust;
  return { base: fromPaise(base), total: fromPaise(total), negative: total < 0n };
}
