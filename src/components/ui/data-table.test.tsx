import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type Column } from './data-table';
import { EmptyState } from './empty-state';
import { FilterBar } from './filter-bar';
import { LoadMore, Pagination } from './pagination';

interface Row {
  id: string;
  name: string;
  code: string;
  seats: number;
}

const rows: Row[] = [
  { id: '1', name: 'Green Valley School', code: 'GVS-001', seats: 420 },
  { id: '2', name: 'Lakeview Academy', code: 'LVA-002', seats: 1200 },
];

const columns: Column<Row>[] = [
  { key: 'name', header: 'Institution', primary: true, sortable: true, cell: (r) => r.name },
  { key: 'code', header: 'Code', cell: (r) => r.code },
  { key: 'seats', header: 'Seats', align: 'end', sortable: true, cell: (r) => r.seats },
];

const base = { caption: 'Institutions', columns, rows, getRowId: (r: Row) => r.id };

describe('DataTable', () => {
  it('is a named table with column headers and the rows', () => {
    render(<DataTable {...base} />);
    const table = screen.getByRole('table', { name: 'Institutions' });
    // jsdom has no media queries, so a sortable header holds both its button and its narrow-screen text.
    const headers = within(table).getAllByRole('columnheader');
    expect(headers).toHaveLength(3);
    expect(headers[1]).toHaveTextContent(/^Code$/);
    expect(headers[0]).toHaveTextContent(/^Institution/);
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('right-aligns numbers with tabular figures', () => {
    render(<DataTable {...base} />);
    expect(screen.getByText('420').closest('td')).toHaveClass('text-right', 'tabular');
  });

  it('reports aria-sort and asks for a new sort from the header button', async () => {
    const onSort = vi.fn();
    render(<DataTable {...base} sort={{ key: 'seats', direction: 'desc' }} onSort={onSort} />);
    expect(screen.getByRole('columnheader', { name: /Seats/ })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', { name: /Institution/ })).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('columnheader', { name: 'Code' })).not.toHaveAttribute('aria-sort');
    await userEvent.click(screen.getByRole('button', { name: /Institution/ }));
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('opens a row from its button, from the keyboard, and from a click anywhere on the row', async () => {
    const onRowOpen = vi.fn();
    render(<DataTable {...base} onRowOpen={onRowOpen} />);
    const button = screen.getByRole('button', { name: /Green Valley School/ });
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowOpen).toHaveBeenCalledTimes(1);
    await userEvent.click(button);
    expect(onRowOpen).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByText('LVA-002'));
    await waitFor(() => expect(onRowOpen).toHaveBeenCalledTimes(3));
    expect(onRowOpen).toHaveBeenLastCalledWith(rows[1]);
  });

  it('does not open the row when a link or button inside another cell is used', async () => {
    const onRowOpen = vi.fn();
    const onMenu = vi.fn();
    render(
      <DataTable
        {...base}
        onRowOpen={onRowOpen}
        columns={[
          ...columns,
          { key: 'menu', header: 'Actions', cell: () => <button onClick={onMenu}>Menu</button> },
        ]}
      />,
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'Menu' })[0]!);
    expect(onMenu).toHaveBeenCalled();
    expect(onRowOpen).not.toHaveBeenCalled();
  });

  it('marks the selected row', () => {
    render(<DataTable {...base} selectedId="2" />);
    const selected = screen.getAllByRole('row').filter((r) => r.getAttribute('aria-current') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Lakeview Academy');
    expect(selected[0]).toHaveClass('bg-primary-tint');
  });

  it('shows skeleton bars on the first load', () => {
    render(<DataTable {...base} loading />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('keeps the old rows, dimmed and announced, while refreshing', () => {
    render(<DataTable {...base} refreshing />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('table')).toHaveClass('opacity-60');
    expect(screen.getByText('Refreshing the list')).toBeInTheDocument();
    expect(screen.getByText('Green Valley School')).toBeInTheDocument();
  });

  it('shows the empty state instead of an empty table', () => {
    render(
      <DataTable
        {...base}
        rows={[]}
        empty={<EmptyState title="No Institutions yet" description="Add one." />}
      />,
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('No Institutions yet')).toBeInTheDocument();
  });

  it('stacks rows as labelled cards on a small screen without losing the labels', () => {
    render(<DataTable {...base} />);
    expect(screen.getByRole('table').querySelector('thead')).toHaveClass('max-md:sr-only');
    const row = screen.getAllByRole('row')[1]!;
    expect(row).toHaveClass('max-md:flex', 'max-md:flex-col');
    expect(within(row).getByText('Code', { selector: 'span' })).toHaveClass('max-md:inline');
  });

  it('renders the footer inside the card', () => {
    render(<DataTable {...base} footer={<p>Footer here</p>} />);
    expect(screen.getByText('Footer here')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('shows the range, the page, and disables the ends', async () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination page={1} pageSize={20} total={142} noun="Institutions" onPageChange={onPageChange} />,
    );
    expect(screen.getByText('Showing 1–20 of 142 Institutions')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 8')).toBeInTheDocument();
    // Soft-disabled: still focusable, so focus is not thrown to the page when the end is reached.
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    rerender(
      <Pagination page={8} pageSize={20} total={142} noun="Institutions" onPageChange={onPageChange} />,
    );
    expect(screen.getByText('Showing 141–142 of 142 Institutions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('handles an empty list', () => {
    render(<Pagination page={1} pageSize={20} total={0} noun="Institutions" onPageChange={() => {}} />);
    expect(screen.getByText('Showing 0–0 of 0 Institutions')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
});

describe('LoadMore', () => {
  it('loads more while there is more, then says that is all', async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(<LoadMore shown={40} noun="entries" hasMore onLoadMore={onLoadMore} />);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalled();
    rerender(<LoadMore shown={52} noun="entries" hasMore={false} onLoadMore={onLoadMore} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('That is all of them')).toBeInTheDocument();
  });

  it('shows the busy state without allowing a second click, and keeps focus', async () => {
    const onLoadMore = vi.fn();
    render(<LoadMore shown={40} noun="entries" hasMore loading onLoadMore={onLoadMore} />);
    const button = screen.getByRole('button', { name: 'Load more' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    button.focus();
    await userEvent.click(button);
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
  });
});

describe('FilterBar', () => {
  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
  ];

  function Harness() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    return (
      <FilterBar
        searchLabel="Search Institutions"
        search={search}
        onSearchChange={setSearch}
        filters={[{ key: 'status', label: 'Status', options: statuses, value: status, onChange: setStatus }]}
        countLabel={status ? '3 Institutions' : '142 Institutions'}
      />
    );
  }

  it('focuses the search box when "/" is pressed outside a field', async () => {
    render(<Harness />);
    await userEvent.keyboard('/');
    expect(screen.getByRole('searchbox', { name: 'Search Institutions' })).toHaveFocus();
  });

  it('types a slash into a field instead of jumping', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('searchbox'));
    await userEvent.keyboard('a/b');
    expect(screen.getByRole('searchbox')).toHaveValue('a/b');
    await userEvent.tab();
    await userEvent.keyboard('/');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveFocus();
  });

  it('shows an applied filter as a removable chip, with Clear and a live count', async () => {
    render(<Harness />);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('142 Institutions');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'paused');
    const applied = screen.getByRole('list', { name: 'Applied filters' });
    expect(applied).toHaveTextContent('Status: Paused');
    expect(screen.getByRole('status')).toHaveTextContent('3 Institutions');
    await userEvent.click(screen.getByRole('button', { name: 'Remove filter Status: Paused' }));
    expect(screen.queryByRole('list', { name: 'Applied filters' })).toBeNull();
  });

  it('Clear resets the search and every filter', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole('searchbox'), 'green');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'active');
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveDisplayValue('Status');
  });
});

describe('DataTable below md', () => {
  it('offers a visible Sort by control that sorts like the header buttons', async () => {
    const onSort = vi.fn();
    render(<DataTable {...base} onSort={onSort} sort={{ key: 'seats', direction: 'asc' }} />);
    const select = screen.getByLabelText('Sort by');
    expect(select).toHaveValue('seats');
    await userEvent.selectOptions(select, 'name');
    expect(onSort).toHaveBeenLastCalledWith('name');
    await userEvent.click(screen.getByRole('button', { name: 'Sorted ascending. Switch to descending' }));
    expect(onSort).toHaveBeenLastCalledWith('seats');
  });

  it('shows the default order until a column is chosen, and no control when nothing sorts', () => {
    const { rerender } = render(<DataTable {...base} onSort={vi.fn()} />);
    expect(screen.getByLabelText('Sort by')).toHaveValue('');
    expect(screen.queryByRole('button', { name: /^Sorted / })).not.toBeInTheDocument();
    rerender(
      <DataTable {...base} columns={columns.map((c) => ({ ...c, sortable: false }))} onSort={vi.fn()} />,
    );
    expect(screen.queryByLabelText('Sort by')).not.toBeInTheDocument();
  });

  it('hides the header sort buttons from narrow screens, where the header is invisible', () => {
    render(<DataTable {...base} onSort={vi.fn()} />);
    for (const button of within(screen.getAllByRole('rowgroup')[0]!).getAllByRole('button')) {
      expect(button).toHaveClass('max-md:hidden');
    }
  });
});

describe('DataTable row click timing', () => {
  it('does not open the row when a word is double-clicked to select it', async () => {
    vi.useFakeTimers();
    try {
      const onRowOpen = vi.fn();
      render(<DataTable {...base} onRowOpen={onRowOpen} />);
      const cell = screen.getByText('LVA-002');
      fireEvent.click(cell, { detail: 1 });
      fireEvent.click(cell, { detail: 2 });
      await vi.advanceTimersByTimeAsync(1000);
      expect(onRowOpen).not.toHaveBeenCalled();
      fireEvent.click(cell, { detail: 1 });
      await vi.advanceTimersByTimeAsync(1000);
      expect(onRowOpen).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops a pending open when the table goes away', async () => {
    vi.useFakeTimers();
    try {
      const onRowOpen = vi.fn();
      const { unmount } = render(<DataTable {...base} onRowOpen={onRowOpen} />);
      fireEvent.click(screen.getByText('LVA-002'), { detail: 1 });
      unmount();
      await vi.advanceTimersByTimeAsync(1000);
      expect(onRowOpen).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
