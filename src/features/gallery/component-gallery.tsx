'use client';

import { useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, type Column, type SortDirection } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { EntityAvatar } from '@/components/ui/entity-avatar';
import { FilterBar } from '@/components/ui/filter-bar';
import { KeyValueList } from '@/components/ui/key-value-list';
import { KpiTile } from '@/components/ui/kpi-tile';
import { LoadMore, Pagination } from '@/components/ui/pagination';
import { MoneyBreakdown } from '@/components/ui/money-breakdown';
import { MoneyField } from '@/components/ui/money-field';
import { Mono } from '@/components/ui/mono';
import { SeatMeter } from '@/components/ui/seat-meter';
import { Select } from '@/components/ui/select';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { StampBlock } from '@/components/ui/stamp-block';
import { StatusChip, statusTone } from '@/components/ui/status-chip';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import { TextField } from '@/components/ui/text-field';
import { Textarea } from '@/components/ui/textarea';
import { Timeline } from '@/components/ui/timeline';
import { AuditDiff } from '@/components/ui/audit-diff';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { ErrorBanner } from '@/components/ui/error-banner';
import { LanguageSelect, type LanguageCode } from '@/components/ui/language-select';
import { PipelineCard } from '@/components/ui/progress';
import { SideSheet } from '@/components/ui/side-sheet';
import { Stepper } from '@/components/ui/stepper';
import { SupportModeBar } from '@/components/ui/support-mode-bar';
import { useToast } from '@/components/ui/toast';
import { AccessDenied, RecordNotFound } from '@/components/shell/status-panels';
import { PageHeader } from '@/components/shell/page-header';
import { env } from '@/lib/env';
import { formatMoney, formatMoneyCompact } from '@/lib/format/money';

interface Demo {
  id: string;
  name: string;
  code: string;
  status: 'Active' | 'Paused' | 'Inactive';
  seats: number;
}

const ALL: Demo[] = Array.from({ length: 47 }, (_, i) => ({
  id: String(i + 1),
  name:
    ['Green Valley School', 'Lakeview Academy', 'St. Mary Public School', 'Sri Vidya Vidyalaya'][i % 4]! +
    ` ${i + 1}`,
  code: `INS-${String(i + 1).padStart(3, '0')}`,
  status: (['Active', 'Paused', 'Inactive'] as const)[i % 3]!,
  seats: 120 + ((i * 97) % 1800),
}));

const PAGE_SIZE = 20;
const actor = (displayName: string) => ({ id: 'u1', displayName, roleName: 'Super Admin' });

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-12">
      <h2 id={id} className="mb-4 text-h2 font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Every console widget on one page, for review and for the browser accessibility check. Not part of a production build. */
export function ComponentGallery() {
  if (env.NEXT_PUBLIC_APP_ENV === 'production') {
    return (
      <EmptyState
        title="Not available"
        description="The component gallery is only part of local and staging builds."
      />
    );
  }
  return <Gallery />;
}

function Gallery() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>({
    key: 'name',
    direction: 'asc',
  });
  const [selected, setSelected] = useState<string | undefined>();
  const [shown, setShown] = useState(10);
  const [tab, setTab] = useState('owners');
  const [fee, setFee] = useState('124500.50');
  const [plan, setPlan] = useState('');
  const [dialog, setDialog] = useState<'confirm' | 'danger' | 'form' | 'sheet' | null>(null);
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [expiresAt] = useState(() => new Date(Date.now() + 42 * 60 * 1000).toISOString());
  const toast = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = ALL.filter((r) => (status ? r.status === status : true)).filter((r) =>
      q ? r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) : true,
    );
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = sort.key === 'seats' ? a.seats : a.name;
      const bv = sort.key === 'seats' ? b.seats : b.name;
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [search, status, sort]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<Demo>[] = [
    {
      key: 'name',
      header: 'Institution',
      primary: true,
      sortable: true,
      cell: (r) => (
        <>
          <span className="block">{r.name}</span>
          <Mono className="text-caption text-ink-secondary">{r.code}</Mono>
        </>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <StatusChip tone={statusTone.tenant[r.status]} label={r.status} />,
    },
    { key: 'seats', header: 'Seats', align: 'end', sortable: true, cell: (r) => r.seats },
  ];

  function onSort(key: string) {
    setPage(1);
    setSort((s) =>
      s.key === key ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' },
    );
  }

  return (
    <>
      <PageHeader
        title="Component gallery"
        breadcrumb={<Breadcrumbs items={[{ label: 'Platform' }, { label: 'Component gallery' }]} />}
        meta="Every console widget with sample data. Local and staging builds only."
      />

      <Section id="g-kpi" title="KPI tiles">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile label="Societies" value="12" caption="+3 this month" href="/societies" />
          <KpiTile label="Institutions" value="47" caption="4 Societies" href="/institutions" />
          <KpiTile
            label="Dues open"
            value={formatMoneyCompact('1240000')}
            exact={formatMoney('1240000')}
            caption="9 Institutions"
          />
          <KpiTile label="AI reports" value="3" caption="1 in review" />
        </div>
      </Section>

      <Section id="g-fields" title="Form fields">
        <div className="grid max-w-[720px] gap-4 sm:grid-cols-2">
          <TextField label="Institution name" requiredMark hint="As printed on the invoice" />
          <TextField label="Contact email" defaultValue="owner@example" error="Enter a valid email address" />
          <Select
            label="Plan"
            placeholder="Choose a plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            options={[
              { value: 'basic', label: 'Basic' },
              { value: 'plus', label: 'Plus' },
            ]}
          />
          <MoneyField
            label="Monthly fee (₹)"
            value={fee}
            onValueChange={setFee}
            hint="Rupees, two decimals"
          />
          <Textarea label="Internal note" className="sm:col-span-2" />
          <Checkbox label="Send the invoice by email" hint="Goes to the Society Owner" />
        </div>
      </Section>

      <Section id="g-table" title="Filter bar, table and pagination">
        <FilterBar
          searchLabel="Search Institutions"
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          filters={[
            {
              key: 'status',
              label: 'Status',
              value: status,
              onChange: (v) => {
                setStatus(v);
                setPage(1);
              },
              options: [
                { value: 'Active', label: 'Active' },
                { value: 'Paused', label: 'Paused' },
                { value: 'Inactive', label: 'Inactive' },
              ],
            },
          ]}
          countLabel={`${filtered.length} Institutions`}
        />
        <DataTable
          caption="Institutions"
          columns={columns}
          rows={pageRows}
          getRowId={(r) => r.id}
          sort={sort}
          onSort={onSort}
          selectedId={selected}
          onRowOpen={(r) => setSelected(r.id)}
          empty={
            <EmptyState title="No Institutions match" description="Clear the filters to see all of them." />
          }
          footer={
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
              noun="Institutions"
            />
          }
        />
      </Section>

      <Section id="g-cursor" title="Load more (cursor mode)">
        <DataTable
          caption="Audit entries"
          columns={columns.slice(0, 2)}
          rows={ALL.slice(0, shown)}
          getRowId={(r) => r.id}
          dense
          footer={
            <LoadMore
              shown={shown}
              noun="entries"
              hasMore={shown < ALL.length}
              onLoadMore={() => setShown((n) => Math.min(n + 10, ALL.length))}
            />
          }
        />
      </Section>

      <Section id="g-loading" title="Loading">
        <TableSkeleton columns={3} rows={3} />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-24" />
        </div>
      </Section>

      <Section id="g-tabs" title="Tabs, seat meter, key values">
        <Tabs
          idPrefix="gallery"
          label="Society"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'owners', label: 'Owners', count: '2/3' },
            { value: 'institutions', label: 'Institutions', count: '4' },
            { value: 'billing', label: 'Billing' },
          ]}
        />
        <TabPanel idPrefix="gallery" value="owners" active={tab === 'owners'}>
          <SeatMeter
            noun="Owners"
            max={3}
            seats={[
              { id: '1', name: 'Asha Rao' },
              { id: '2', name: 'K. Menon' },
            ]}
            onAdd={() => {}}
            addLabel="Add an Owner"
          />
        </TabPanel>
        <TabPanel idPrefix="gallery" value="institutions" active={tab === 'institutions'}>
          <KeyValueList
            items={[
              { label: 'Society', value: 'Sri Vidya Educational Society' },
              { label: 'Code', value: <Mono>SVE-004</Mono> },
              { label: 'Plan', value: 'Plus' },
              { label: 'Seats', value: <span className="tabular">1,200</span> },
            ]}
          />
        </TabPanel>
        <TabPanel idPrefix="gallery" value="billing" active={tab === 'billing'}>
          <div className="max-w-[480px]">
            <MoneyBreakdown
              label="Due breakdown"
              rows={[
                { label: 'Seats (420 × ₹300)', amount: '126000' },
                { label: 'Early payment discount', amount: '-1260.00', note: '1% if paid by 05-11-2026' },
              ]}
              total={{ label: 'Total due', amount: '124740' }}
            />
          </div>
        </TabPanel>
      </Section>

      <Section id="g-history" title="Timeline and stamp">
        <div className="max-w-[560px] rounded-lg border border-line bg-surface p-5">
          <Timeline
            label="Due history"
            entries={[
              {
                id: '1',
                action: 'Marked paid',
                actor: actor('K. Menon'),
                at: '2026-10-23T04:45:00.000Z',
                tone: 'success',
              },
              { id: '2', action: 'Reminder sent', actor: null, at: '2026-10-20T04:30:00.000Z', tone: 'info' },
              {
                id: '3',
                action: 'Due raised',
                actor: actor('A. Rao'),
                at: '2026-10-01T05:00:00.000Z',
                tone: 'warning',
              },
            ]}
          />
          <div className="mt-5">
            <StampBlock
              createdBy={actor('A. Rao')}
              createdAt="2026-09-02T06:10:00.000Z"
              updatedBy={actor('K. Menon')}
              updatedAt="2026-10-23T04:45:00.000Z"
            />
          </div>
        </div>
      </Section>

      <Section id="g-overlays" title="Dialogs, side sheet and toasts">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDialog('confirm')}>
            Open confirm dialog
          </Button>
          <Button variant="secondary" onClick={() => setDialog('danger')}>
            Open danger dialog
          </Button>
          <Button variant="secondary" onClick={() => setDialog('form')}>
            Open form dialog
          </Button>
          <Button variant="secondary" onClick={() => setDialog('sheet')}>
            Open side sheet
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast.success('Due BNX/FY2026-27/0007 raised', { action: { label: 'View', href: '/dues' } })
            }
          >
            Show success toast
          </Button>
          <Button variant="secondary" onClick={() => toast.error('Could not save. Check your connection.')}>
            Show error toast
          </Button>
        </div>
        <ConfirmDialog
          open={dialog === 'confirm'}
          title="Pause this Institution?"
          consequence="Staff and parents lose access until you resume it."
          confirmLabel="Pause Institution"
          onConfirm={() => setDialog(null)}
          onCancel={() => setDialog(null)}
        />
        <ConfirmDialog
          open={dialog === 'danger'}
          title="Block this user?"
          consequence="They are signed out at once and cannot sign in again."
          confirmLabel="Block user"
          tone="danger"
          onConfirm={() => setDialog(null)}
          onCancel={() => setDialog(null)}
        />
        <Dialog
          open={dialog === 'form'}
          onClose={() => setDialog(null)}
          title="Set a rate"
          description="The rate applies from the date you choose."
          size="form"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button onClick={() => setDialog(null)}>Save rate</Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField label="Rate per seat (₹)" value={fee} onValueChange={setFee} />
            <TextField label="From" placeholder="DD-MM-YYYY" />
          </div>
        </Dialog>
        <SideSheet
          open={dialog === 'sheet'}
          onClose={() => setDialog(null)}
          title="Green Valley School"
          status={<StatusChip tone="success" label="Active" />}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Close
              </Button>
              <Button onClick={() => setDialog(null)}>Edit</Button>
            </>
          }
        >
          <KeyValueList
            items={[
              { label: 'Society', value: 'Sri Vidya Educational Society' },
              { label: 'Code', value: <Mono>INS-001</Mono> },
              { label: 'Plan', value: 'Plus' },
              { label: 'Seats', value: <span className="tabular">420</span> },
            ]}
          />
          <div className="mt-8">
            <StampBlock
              createdBy={actor('A. Rao')}
              createdAt="2026-09-02T06:10:00.000Z"
              updatedBy={actor('K. Menon')}
              updatedAt="2026-10-23T04:45:00.000Z"
            />
          </div>
        </SideSheet>
      </Section>

      <Section id="g-wizard" title="Stepper and banners">
        <Stepper
          label="Onboarding"
          current={step}
          onStepClick={setStep}
          steps={[
            { key: 'society', label: 'Society' },
            { key: 'institution', label: 'Institution' },
            { key: 'owner', label: 'Owner and plan' },
          ]}
        />
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setStep((n) => Math.max(0, n - 1))}>
            Back
          </Button>
          <Button size="sm" onClick={() => setStep((n) => Math.min(2, n + 1))}>
            Save and continue
          </Button>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <ErrorBanner
            message="This Institution has no rate on the period start. Set a rate first."
            code="NO_RATE_IN_FORCE"
            requestId="req_5d21"
            action={<Button size="sm">Set rate</Button>}
          />
          <ErrorBanner
            tone="warning"
            message="Someone changed this record while you were editing. Reload to see their changes."
            code="VERSION_CONFLICT"
            action={
              <Button size="sm" variant="secondary">
                Reload
              </Button>
            }
          />
        </div>
      </Section>

      <Section id="g-ops" title="Pipeline, audit diff, language and support mode">
        <div className="grid gap-6 lg:grid-cols-2">
          <PipelineCard
            title="Month-end run"
            stages={[
              { key: 'a', label: 'Collect usage', state: 'done' },
              { key: 'b', label: 'Raise dues', state: 'active', detail: '12 of 47 Institutions' },
              { key: 'c', label: 'Send reminders', state: 'pending' },
            ]}
          />
          <AuditDiff
            caption="Changes in this entry"
            changes={[
              { field: 'Plan', before: 'Basic', after: 'Plus' },
              { field: 'Seats', before: '300', after: '420' },
              { field: 'Notes', before: null, after: 'Upgraded after the audit' },
            ]}
          />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <LanguageSelect value={language} onChange={setLanguage} />
        </div>
        <div className="mt-6 overflow-clip rounded-lg border border-line">
          <SupportModeBar
            scope="Green Valley School"
            expiresAt={expiresAt}
            onExit={() => toast.success('Session ended')}
          />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <AccessDenied />
          <RecordNotFound listHref="/institutions" listLabel="Institutions" />
        </div>
      </Section>

      <Section id="g-avatars" title="Avatars">
        <div className="flex items-center gap-3">
          <EntityAvatar name="Asha Rao" size="sm" />
          <EntityAvatar name="K. Menon" />
          <EntityAvatar name="Lakshmi Narayanan" size="lg" />
          <Button variant="secondary" size="sm">
            Secondary
          </Button>
        </div>
      </Section>
    </>
  );
}
