'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { LoadFailed } from '@/components/shell/load-failed';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/ui/inline-alert';
import { KeyValueList } from '@/components/ui/key-value-list';
import { MoneyBreakdown } from '@/components/ui/money-breakdown';
import { SideSheet } from '@/components/ui/side-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StampBlock } from '@/components/ui/stamp-block';
import { useToast } from '@/components/ui/toast';
import { institutionWorkspaceHref } from '@/features/institutions/institution-workspace';
import { societyWorkspaceHref } from '@/features/societies/societies-list';
import { formatMoney } from '@/lib/format/money';
import { toPaise } from './due-math';
import { formatInstant, formatSchoolDate, todayIst } from '@/lib/format/date';
import { useGuardedWrite } from '@/lib/hooks/use-one-at-a-time';
import { CancelDueDialog } from './cancel-due-dialog';
import { SETTLED_ERROR_COPY } from './dues-copy';
import { EditDueDialog } from './edit-due-dialog';
import { DueStatusChip } from './due-status';
import { PayDueDialog } from './pay-due-dialog';
import { DueStatus, PAYMENT_MODE_NAMES, type Due } from './types';
import { useCancelDue, useDue, useEditDue, useMarkDuePaid } from './use-dues';
import { formatCount } from '@/lib/format/count';

type Action = 'edit' | 'pay' | 'cancel';

const day = (value: string | null) => (value ? formatSchoolDate(value) : '—');

/** PLT-27: one due, opened beside the ledger. The ID is in the URL, so a refresh keeps it open. */
export function DueSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const toast = useToast();
  const query = useDue(id);
  const [action, setAction] = useState<Action | null>(null);
  const edit = useEditDue(id);
  const pay = useMarkDuePaid(id);
  const cancel = useCancelDue(id);
  const writes = { edit, pay, cancel };
  const attempt = useGuardedWrite();
  const due = query.data;
  const open = due?.dueStatus === DueStatus.Due;
  const today = todayIst();

  function close() {
    if (action) writes[action].reset();
    setAction(null);
  }
  /** After a conflict the operator sees the due as it is now, and chooses again. */
  function reloadDue() {
    close();
    void query.refetch();
  }
  const write = (key: Action) => ({
    pending: writes[key].isPending,
    error: writes[key].error,
    onReload: reloadDue,
    overrides: SETTLED_ERROR_COPY,
  });
  const clearRefusal = (key: Action) => () => {
    if (writes[key].isError) writes[key].reset();
  };
  function finish(message: string) {
    setAction(null);
    toast.success(message);
  }

  let body: ReactNode;
  if (due) body = <DueBody due={due} />;
  else if (query.isError) {
    body = (
      <LoadFailed
        error={query.error}
        onRetry={() => void query.refetch()}
        list={{ href: '/dues', label: 'Dues' }}
      />
    );
  } else {
    body = (
      <div role="status" aria-label="Loading the due" className="flex flex-col gap-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <>
      <SideSheet
        open
        onClose={onClose}
        title={due?.invoiceNo ?? 'Due'}
        status={due ? <DueStatusChip due={due} today={today} /> : undefined}
        footer={
          open ? (
            <>
              <Button variant="secondary" onClick={() => setAction('cancel')}>
                Cancel due
              </Button>
              <Button variant="secondary" onClick={() => setAction('edit')}>
                Edit
              </Button>
              <Button onClick={() => setAction('pay')}>Mark as paid</Button>
            </>
          ) : undefined
        }
      >
        {body}
      </SideSheet>

      {due && action === 'edit' ? (
        <EditDueDialog
          due={due}
          write={write('edit')}
          onEdit={clearRefusal('edit')}
          onClose={close}
          onSubmit={(body) =>
            attempt(
              (settled) => edit.mutate(body, settled),
              () => finish('Due updated'),
            )
          }
        />
      ) : null}
      {due && action === 'pay' ? (
        <PayDueDialog
          due={due}
          write={write('pay')}
          onEdit={clearRefusal('pay')}
          onClose={close}
          onSubmit={(body) =>
            attempt(
              (settled) => pay.mutate(body, settled),
              () => finish('Marked as paid'),
            )
          }
        />
      ) : null}
      {due && action === 'cancel' ? (
        <CancelDueDialog
          due={due}
          write={write('cancel')}
          onEdit={clearRefusal('cancel')}
          onClose={close}
          onSubmit={(body) =>
            attempt(
              (settled) => cancel.mutate(body, settled),
              () => finish('Due cancelled'),
            )
          }
        />
      ) : null}
    </>
  );
}

function DueBody({ due }: { due: Due }) {
  const rows = [
    {
      label: `${formatCount(due.studentCount)} ${due.studentCount === 1 ? 'student' : 'students'} × ${formatMoney(due.ratePerStudentAmount)}`,
      amount: due.baseAmount,
      note: due.studentCountNote ?? undefined,
    },
    ...(toPaise(due.adjustmentAmount) === 0n
      ? []
      : [{ label: 'Adjustment', amount: due.adjustmentAmount, note: due.adjustmentNote ?? undefined }]),
  ];

  return (
    <div className="flex flex-col gap-6">
      {due.dueStatus === DueStatus.Cancelled ? (
        <InlineAlert tone="warning">
          Cancelled {due.cancelledAt ? formatInstant(due.cancelledAt) : ''}
          {due.cancelledBy ? ` by ${due.cancelledBy.displayName}` : ''}: {due.cancelReason}. The Owners no
          longer owe it, and the invoice number is kept.
        </InlineAlert>
      ) : null}
      <KeyValueList
        items={[
          {
            label: 'Institution',
            value: (
              <Link
                href={institutionWorkspaceHref(due.institution.id)}
                className="text-primary hover:underline"
              >
                {due.institution.name}
              </Link>
            ),
          },
          {
            label: 'Society',
            value: (
              <Link href={societyWorkspaceHref(due.societyId)} className="text-primary hover:underline">
                {due.societyName}
              </Link>
            ),
          },
          {
            label: 'Period',
            value: (
              <span className="tabular">
                {day(due.periodStartDate)} to {day(due.periodEndDate)}
              </span>
            ),
          },
          { label: 'Pay by', value: <span className="tabular">{day(due.dueDate)}</span> },
        ]}
      />
      <MoneyBreakdown
        label="How the total was reached"
        rows={rows}
        total={{ label: 'Total', amount: due.totalAmount }}
      />
      {due.dueStatus === DueStatus.Paid ? (
        <KeyValueList
          items={[
            { label: 'Paid on', value: <span className="tabular">{day(due.paidDate)}</span> },
            {
              label: 'Paid by',
              value: due.paymentMode ? (PAYMENT_MODE_NAMES[due.paymentMode] ?? '—') : '—',
            },
            { label: 'Reference', value: due.paymentReference ?? '—' },
          ]}
        />
      ) : null}
      <StampBlock
        createdBy={due.createdBy}
        createdAt={due.createdAt}
        updatedBy={due.updatedBy}
        updatedAt={due.updatedAt}
      />
    </div>
  );
}
