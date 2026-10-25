import type { Actor } from '@/lib/api/envelope';
import { formatInstant } from '@/lib/format/date';

function who(actor: Actor | null | undefined): string {
  return actor?.id ? actor.displayName : 'System';
}

/**
 * The foot of every detail: "Added by A. Rao · 02-09-2026 11:40" and
 * "Updated by K. Menon · 23-10-2026 10:15"; background jobs show as System (DESIGN.md 9).
 */
export function StampBlock({
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
}: {
  createdBy: Actor | null | undefined;
  createdAt: string;
  updatedBy: Actor | null | undefined;
  updatedAt: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-line-subtle pt-3 text-caption text-ink-tertiary">
      <p>
        Added by {who(createdBy)} · <span className="tabular">{formatInstant(createdAt)}</span>
      </p>
      <p>
        Updated by {who(updatedBy)} · <span className="tabular">{formatInstant(updatedAt)}</span>
      </p>
    </div>
  );
}
