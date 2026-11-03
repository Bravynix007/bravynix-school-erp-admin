import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { categories, classes, entry } from '@/test/masters';
import { renderScreen } from '@/test/render';
import { MastersPage } from './masters-page';

const api = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock('./masters-api', () => ({ mastersApi: api }));

const lists = (data: Partial<Record<string, ReturnType<typeof categories>>>) =>
  api.list.mockImplementation((type: string) => Promise.resolve(data[type] ?? []));

beforeEach(() => {
  api.list.mockReset();
  api.create.mockReset();
  api.update.mockReset();
  window.history.replaceState(null, '', '/masters/');
});

const open = async (tab: string) => {
  window.history.replaceState(null, '', `/masters/?tab=${tab}`);
  const view = renderScreen(<MastersPage />);
  return view;
};

describe('MastersPage', () => {
  it('states that entries are hidden, never deleted, and opens on the class categories', async () => {
    lists({ 'class-categories': categories() });
    await open('class-categories');
    expect(screen.getByText(/Entries in use are hidden, never deleted/)).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Class categories' })).toBeInTheDocument();
    expect(screen.getByText('2 class categories')).toBeInTheDocument();
  });

  it('lists predefined classes under their category, with hidden ones marked and still listed', async () => {
    lists({ 'class-categories': categories(), 'predefined-classes': classes() });
    await open('predefined-classes');
    const lower = await screen.findByRole('region', { name: 'Lower Primary classes' });
    expect(within(lower).getAllByRole('row')).toHaveLength(3);
    expect(within(lower).getByText('1st')).toBeInTheDocument();
    const high = screen.getByRole('region', { name: 'High School classes' });
    expect(within(high).getByText('9th')).toBeInTheDocument();
    expect(within(high).getByText('Hidden')).toBeInTheDocument();
    expect(within(high).getByRole('button', { name: 'Show 9th' })).toBeInTheDocument();
    expect(screen.getByText('1 class (1 hidden)')).toBeInTheDocument();
  });

  it('says when one category has no classes, and when there are none at all', async () => {
    lists({ 'class-categories': categories(), 'predefined-classes': classes().slice(0, 1) });
    const view = await open('predefined-classes');
    expect(await screen.findAllByText('No classes in this category yet.')).toHaveLength(1);
    view.unmount();

    lists({ 'class-categories': categories(), 'predefined-classes': [] });
    await open('predefined-classes');
    expect(await screen.findByText('No predefined classes yet')).toBeInTheDocument();
  });

  it('moves an entry to the place of its neighbour', async () => {
    const user = userEvent.setup();
    lists({
      designations: [
        entry({ id: 'a', name: 'Principal' }),
        entry({ id: 'b', name: 'Teacher', displayOrder: 2, version: 5 }),
      ],
    });
    api.update.mockResolvedValue(entry());
    await open('designations');
    expect(await screen.findByRole('button', { name: 'Move Principal up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Teacher down' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move Teacher up' }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith('designations', 'b', { version: 5, displayOrder: 1 }),
    );
    expect(await screen.findByText('Teacher moved up')).toBeInTheDocument();
  });

  it('moves a class only within its category', async () => {
    const user = userEvent.setup();
    lists({ 'class-categories': categories(), 'predefined-classes': classes() });
    api.update.mockResolvedValue(entry());
    await open('predefined-classes');
    // 2nd is last of Lower Primary: down is not possible even though 9th follows it in another category.
    expect(await screen.findByRole('button', { name: 'Move 2nd down' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move 2nd up' }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith('predefined-classes', 'k2', { version: 1, displayOrder: 1 }),
    );
  });

  it('asks before hiding, then hides with the version read', async () => {
    const user = userEvent.setup();
    lists({ designations: [entry({ version: 3 })] });
    api.update.mockResolvedValue(entry({ status: 0 }));
    await open('designations');
    await user.click(await screen.findByRole('button', { name: 'Hide Principal' }));
    expect(api.update).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog', { name: 'Hide Principal?' });
    expect(within(dialog).getByText(/Institutions that already use it keep it/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Hide' }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith('designations', 'e1', { version: 3, status: 0 }),
    );
    expect(await screen.findByText('Principal hidden')).toBeInTheDocument();
  });

  it('shows a hidden entry again at once', async () => {
    const user = userEvent.setup();
    lists({ designations: [entry({ status: 0, version: 2 })] });
    api.update.mockResolvedValue(entry());
    await open('designations');
    await user.click(await screen.findByRole('button', { name: 'Show Principal' }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith('designations', 'e1', { version: 2, status: 1 }),
    );
  });

  it('adds an entry after checking the code, and sends it without a position', async () => {
    const user = userEvent.setup();
    lists({ designations: [entry()] });
    api.create.mockResolvedValue(entry({ id: 'n', name: 'Librarian' }));
    await open('designations');
    await user.click(await screen.findByRole('button', { name: 'Add designation' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add designation' });
    await user.click(within(dialog).getByRole('button', { name: 'Add designation' }));
    expect(within(dialog).getByText('Enter a code.')).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
    await user.type(within(dialog).getByLabelText(/Code/), 'librarian');
    await user.type(within(dialog).getByLabelText(/Name/), 'Librarian');
    await user.click(within(dialog).getByRole('button', { name: 'Add designation' }));
    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith('designations', { code: 'LIBRARIAN', name: 'Librarian' }),
    );
    expect(await screen.findByText('Librarian added')).toBeInTheDocument();
  });

  it('shows the API’s refusal of a duplicate inside the dialog, on its field', async () => {
    const user = userEvent.setup();
    lists({ designations: [entry()] });
    api.create.mockRejectedValue(
      new ApiError(409, 'DUPLICATE', 'Duplicate', 'req-9', [
        { field: 'code', code: 'DUPLICATE', message: 'This code is taken' },
      ]),
    );
    await open('designations');
    await user.click(await screen.findByRole('button', { name: 'Add designation' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add designation' });
    await user.type(within(dialog).getByLabelText(/Code/), 'DES_PRINCIPAL');
    await user.type(within(dialog).getByLabelText(/Name/), 'Head');
    await user.click(within(dialog).getByRole('button', { name: 'Add designation' }));
    expect(await within(dialog).findByText('This code is taken')).toBeInTheDocument();
    expect(within(dialog).getByText('Another entry already uses this code or name.')).toBeInTheDocument();
  });

  it('adds a predefined class into a chosen category, and offers no hidden category', async () => {
    const user = userEvent.setup();
    lists({
      'class-categories': [...categories(), entry({ id: 'c3', name: 'Old', status: 0, displayOrder: 3 })],
      'predefined-classes': [],
    });
    api.create.mockResolvedValue(entry({ id: 'n', name: '3rd' }));
    await open('predefined-classes');
    await user.click(await screen.findByRole('button', { name: 'Add predefined class' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add predefined class' });
    const picker = within(dialog).getByLabelText(/Class category/);
    expect(within(picker).getByRole('option', { name: 'Old (hidden)' })).toBeDisabled();
    expect(picker).toHaveValue('c1');
    await user.selectOptions(picker, 'c2');
    await user.type(within(dialog).getByLabelText(/Code/), 'class_3');
    await user.type(within(dialog).getByLabelText(/Name/), '3rd');
    await user.type(within(dialog).getByLabelText(/Numeric value/), '3');
    await user.click(within(dialog).getByRole('button', { name: 'Add predefined class' }));
    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith('predefined-classes', {
        code: 'CLASS_3',
        name: '3rd',
        classCategoryId: 'c2',
        numericValue: 3,
      }),
    );
  });

  it('edits only the name, shows the fixed code as text, and says when nothing changed', async () => {
    const user = userEvent.setup();
    lists({ designations: [entry({ version: 4 })] });
    api.update.mockResolvedValue(entry());
    await open('designations');
    await user.click(await screen.findByRole('button', { name: 'Edit Principal' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Principal' });
    expect(within(dialog).getByText('DES_PRINCIPAL')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Code/)).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByText('Nothing has changed yet.')).toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();
    await user.clear(within(dialog).getByLabelText(/Name/));
    await user.type(within(dialog).getByLabelText(/Name/), 'Head Teacher');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith('designations', 'e1', { version: 4, name: 'Head Teacher' }),
    );
  });

  it('offers Reload after a version conflict on a move', async () => {
    const user = userEvent.setup();
    lists({ designations: [entry({ id: 'a' }), entry({ id: 'b', name: 'Teacher', displayOrder: 2 })] });
    api.update.mockRejectedValue(new ApiError(409, 'VERSION_CONFLICT', 'conflict', 'req-3', []));
    await open('designations');
    await user.click(await screen.findByRole('button', { name: 'Move Teacher up' }));
    expect(await screen.findByText(/Someone changed this record/)).toBeInTheDocument();
    const calls = api.list.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(calls));
  });

  it('shows the empty state with the add button', async () => {
    lists({ designations: [] });
    await open('designations');
    expect(await screen.findByText('No designations yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add designation' })).toBeInTheDocument();
  });

  it('explains that classes need a category first', async () => {
    lists({ 'class-categories': [], 'predefined-classes': [] });
    await open('predefined-classes');
    expect(await screen.findByText('No class categories yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add predefined class' })).toBeDisabled();
  });

  it('says there is no access for anyone but a Super Admin, and retries other failures', async () => {
    api.list.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'no', 'req-1', []));
    await open('designations');
    expect(await screen.findByText(/don.t have access/i)).toBeInTheDocument();
  });

  it('shows a banner with Try again when the list cannot be read', async () => {
    const user = userEvent.setup();
    api.list.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'boom', 'req-2', []));
    api.list.mockResolvedValue([entry()]);
    await open('designations');
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table', { name: 'Designations' })).toBeInTheDocument();
  });

  it('shows a loading state first', async () => {
    api.list.mockReturnValue(new Promise(() => undefined));
    await open('designations');
    expect(screen.getByRole('status', { name: 'Loading the designations' })).toBeInTheDocument();
  });
});
