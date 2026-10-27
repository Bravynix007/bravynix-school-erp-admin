'use client';

import { useRef, useState } from 'react';
import { WriteError } from '@/components/shell/write-error';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { ReasonDialog } from '@/features/users/person-dialogs';
import { useGuardedWrite } from '@/lib/hooks/use-one-at-a-time';
import { BLOCK_EFFECT, SECTION_NOUN, sectionTitle } from './section-copy';
import type { BlockTarget } from './types';
import { useBlockSection, useUnblockSection } from './use-blocks';

type Dialog = 'block' | 'unblock';

/**
 * Blocks or unblocks one section of a Society or Institution (PLT-42, PLT-43; API design 10.4e). The label says which:
 * "Block staff" or "Unblock staff", and `name` is the Society or Institution, so a row of buttons stays distinguishable.
 * A section that is open cannot be blocked while `canBlock` is false (a deactivated Society or Institution).
 */
export function SectionBlockButton({
  target,
  name,
  blocked,
  canBlock = true,
  onTriggerGone,
}: {
  target: BlockTarget;
  name: string;
  blocked: boolean;
  canBlock?: boolean;
  /**
   * Called after a successful write when this button is no longer on the page: a filtered list drops the row once
   * its last blocked section is lifted, and with it the button focus would return to (DESIGN.md 15).
   */
  onTriggerGone?: () => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const attempt = useGuardedWrite();
  const block = useBlockSection();
  const unblock = useUnblockSection();
  const [dialog, setDialog] = useState<Dialog | null>(null);

  // A write refreshes the Society and Institution, which can take the button away while its dialog is open
  // (the Institution was deactivated, or the block lifted, meanwhile). The dialog stays so the outcome is shown.
  if (!blocked && !canBlock && dialog === null) return null;

  const noun = SECTION_NOUN[target.section];
  const close = () => {
    block.reset();
    unblock.reset();
    setDialog(null);
    // The refetch has already run, so a dropped row has already unmounted this button.
    window.setTimeout(() => {
      if (!trigger.current?.isConnected) onTriggerGone?.();
    }, 0);
  };
  const finish = (message: string) => {
    close();
    toast.success(message);
  };

  return (
    <>
      {blocked || canBlock ? (
        <Button
          ref={trigger}
          variant="secondary"
          size="sm"
          aria-label={`${blocked ? 'Unblock' : 'Block'} ${noun} of ${name}`}
          onClick={() => setDialog(blocked ? 'unblock' : 'block')}
        >
          {blocked ? 'Unblock' : 'Block'} {noun}
        </Button>
      ) : null}

      {dialog === 'block' ? (
        <ReasonDialog
          title={`Block ${noun} of ${name}?`}
          description={`${BLOCK_EFFECT[target.section]} Nothing is deleted. The block stays until you lift it.`}
          submitLabel={`Block ${noun}`}
          tone="danger"
          write={{
            pending: block.isPending,
            error: block.error,
            overrides: {
              DUPLICATE: `The ${noun} of ${name} are already blocked.`,
              INVALID_STATE:
                target.institutionId === null
                  ? `${name} is deactivated, so nothing can be blocked in it.`
                  : `${name} or its Society is deactivated, so nothing can be blocked in it.`,
            },
          }}
          onClose={close}
          onSubmit={(reason) =>
            attempt(
              (settled) =>
                block.mutate(
                  {
                    section: target.section,
                    societyId: target.societyId,
                    ...(target.institutionId === null ? {} : { institutionId: target.institutionId }),
                    reason,
                  },
                  settled,
                ),
              () => finish(`${sectionTitle(target.section)} of ${name} blocked`),
            )
          }
        />
      ) : null}

      <ConfirmDialog
        open={dialog === 'unblock'}
        title={`Unblock ${noun} of ${name}?`}
        consequence="They can work again on their next request."
        confirmLabel={`Unblock ${noun}`}
        loading={unblock.isPending}
        onCancel={close}
        onConfirm={() =>
          attempt(
            (settled) => unblock.mutate(target, settled),
            () => finish(`${sectionTitle(target.section)} of ${name} unblocked`),
          )
        }
      >
        {unblock.isError ? (
          <WriteError
            error={unblock.error}
            overrides={{ NOT_FOUND: `The ${noun} of ${name} are not blocked any more.` }}
          />
        ) : null}
      </ConfirmDialog>
    </>
  );
}
