import { cn } from '@/lib/cn';

const tones = [
  'bg-primary-tint text-primary',
  'bg-info-bg text-info',
  'bg-warning-bg text-warning',
  'bg-success-bg text-success',
  'bg-neutral-bg text-neutral',
] as const;

const sizes = { sm: 'size-7 text-overline', md: 'size-8 text-caption', lg: 'size-10 text-label' } as const;

/** "Asha Rao" → "AR"; one word gives one letter. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]!;
  const last = words.length > 1 ? words[words.length - 1]! : '';
  return (Array.from(first)[0]! + (last ? Array.from(last)[0]! : '')).toUpperCase();
}

/** A stable tone per name, so a person keeps one colour everywhere. */
function toneFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return tones[hash % tones.length]!;
}

/**
 * Initials in a tinted circle. Shown beside the name it stands for, it is
 * decorative; alone (a seat slot) it is named for assistive technology.
 */
export function EntityAvatar({
  name,
  size = 'md',
  decorative = false,
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  decorative?: boolean;
  className?: string;
}) {
  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative ? true : undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        sizes[size],
        toneFor(name),
        className,
      )}
    >
      <span aria-hidden="true">{initialsOf(name)}</span>
    </span>
  );
}
