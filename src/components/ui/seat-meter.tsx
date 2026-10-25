import { IconPlus } from '@tabler/icons-react';
import { EntityAvatar } from './entity-avatar';

export interface Seat {
  id: string;
  name: string;
}

/**
 * For "max 3" limits (Super Admins, Society Owners): filled slots show
 * initials, empty ones a dashed "+" (DESIGN.md 9). The count is always
 * written out too, so the state never rests on the drawing.
 */
export function SeatMeter({
  max,
  seats,
  noun,
  onAdd,
  addLabel,
}: {
  max: number;
  seats: Seat[];
  /** "Owners", used in "2 of 3 Owners". */
  noun: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  const empty = Math.max(0, max - seats.length);
  return (
    <div className="flex items-center gap-3">
      <ul aria-label={noun} className="flex items-center gap-1.5">
        {seats.map((seat) => (
          <li key={seat.id}>
            <EntityAvatar name={seat.name} size="sm" />
          </li>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`empty-${i}`}>
            {onAdd ? (
              <button
                type="button"
                onClick={onAdd}
                aria-label={addLabel ?? `Add to ${noun}`}
                className="inline-flex size-7 items-center justify-center rounded-full border border-dashed border-ink-secondary text-ink-secondary hover:border-primary hover:text-primary"
              >
                <IconPlus size={14} aria-hidden="true" />
              </button>
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex size-7 items-center justify-center rounded-full border border-dashed border-ink-secondary text-ink-secondary"
              >
                <IconPlus size={14} />
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-caption text-ink-secondary tabular">
        {seats.length} of {max} {noun}
      </p>
    </div>
  );
}
