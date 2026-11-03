'use client';

import { PageHeader } from '@/components/shell/page-header';
import { InlineAlert } from '@/components/ui/inline-alert';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import { useUrlState } from '@/lib/hooks/use-url-state';
import { MASTER_SPECS } from './master-specs';
import { MastersTab } from './masters-tab';
import { MASTER_TYPES, type MasterType } from './types';

const TAB_PREFIX = 'masters';
const isMasterType = (value: string): value is MasterType =>
  (MASTER_TYPES as readonly string[]).includes(value);

/**
 * The shared lists every Institution picks from (API design 10.4g; PRD 7). The tab is in the URL, so a refresh or a
 * shared link opens the same list (DESIGN.md 13).
 */
export function MastersPage() {
  const [tab, setTab] = useUrlState('tab', MASTER_TYPES[0], isMasterType);
  return (
    <>
      <PageHeader title="Masters" meta="The lists Institutions choose from" />
      <Tabs
        idPrefix={TAB_PREFIX}
        label="Masters"
        value={tab}
        onChange={setTab}
        items={MASTER_TYPES.map((type) => ({ value: type, label: MASTER_SPECS[type].label }))}
      />
      <div className="pt-6">
        <InlineAlert tone="info">
          Entries in use are hidden, never deleted. A hidden entry stays where it is used, and is no longer
          offered for anything new.
        </InlineAlert>
      </div>
      {MASTER_TYPES.map((type) => (
        <TabPanel key={type} idPrefix={TAB_PREFIX} value={type} active={tab === type}>
          <MastersTab type={type} />
        </TabPanel>
      ))}
    </>
  );
}
