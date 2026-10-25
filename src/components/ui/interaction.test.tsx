import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from './checkbox';
import { DataTable, type Column } from './data-table';
import { FilterBar } from './filter-bar';
import { LoadMore } from './pagination';
import { Select } from './select';
import { Switch } from './switch';
import { Tabs } from './tabs';
import { TextField } from './text-field';
import { readShortcutsEnabled, setShortcutsEnabled, useShortcutsEnabled } from '@/lib/shortcuts';

afterEach(() => {
  window.localStorage.clear();
  document.body.innerHTML = '';
});

function Bar({ extra }: { extra?: boolean }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  return (
    <>
      <FilterBar
        searchLabel="Search Institutions"
        search={search}
        onSearchChange={setSearch}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [{ value: 'active', label: 'Active' }],
            value: status,
            onChange: setStatus,
          },
        ]}
        countLabel="3 Institutions"
      />
      {extra ? (
        <FilterBar
          searchLabel="Search Societies"
          search=""
          onSearchChange={() => {}}
          filters={[]}
          countLabel="1 Society"
        />
      ) : null}
    </>
  );
}

describe('single-key shortcuts (WCAG 2.1.4)', () => {
  it('are on by default and can be switched off, per person', async () => {
    expect(readShortcutsEnabled()).toBe(true);
    render(<Bar />);
    await userEvent.keyboard('/');
    expect(screen.getByRole('searchbox')).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    setShortcutsEnabled(false);
    expect(readShortcutsEnabled()).toBe(false);
    await userEvent.keyboard('/');
    expect(screen.getByRole('searchbox')).not.toHaveFocus();
    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Search Institutions');
  });

  it('still offer Ctrl+K, which has a modifier and so is not a single-key shortcut', async () => {
    setShortcutsEnabled(false);
    render(<Bar />);
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('stay out of a modal dialog', async () => {
    render(
      <>
        <Bar />
        <dialog open>
          <button>Inside</button>
        </dialog>
      </>,
    );
    screen.getByRole('button', { name: 'Inside' }).focus();
    await userEvent.keyboard('/');
    expect(screen.getByRole('searchbox')).not.toHaveFocus();
  });

  it('answer once on a page with two search boxes: the first', async () => {
    render(<Bar extra />);
    await userEvent.keyboard('/');
    expect(screen.getByRole('searchbox', { name: 'Search Institutions' })).toHaveFocus();
  });

  it('the switch in the top bar turns them off and on', async () => {
    function Harness() {
      const on = useShortcutsEnabled();
      return <Switch label="Single-key shortcuts" checked={on} onChange={setShortcutsEnabled} />;
    }
    render(<Harness />);
    const toggle = screen.getByRole('switch', { name: 'Single-key shortcuts' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(window.localStorage.getItem('console.singleKeyShortcuts')).toBe('off');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});

describe('focus when a control goes away (WCAG 2.4.3)', () => {
  it('Clear hands focus to the search box', async () => {
    render(<Bar />);
    await userEvent.type(screen.getByRole('searchbox'), 'x');
    const clear = screen.getByRole('button', { name: 'Clear' });
    clear.focus();
    await userEvent.click(clear);
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('removing the last chip hands focus to the search box', async () => {
    render(<Bar />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'active');
    await userEvent.click(screen.getByRole('button', { name: 'Remove filter Status: Active' }));
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('the filter select is named once, whatever is chosen', async () => {
    render(<Bar />);
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'active');
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
  });
});

interface Row {
  id: string;
  code: string;
}
const columns: Column<Row>[] = [
  { key: 'code', header: 'Code', primary: true, cell: (r) => r.code },
  {
    key: 'tick',
    header: 'Pick',
    cell: (r) => <Checkbox label={`Pick ${r.code}`} />,
  },
];

describe('DataTable row click guard', () => {
  const rows: Row[] = [{ id: '1', code: 'INS-001' }];

  it('does not open the row when a checkbox label in another cell is clicked', async () => {
    const onRowOpen = vi.fn();
    render(
      <DataTable caption="Rows" columns={columns} rows={rows} getRowId={(r) => r.id} onRowOpen={onRowOpen} />,
    );
    await userEvent.click(screen.getByText('Pick INS-001'));
    expect(onRowOpen).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('does not open the row while text is selected (copying a code)', async () => {
    const onRowOpen = vi.fn();
    render(
      <DataTable caption="Rows" columns={columns} rows={rows} getRowId={(r) => r.id} onRowOpen={onRowOpen} />,
    );
    const range = document.createRange();
    range.selectNodeContents(screen.getByText('INS-001'));
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    // userEvent.click would clear the selection on mouse down, so fire the click on its own.
    fireEvent.click(screen.getAllByRole('cell')[1]!);
    expect(onRowOpen).not.toHaveBeenCalled();
    window.getSelection()!.removeAllRanges();
  });

  it('keeps explicit table roles, so a stacked layout keeps its semantics', () => {
    render(<DataTable caption="Rows" columns={columns} rows={rows} getRowId={(r) => r.id} />);
    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('role', 'table');
    expect(table.querySelector('thead')).toHaveAttribute('role', 'rowgroup');
    expect(table.querySelector('tbody')).toHaveAttribute('role', 'rowgroup');
    expect(table.querySelector('tbody tr')).toHaveAttribute('role', 'row');
    expect(table.querySelector('tbody td')).toHaveAttribute('role', 'cell');
    expect(table.querySelector('th')).toHaveAttribute('role', 'columnheader');
  });

  it('hides the small-screen header label from assistive technology', () => {
    render(<DataTable caption="Rows" columns={columns} rows={rows} getRowId={(r) => r.id} />);
    const label = screen.getByRole('table').querySelector('tbody td span[aria-hidden="true"]');
    expect(label).toHaveTextContent('Code');
  });

  it('shows secondary text at a readable contrast on the selected row', () => {
    render(<DataTable caption="Rows" columns={columns} rows={rows} getRowId={(r) => r.id} selectedId="1" />);
    expect(screen.getByRole('table').querySelector('tbody tr')?.className).toContain(
      '[&_.text-ink-tertiary]:text-ink-secondary',
    );
  });
});

describe('Checkbox hint', () => {
  it('is described once, not part of the name', () => {
    render(<Checkbox label="Send the invoice" hint="Goes to the Society Owner" />);
    const box = screen.getByRole('checkbox');
    expect(box).toHaveAccessibleName('Send the invoice');
    expect(box).toHaveAccessibleDescription('Goes to the Society Owner');
  });
});

describe('field attributes', () => {
  it('marks a required field for assistive technology as well as in words', () => {
    render(
      <>
        <TextField label="Name" requiredMark />
        <Select label="Plan" requiredMark options={[{ value: 'a', label: 'A' }]} />
      </>,
    );
    expect(screen.getByLabelText(/^Name/)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/^Plan/)).toHaveAttribute('aria-required', 'true');
  });

  it('keeps a caller aria-describedby next to the hint and error link', () => {
    render(<TextField label="Email" hint="Work address" aria-describedby="extra" />);
    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-describedby')).toMatch(/-hint extra$/);
  });
});

describe('Tabs', () => {
  const items = [
    { value: 'a', label: 'Owners', count: '2/3', countLabel: '2 of 3' },
    { value: 'b', label: 'Billing' },
  ];

  it('speaks the count in words', () => {
    render(<Tabs idPrefix="t" label="x" items={items} value="a" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Owners 2 of 3' })).toBeInTheDocument();
  });

  it('leaves the first tab reachable when the value matches none', () => {
    render(<Tabs idPrefix="t" label="x" items={items} value="missing" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /Owners/ })).toHaveAttribute('tabindex', '0');
  });
});

describe('LoadMore focus', () => {
  it('moves focus to the end line when the last page arrives under the focused button', async () => {
    function Harness() {
      const [shown, setShown] = useState(10);
      return <LoadMore shown={shown} noun="entries" hasMore={shown < 20} onLoadMore={() => setShown(20)} />;
    }
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Load more' });
    button.focus();
    await userEvent.click(button);
    expect(screen.getByText('That is all of them')).toHaveFocus();
  });

  it('leaves focus alone when the button was not the focused control', () => {
    const { rerender } = render(<LoadMore shown={10} noun="entries" hasMore onLoadMore={() => {}} />);
    rerender(<LoadMore shown={20} noun="entries" hasMore={false} onLoadMore={() => {}} />);
    expect(screen.getByText('That is all of them')).not.toHaveFocus();
  });
});

describe('Switch labels', () => {
  it('shows a short label on a narrow screen while the name stays the full one', () => {
    render(<Switch label="Single-key shortcuts" shortLabel="Shortcuts" checked onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: /Single-key shortcuts/ })).toBeInTheDocument();
    expect(screen.getByText('Shortcuts')).toHaveClass('lg:hidden');
  });
});

describe('Checkbox describedby', () => {
  it('keeps a caller description next to the hint', () => {
    render(<Checkbox label="Send" hint="Hint" aria-describedby="extra" />);
    expect(screen.getByRole('checkbox').getAttribute('aria-describedby')).toMatch(/-hint extra$/);
  });
});
