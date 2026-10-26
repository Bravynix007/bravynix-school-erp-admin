import { StatusChip, statusTone } from '@/components/ui/status-chip';

export type TenantStatus = 'Active' | 'Inactive';

/** What the chip says for a Society or Institution: active or deactivated. Blocked sections are shown beside it. */
export function tenantStatus(record: { status: number }): TenantStatus {
  return record.status === 0 ? 'Inactive' : 'Active';
}

export function TenantStatusChip({ record }: { record: { status: number } }) {
  const status = tenantStatus(record);
  return <StatusChip tone={statusTone.tenant[status]} label={status} />;
}
