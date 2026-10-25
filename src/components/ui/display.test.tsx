import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumbs } from './breadcrumbs';
import { EntityAvatar, initialsOf } from './entity-avatar';
import { KeyValueList } from './key-value-list';
import { KpiTile } from './kpi-tile';
import { MoneyBreakdown } from './money-breakdown';
import { SeatMeter } from './seat-meter';
import { TableSkeleton } from './skeleton';
import { StampBlock } from './stamp-block';
import { TabPanel, Tabs } from './tabs';
import { Timeline } from './timeline';

const actor = (name: string) => ({ id: 'u1', displayName: name, roleName: 'Super Admin' });

describe('Breadcrumbs', () => {
  it('links the path and marks the current page', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Societies', href: '/societies' },
          { label: 'Sri Vidya Educational Society', href: '/societies' },
          { label: 'Green Valley School' },
        ]}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getAllByRole('link')).toHaveLength(2);
    expect(within(nav).getByText('Green Valley School')).toHaveAttribute('aria-current', 'page');
  });
});

describe('EntityAvatar', () => {
  it('takes initials from the first and last word', () => {
    expect(initialsOf('Asha Rao')).toBe('AR');
    expect(initialsOf('K. Menon Nair')).toBe('KN');
    expect(initialsOf('Kavya')).toBe('K');
    expect(initialsOf('  ')).toBe('?');
  });

  it('is named when alone and hidden when the name sits beside it', () => {
    const { rerender } = render(<EntityAvatar name="Asha Rao" />);
    expect(screen.getByRole('img', { name: 'Asha Rao' })).toBeInTheDocument();
    rerender(<EntityAvatar name="Asha Rao" decorative />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('keeps one colour per person', () => {
    const { container, rerender } = render(<EntityAvatar name="Asha Rao" />);
    const first = container.firstElementChild!.className;
    rerender(<EntityAvatar name="Asha Rao" />);
    expect(container.firstElementChild!.className).toBe(first);
  });
});

describe('KpiTile', () => {
  it('shows label, value and caption, with the exact amount behind a compact one', () => {
    render(<KpiTile label="Dues open" value="₹12.4 L" exact="₹12,40,000.00" caption="4 Societies" />);
    expect(screen.getByText('Dues open')).toBeInTheDocument();
    expect(screen.getByText('₹12.4 L')).toHaveAttribute('title', '₹12,40,000.00');
    expect(screen.getByLabelText('₹12.4 L, ₹12,40,000.00')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('is a link when it opens a filtered list', () => {
    render(<KpiTile label="Societies" value="12" href="/societies" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/societies');
  });
});

describe('KeyValueList', () => {
  it('pairs each label with its value', () => {
    render(
      <KeyValueList
        items={[
          { label: 'Code', value: 'GVS-001' },
          { label: 'Plan', value: 'Plus' },
        ]}
      />,
    );
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual(['Code', 'Plan']);
    expect(screen.getAllByRole('definition').map((t) => t.textContent)).toEqual(['GVS-001', 'Plus']);
  });
});

describe('StampBlock', () => {
  it('shows who added and updated, in IST, and System for background jobs', () => {
    render(
      <StampBlock
        createdBy={actor('A. Rao')}
        createdAt="2026-09-02T06:10:00.000Z"
        updatedBy={{ id: null, displayName: 'x', roleName: null }}
        updatedAt="2026-10-23T04:45:00.000Z"
      />,
    );
    expect(screen.getByText(/Added by A\. Rao/)).toHaveTextContent('Added by A. Rao · 02-09-2026 11:40');
    expect(screen.getByText(/Updated by System/)).toHaveTextContent('Updated by System · 23-10-2026 10:15');
  });
});

describe('Tabs', () => {
  const items = [
    { value: 'owners', label: 'Owners', count: '2/3' },
    { value: 'institutions', label: 'Institutions' },
    { value: 'billing', label: 'Billing' },
  ];

  function Harness() {
    const [value, setValue] = useState('owners');
    return (
      <>
        <Tabs idPrefix="soc" label="Society" items={items} value={value} onChange={setValue} />
        {items.map((i) => (
          <TabPanel key={i.value} idPrefix="soc" value={i.value} active={i.value === value}>
            {i.label} panel
          </TabPanel>
        ))}
      </>
    );
  }

  it('selects with the arrow keys, Home and End, wrapping around', async () => {
    render(<Harness />);
    const tab = (name: RegExp) => screen.getByRole('tab', { name });
    tab(/Owners/).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab(/Institutions/)).toHaveAttribute('aria-selected', 'true');
    expect(tab(/Institutions/)).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(tab(/Billing/)).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab(/Owners/)).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(tab(/Billing/)).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(tab(/Owners/)).toHaveFocus();
  });

  it('puts only the selected tab in the tab order and links it to its panel', async () => {
    render(<Harness />);
    expect(screen.getByRole('tab', { name: /Owners/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Billing/ })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Owners/);
    expect(screen.getByRole('tab', { name: /Owners/ })).toHaveTextContent('2/3');
    await userEvent.click(screen.getByRole('tab', { name: 'Billing' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Billing panel');
  });
});

describe('Timeline', () => {
  it('lists action, actor and time for each entry', () => {
    render(
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
          { id: '2', action: 'Reminder sent', actor: null, at: '2026-10-20T04:30:00.000Z' },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Due history' });
    const items = within(list).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Marked paid');
    expect(items[0]).toHaveTextContent('K. Menon · 23-10-2026 10:15');
    expect(items[1]).toHaveTextContent('System · 20-10-2026 10:00');
  });
});

describe('MoneyBreakdown', () => {
  it('formats every amount in rupees with Indian grouping and shows the total last', () => {
    render(
      <MoneyBreakdown
        label="Due breakdown"
        rows={[
          { label: 'Seats (420 × ₹300)', amount: '126000' },
          { label: 'Early payment discount', amount: '-1260.00', note: '1%' },
        ]}
        total={{ label: 'Total due', amount: '124740' }}
      />,
    );
    const list = screen.getByLabelText('Due breakdown');
    expect(list).toHaveTextContent('₹1,26,000.00');
    expect(list).toHaveTextContent('-₹1,260.00');
    expect(list).toHaveTextContent('Total due₹1,24,740.00');
  });
});

describe('SeatMeter', () => {
  it('draws max slots and writes the count out', () => {
    render(<SeatMeter noun="Owners" max={3} seats={[{ id: '1', name: 'Asha Rao' }]} />);
    expect(screen.getByText('1 of 3 Owners')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Asha Rao' })).toBeInTheDocument();
  });

  it('turns empty slots into buttons only when adding is allowed', async () => {
    const onAdd = vi.fn();
    const { rerender } = render(<SeatMeter noun="Owners" max={3} seats={[]} />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<SeatMeter noun="Owners" max={3} seats={[]} onAdd={onAdd} addLabel="Add an Owner" />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Add an Owner' })[0]!);
    expect(onAdd).toHaveBeenCalled();
  });

  it('shows no empty slots when full', () => {
    render(
      <SeatMeter
        noun="Super Admins"
        max={2}
        seats={[
          { id: '1', name: 'A B' },
          { id: '2', name: 'C D' },
        ]}
        onAdd={() => {}}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('2 of 2 Super Admins')).toBeInTheDocument();
  });
});

describe('TableSkeleton', () => {
  it('announces loading once and hides the bars', () => {
    render(<TableSkeleton columns={4} rows={3} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent('Loading');
  });
});
