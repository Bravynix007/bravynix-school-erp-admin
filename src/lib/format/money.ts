/**
 * Money arrives as an exact decimal string, e.g. "124500.00" (API design 7.3).
 * It is formatted without passing through floating point.
 */
const MONEY_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

/** Indian digit grouping: 1,24,500 (last three digits, then pairs). */
function groupIndian(integer: string): string {
  if (integer.length <= 3) return integer;
  const last3 = integer.slice(-3);
  const rest = integer.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

/** ₹1,24,500.00 for tables and forms (DESIGN.md 6). */
export function formatMoney(amount: string): string {
  const match = MONEY_PATTERN.exec(amount.trim());
  if (!match) return amount;
  const [, sign = '', integer = '0', fraction = ''] = match;
  const normalised = integer.replace(/^0+(?=\d)/, '');
  return `${sign}₹${groupIndian(normalised)}.${fraction.padEnd(2, '0')}`;
}

/** ₹12.4 L / ₹1.2 Cr for KPI tiles; show the exact value in a tooltip. */
export function formatMoneyCompact(amount: string): string {
  const match = MONEY_PATTERN.exec(amount.trim());
  if (!match) return amount;
  const sign = match[1] ?? '';
  const rupees = Number(match[2] ?? '0');
  const scaled = (value: number, divisor: number, unit: string) => {
    const shown = Math.round((value / divisor) * 10) / 10;
    return `${sign}₹${shown % 1 === 0 ? shown.toFixed(0) : shown.toFixed(1)} ${unit}`;
  };
  if (rupees >= 1_00_00_000) return scaled(rupees, 1_00_00_000, 'Cr');
  if (rupees >= 1_00_000) return scaled(rupees, 1_00_000, 'L');
  return `${sign}₹${groupIndian(String(rupees))}`;
}
