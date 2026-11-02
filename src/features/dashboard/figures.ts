import { toPaise } from '@/features/billing/due-math';

/**
 * "+18% vs last month", from the two months' collections. There is no change to state when last month collected
 * nothing, because a percentage of zero does not exist: `null`, and the tile then shows no delta.
 */
export function collectionChange(thisMonth: string, lastMonth: string): string | null {
  const now = toPaise(thisMonth);
  const before = toPaise(lastMonth);
  if (now === undefined || before === undefined || before <= 0n) return null;
  const diff = now - before;
  // Whole percent, rounded half away from zero, in integers: money never passes through a float.
  const scaled = diff * 100n;
  const half = before / 2n;
  const percent = (scaled >= 0n ? scaled + half : scaled - half) / before;
  if (percent === 0n) return 'No change vs last month';
  return `${percent > 0n ? '+' : '−'}${String(percent < 0n ? -percent : percent)}% vs last month`;
}
