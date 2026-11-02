import { StatusChip, statusTone } from '@/components/ui/status-chip';
import { DueStatus, type DueLine } from './types';

type DueStatusName = keyof typeof statusTone.due;

const NAMES: Record<number, DueStatusName> = {
  [DueStatus.Due]: 'Due',
  [DueStatus.Paid]: 'Paid',
  [DueStatus.Cancelled]: 'Cancelled',
};

export const dueStatusName = (status: number): DueStatusName => NAMES[status] ?? 'Due';

/** A due that is still Due after its due date. A due with no due date is never past it. */
export const isPastDue = (due: Pick<DueLine, 'dueStatus' | 'dueDate'>, today: string): boolean =>
  due.dueStatus === DueStatus.Due && due.dueDate !== null && due.dueDate < today;

/** Due, Paid or Cancelled; a Due past its date also says so (DESIGN.md 5). */
export function DueStatusChip({
  due,
  today,
}: {
  due: Pick<DueLine, 'dueStatus' | 'dueDate'>;
  today: string;
}) {
  const name = dueStatusName(due.dueStatus);
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <StatusChip tone={statusTone.due[name]} label={name} />
      {isPastDue(due, today) ? <StatusChip tone="error" label="Past due date" /> : null}
    </span>
  );
}
