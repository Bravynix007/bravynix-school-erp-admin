'use client';

import { useState } from 'react';
import { AccountStatusChip } from '@/components/shell/account-status-chip';
import { WriteError } from '@/components/shell/write-error';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineAlert } from '@/components/ui/inline-alert';
import { KeyValueList } from '@/components/ui/key-value-list';
import { LinkButton } from '@/components/ui/link-button';
import { SideSheet } from '@/components/ui/side-sheet';
import { useToast } from '@/components/ui/toast';
import { societyWorkspaceHref } from '@/features/societies/societies-list';
import { formatInstant } from '@/lib/format/date';
import { ChangeEmailDialog, ReasonDialog } from './person-dialogs';
import { ACCOUNT_BLOCKED, isSuperAdmin, type Person } from './types';
import {
  useBlockAccount,
  useChangeEmail,
  useRemoveSuperAdmin,
  useResetAuthenticator,
  useUnblockAccount,
  useUnlockAccount,
} from './use-users';

type Action = 'block' | 'unblock' | 'email' | 'unlock' | 'reset' | 'remove';

/**
 * One person and what the Super Admin can do to the account: block, unblock, change email, support unlock
 * (PLT-15 to PLT-17, PLT-41), and for a Super Admin reset the authenticator and remove the role (PLT-18, PLT-14).
 * `reload` refetches the list, so a version conflict is answered with the latest account.
 */
export function PersonSheet({
  person,
  onClose,
  reload,
}: {
  person: Person;
  onClose: () => void;
  reload: () => void;
}) {
  const toast = useToast();
  const [action, setAction] = useState<Action | null>(null);
  const block = useBlockAccount(person.id);
  const unblock = useUnblockAccount(person.id);
  const changeEmail = useChangeEmail(person.id);
  const unlock = useUnlockAccount(person.id);
  const reset = useResetAuthenticator(person.id);
  const remove = useRemoveSuperAdmin();

  const writes = { block, unblock, email: changeEmail, unlock, reset, remove };
  const blocked = person.accountStatus === ACCOUNT_BLOCKED;
  const admin = isSuperAdmin(person);

  function finish(message: string) {
    setAction(null);
    toast.success(message);
  }
  function close() {
    if (action) writes[action].reset();
    setAction(null);
  }
  /** After a conflict the person sees the account as it is now, and chooses again. */
  function reloadList() {
    close();
    reload();
  }
  const write = (key: Action, overrides?: Record<string, string>) => ({
    pending: writes[key].isPending,
    error: writes[key].error,
    onReload: reloadList,
    overrides,
  });

  return (
    <>
      <SideSheet
        open
        onClose={onClose}
        title={person.displayName}
        status={<AccountStatusChip status={person.accountStatus} />}
        footer={
          <>
            {blocked ? (
              <Button variant="secondary" onClick={() => setAction('unblock')}>
                Unblock
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setAction('block')}>
                Block
              </Button>
            )}
            <Button variant="secondary" onClick={() => setAction('email')}>
              Change email
            </Button>
            <Button variant="secondary" onClick={() => setAction('unlock')}>
              Unlock sign-in
            </Button>
            {admin && person.authenticatorSetUp ? (
              <Button variant="secondary" onClick={() => setAction('reset')}>
                Reset authenticator
              </Button>
            ) : null}
            {admin ? (
              <Button variant="secondary" onClick={() => setAction('remove')}>
                Remove Super Admin
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {blocked ? (
            <InlineAlert tone="error">
              Blocked {person.blockedAt ? formatInstant(person.blockedAt) : ''}
              {person.blockReason ? `: ${person.blockReason}` : ''}. Every session ended, and they cannot sign
              in.
            </InlineAlert>
          ) : null}
          <KeyValueList
            items={[
              { label: 'Email', value: person.email },
              { label: admin ? 'Super Admin seat' : 'Owner seat', value: `Seat ${person.seatNo}` },
              { label: 'Added', value: formatInstant(person.grantedAt) },
              admin
                ? {
                    label: 'Authenticator',
                    value: person.authenticatorSetUp ? 'Set up' : 'Not set up yet (at their first sign-in)',
                  }
                : {
                    label: 'Society',
                    value: (
                      <LinkButton href={societyWorkspaceHref(person.society.id)} variant="tertiary">
                        {person.society.name}
                      </LinkButton>
                    ),
                  },
            ]}
          />
        </div>
      </SideSheet>

      {action === 'block' ? (
        <ReasonDialog
          title={`Block ${person.displayName}?`}
          description="Every session ends at once, they cannot sign in, and they are emailed. You can unblock them later."
          submitLabel="Block account"
          tone="danger"
          write={write('block', { INVALID_STATE: 'This account is already blocked or inactive.' })}
          onClose={close}
          onSubmit={(reason) =>
            block.mutate(
              { reason, version: person.version },
              { onSuccess: () => finish(`${person.displayName} blocked`) },
            )
          }
        />
      ) : null}

      {action === 'unblock' ? (
        <ConfirmDialog
          open
          title={`Unblock ${person.displayName}?`}
          consequence="They can sign in again with an emailed code."
          confirmLabel="Unblock account"
          loading={unblock.isPending}
          onCancel={close}
          onConfirm={() =>
            unblock.mutate(
              { version: person.version },
              { onSuccess: () => finish(`${person.displayName} unblocked`) },
            )
          }
        >
          {unblock.isError ? (
            <WriteError
              error={unblock.error}
              onReload={reloadList}
              overrides={{ INVALID_STATE: 'This account is not blocked.' }}
            />
          ) : null}
        </ConfirmDialog>
      ) : null}

      {action === 'email' ? (
        <ChangeEmailDialog
          current={person.email}
          write={write('email')}
          onClose={close}
          onSubmit={(email) =>
            changeEmail.mutate(
              { email, version: person.version },
              { onSuccess: () => finish('Email changed') },
            )
          }
        />
      ) : null}

      {action === 'unlock' ? (
        <ReasonDialog
          title={`Unlock sign-in for ${person.displayName}?`}
          description="Lifts the lock after wrong email codes and the 24-hour authenticator lock, whichever is in force."
          submitLabel="Unlock sign-in"
          write={write('unlock')}
          onClose={close}
          onSubmit={(reason) => unlock.mutate({ reason }, { onSuccess: () => finish('Sign-in unlocked') })}
        />
      ) : null}

      {action === 'reset' ? (
        <ConfirmDialog
          open
          title={`Reset the authenticator of ${person.displayName}?`}
          consequence="They are signed out, and set the authenticator up again at their next sign-in. They are emailed."
          confirmLabel="Reset authenticator"
          tone="danger"
          loading={reset.isPending}
          onCancel={close}
          onConfirm={() => reset.mutate(undefined, { onSuccess: () => finish('Authenticator reset') })}
        >
          {reset.isError ? <WriteError error={reset.error} /> : null}
        </ConfirmDialog>
      ) : null}

      {action === 'remove' ? (
        <ConfirmDialog
          open
          title={`Remove ${person.displayName} as Super Admin?`}
          consequence="Their Super Admin sessions end and the seat is free for someone else. Their account is not deleted."
          confirmLabel="Remove Super Admin"
          tone="danger"
          loading={remove.isPending}
          onCancel={close}
          onConfirm={() =>
            remove.mutate(person.id, {
              onSuccess: () => {
                finish(`${person.displayName} removed`);
                onClose();
              },
            })
          }
        >
          {remove.isError ? <WriteError error={remove.error} /> : null}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
