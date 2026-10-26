import { StatusChip, statusTone } from '@/components/ui/status-chip';

export type TenantStatus = keyof typeof statusTone.tenant;

/** What the chip says for a Society or Institution: deactivated wins over paused (API design 10.4b). */
export function tenantStatus(record: { status: number; paused: boolean }): TenantStatus {
  if (record.status === 0) return 'Inactive';
  return record.paused ? 'Paused' : 'Active';
}

export function TenantStatusChip({ record }: { record: { status: number; paused: boolean } }) {
  const status = tenantStatus(record);
  return <StatusChip tone={statusTone.tenant[status]} label={status} />;
}
