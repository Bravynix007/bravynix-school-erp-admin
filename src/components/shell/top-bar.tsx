'use client';

import { IconLogout } from '@tabler/icons-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSession } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { setShortcutsEnabled, useShortcutsEnabled } from '@/lib/shortcuts';

/** 64 px white top bar with environment badge and sign-out (DESIGN.md 8, 9). */
export function TopBar() {
  const { signOut } = useSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const shortcuts = useShortcutsEnabled();
  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line-subtle bg-surface px-6 py-2 lg:px-8">
      <div className="flex items-center gap-3">
        <span className="text-h3 font-semibold lg:hidden">BravyNix Console</span>
        {env.NEXT_PUBLIC_APP_ENV !== 'production' ? (
          <span className="rounded-sm bg-sunken px-2 py-0.5 font-mono text-caption text-ink-secondary uppercase">
            {env.NEXT_PUBLIC_APP_ENV}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Switch
          label="Single-key shortcuts"
          shortLabel="Shortcuts"
          checked={shortcuts}
          onChange={setShortcutsEnabled}
        />
        {failed ? (
          <p role="alert" className="text-caption text-error">
            Couldn&apos;t sign out. Check your connection and try again.
          </p>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          loading={busy}
          icon={<IconLogout size={16} aria-hidden="true" />}
          onClick={async () => {
            setBusy(true);
            setFailed(false);
            try {
              await signOut();
            } catch {
              setFailed(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          Log out
        </Button>
      </div>
    </header>
  );
}
