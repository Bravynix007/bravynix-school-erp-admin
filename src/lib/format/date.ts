import type { Actor } from '@/lib/api/envelope';

/** Every Institution runs on India Standard Time (DDD principle 10). */
const IST = 'Asia/Kolkata';

const dateParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const timeParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? '';
}

/** A school day "2026-10-23" → "23-10-2026" (PRD 11.2). No time zone shift. */
export function formatSchoolDate(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : day;
}

/** An instant "2026-10-23T04:45:00.000Z" → "23-10-2026 10:15" in IST (DESIGN.md 6). */
export function formatInstant(instant: string | Date): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return String(instant);
  const d = dateParts.formatToParts(date);
  const t = timeParts.formatToParts(date);
  return `${part(d, 'day')}-${part(d, 'month')}-${part(d, 'year')} ${part(t, 'hour')}:${part(t, 'minute')}`;
}

/** "R. Nair · 23-10-2026 10:15"; background jobs show as "System" (API design 7.6). */
export function formatStamp(actor: Actor | null | undefined, at: string): string {
  const name = actor?.id ? actor.displayName : 'System';
  return `${name} · ${formatInstant(at)}`;
}
