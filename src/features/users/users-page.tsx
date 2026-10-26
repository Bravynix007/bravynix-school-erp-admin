'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import { SocietyOwnersTab } from './society-owners-tab';
import { SuperAdminsTab } from './super-admins-tab';

const TAB_PREFIX = 'users';

/** The people the Super Admin manages: the Super Admins, and the Owners of every Society (API design 10.4d). */
export function UsersPage() {
  const [tab, setTab] = useState('super-admins');
  return (
    <>
      <PageHeader title="Users" meta="Super Admins and Society Owners" />
      <Tabs
        idPrefix={TAB_PREFIX}
        label="Kinds of user"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'super-admins', label: 'Super Admins' },
          { value: 'owners', label: 'Society Owners' },
        ]}
      />
      <TabPanel idPrefix={TAB_PREFIX} value="super-admins" active={tab === 'super-admins'}>
        <SuperAdminsTab />
      </TabPanel>
      <TabPanel idPrefix={TAB_PREFIX} value="owners" active={tab === 'owners'}>
        <SocietyOwnersTab />
      </TabPanel>
    </>
  );
}
