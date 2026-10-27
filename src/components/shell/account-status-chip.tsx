import { StatusChip, statusTone } from '@/components/ui/status-chip';

const LABELS = { 0: 'Inactive', 1: 'Active', 2: 'Blocked', 3: 'Pending' } as const;

/** `users.account_status` as the chip the console shows (DDD 9.1). Inactive has no tone of its own, so it is neutral. */
export function AccountStatusChip({ status }: { status: number }) {
  const label = LABELS[status as keyof typeof LABELS] ?? 'Unknown';
  return label === 'Active' || label === 'Blocked' || label === 'Pending' ? (
    <StatusChip tone={statusTone.account[label]} label={label} />
  ) : (
    <StatusChip tone="neutral" label={label} />
  );
}
