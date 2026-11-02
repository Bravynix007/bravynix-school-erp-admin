'use client';

import type { Route } from 'next';
import { useSearchParams } from 'next/navigation';
import { LoadFailed } from '@/components/shell/load-failed';
import { PageHeader } from '@/components/shell/page-header';
import { RecordNotFound } from '@/components/shell/status-panels';
import { TenantStatusChip } from '@/components/shell/tenant-status-chip';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { InlineAlert } from '@/components/ui/inline-alert';
import { KeyValueList } from '@/components/ui/key-value-list';
import { Mono } from '@/components/ui/mono';
import { Skeleton } from '@/components/ui/skeleton';
import { StampBlock } from '@/components/ui/stamp-block';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import { BlockedSectionChips } from '@/features/blocks/blocked-section-chips';
import { DuesLedger } from '@/features/billing/dues-ledger';
import { PricingTab } from '@/features/billing/pricing-tab';
import { societyWorkspaceHref } from '@/features/societies/societies-list';
import { useUrlState } from '@/lib/hooks/use-url-state';
import { boardName } from './board';
import type { InstitutionDetail } from './types';
import { useInstitution } from './use-institutions';

const TAB_PREFIX = 'institution';
const TABS = ['overview', 'pricing', 'dues'];

export const institutionWorkspaceHref = (id: string, tab?: string) =>
  `/institutions/workspace?id=${id}${tab ? `&tab=${tab}` : ''}` as Route;

/** PLT-45: one Institution with its profile, its Pricing tab and its Dues. The ID is a query parameter, because the console is a static export. */
export function InstitutionWorkspace() {
  // An empty `?id=` is no ID: it would fetch the list as if it were one Institution.
  const id = useSearchParams().get('id') || null;
  const query = useInstitution(id);

  if (id === null) return <RecordNotFound listHref="/institutions" listLabel="Institutions" />;
  if (query.isPending) return <WorkspaceSkeleton />;
  if (query.isError) {
    return (
      <LoadFailed
        error={query.error}
        onRetry={() => void query.refetch()}
        list={{ href: '/institutions', label: 'Institutions' }}
      />
    );
  }
  return <Workspace institution={query.data} />;
}

function WorkspaceSkeleton() {
  return (
    <div role="status" aria-label="Loading the Institution" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function Workspace({ institution }: { institution: InstitutionDetail }) {
  const [tab, setTab] = useUrlState('tab', 'overview', (value) => TABS.includes(value));
  const societyDeactivated = institution.societyStatus === 0;
  const deactivated = institution.status === 0 || societyDeactivated;
  const board = boardName(institution.boardCode);

  return (
    <>
      <PageHeader
        title={institution.name}
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: 'Societies', href: '/societies' },
              { label: institution.societyName, href: societyWorkspaceHref(institution.societyId) },
              { label: institution.name },
            ]}
          />
        }
        status={
          <>
            <TenantStatusChip record={{ status: deactivated ? 0 : 1 }} />
            <BlockedSectionChips sections={institution.blockedSections} />
          </>
        }
        meta={
          <>
            <Mono>{institution.code}</Mono>
            {[board, institution.place].filter(Boolean).map((part) => ` · ${part}`)}
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {deactivated ? (
          <InlineAlert tone="info">
            {societyDeactivated
              ? 'Its Society is deactivated.'
              : 'This Institution is deactivated by its Society’s Owners.'}{' '}
            Nothing was deleted, and it takes no new rate or due.
          </InlineAlert>
        ) : null}
        <Tabs
          idPrefix={TAB_PREFIX}
          label="Institution sections"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'overview', label: 'Overview' },
            { value: 'pricing', label: 'Pricing' },
            { value: 'dues', label: 'Dues' },
          ]}
        />

        <TabPanel idPrefix={TAB_PREFIX} value="overview" active={tab === 'overview'}>
          <div className="flex flex-col gap-6 pt-4">
            <KeyValueList
              items={[
                { label: 'Society', value: institution.societyName },
                { label: 'Board', value: board ?? '—' },
                { label: 'Affiliation number', value: institution.affiliationNumber ?? '—' },
                { label: 'GSTIN', value: institution.gstin ?? '—' },
                { label: 'Email', value: institution.email ?? '—' },
                {
                  label: 'Phone',
                  value: institution.phone
                    ? `+${institution.phone.countryCode} ${institution.phone.number}`
                    : '—',
                },
                { label: 'Telephone', value: institution.telephone ?? '—' },
                {
                  label: 'Address',
                  value:
                    [institution.address.line1, institution.address.line2, institution.address.pincode]
                      .filter(Boolean)
                      .join(', ') || '—',
                },
              ]}
            />
            <StampBlock
              createdBy={institution.createdBy}
              createdAt={institution.createdAt}
              updatedBy={institution.updatedBy}
              updatedAt={institution.updatedAt}
            />
          </div>
        </TabPanel>

        <TabPanel idPrefix={TAB_PREFIX} value="pricing" active={tab === 'pricing'}>
          <PricingTab
            institutionId={institution.id}
            institutionName={institution.name}
            canChange={!deactivated}
          />
        </TabPanel>

        <TabPanel idPrefix={TAB_PREFIX} value="dues" active={tab === 'dues'}>
          <DuesLedger
            scope={{
              institution: {
                id: institution.id,
                name: institution.name,
                societyName: institution.societyName,
              },
              canRaise: !deactivated,
            }}
          />
        </TabPanel>
      </div>
    </>
  );
}
