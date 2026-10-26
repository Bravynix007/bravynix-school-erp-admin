'use client';

import { PageHeader } from '@/components/shell/page-header';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import { useUrlState } from '@/lib/hooks/use-url-state';
import { SocietyOwnersTab } from './society-owners-tab';
import { SuperAdminsTab } from './super-admins-tab';

const TAB_PREFIX = 'users';
const TABS = ['super-admins', 'owners'];

/**
 * The people the Super Admin manages: the Super Admins, and the Owners of every Society (API design 10.4d).
 * The tab and the open person are in the URL, so a refresh or a shared link opens the same view (DESIGN.md 13).
 */
export function UsersPage() {
  const [tab, setTab] = useUrlState('tab', 'super-admins', (value) => TABS.includes(value));
  const [personId, setPersonId] = useUrlState('person', '');
  // One person can own several Societies, one row each, so an Owner is named by both.
  const [societyId, setSocietyId] = useUrlState('society', '');
  function select(person: string, society = '') {
    setPersonId(person);
    setSocietyId(society);
  }
  return (
    <>
      <PageHeader title="Users" meta="Super Admins and Society Owners" />
      <Tabs
        idPrefix={TAB_PREFIX}
        label="Kinds of user"
        value={tab}
        onChange={(value) => {
          select('');
          setTab(value);
        }}
        items={[
          { value: 'super-admins', label: 'Super Admins' },
          { value: 'owners', label: 'Society Owners' },
        ]}
      />
      <TabPanel idPrefix={TAB_PREFIX} value="super-admins" active={tab === 'super-admins'}>
        <SuperAdminsTab selectedId={tab === 'super-admins' ? personId : ''} onSelect={select} />
      </TabPanel>
      <TabPanel idPrefix={TAB_PREFIX} value="owners" active={tab === 'owners'}>
        <SocietyOwnersTab
          selection={tab === 'owners' && personId && societyId ? { personId, societyId } : null}
          onSelect={select}
        />
      </TabPanel>
    </>
  );
}
