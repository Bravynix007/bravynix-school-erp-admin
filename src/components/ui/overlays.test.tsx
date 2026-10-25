import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './confirm-dialog';
import { Dialog } from './dialog';
import { SideSheet } from './side-sheet';
import { StatusChip } from './status-chip';
import { ToastProvider, TOAST_MS, useToast } from './toast';

describe('Dialog', () => {
  it('draws nothing while closed, and a named, described dialog while open', () => {
    const { rerender } = render(
      <Dialog
        open={false}
        onClose={() => {}}
        title="Pause Institution"
        description="Staff lose access today."
      >
        body
      </Dialog>,
    );
    expect(screen.queryByText('body')).toBeNull();
    rerender(
      <Dialog open onClose={() => {}} title="Pause Institution" description="Staff lose access today.">
        body
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Pause Institution' });
    expect(dialog).toHaveAccessibleDescription('Staff lose access today.');
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('asks its owner to close on Esc, and stays open until the owner agrees', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Edit">
        x
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute('open');
  });

  it('does not close on a click on its backdrop (it asks a question)', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Edit">
        x
      </Dialog>,
    );
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('is 480 px to confirm and 640 px for a form, and a bottom sheet on a phone', () => {
    const { rerender } = render(
      <Dialog open onClose={() => {}} title="A">
        x
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('md:max-w-[480px]', 'max-md:bottom-0', 'rounded-xl');
    rerender(
      <Dialog open onClose={() => {}} title="A" size="form">
        x
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('md:max-w-[640px]');
  });

  it('locks the page scroll while open and gives it back', () => {
    const { rerender } = render(
      <Dialog open onClose={() => {}} title="A">
        x
      </Dialog>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <Dialog open={false} onClose={() => {}} title="A">
        x
      </Dialog>,
    );
    expect(document.body.style.overflow).toBe('');
  });
});

describe('ConfirmDialog', () => {
  const props = {
    title: 'Block this user?',
    consequence: 'They are signed out at once.',
    confirmLabel: 'Block user',
  };

  it('puts Cancel first and the action last, and reports each', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open {...props} onConfirm={onConfirm} onCancel={onCancel} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Cancel', 'Block user']);
    await userEvent.click(buttons[1]!);
    expect(onConfirm).toHaveBeenCalled();
    await userEvent.click(buttons[0]!);
    expect(onCancel).toHaveBeenCalled();
  });

  it('starts focus on Cancel for a danger action, so Enter cannot do harm', () => {
    render(<ConfirmDialog open {...props} tone="danger" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Block user' })).toHaveClass('bg-danger');
  });

  it('cannot be dismissed with Esc, or confirmed twice, while it works', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open {...props} loading onConfirm={onConfirm} onCancel={onCancel} />);
    screen.getByRole('dialog').dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(onCancel).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Block user' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('SideSheet', () => {
  it('announces its title, shows status and a Close button, and keeps footer actions', async () => {
    const onClose = vi.fn();
    render(
      <SideSheet
        open
        onClose={onClose}
        title="Green Valley School"
        status={<StatusChip tone="success" label="Active" />}
        footer={<button>Save</button>}
      >
        details
      </SideSheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Green Valley School' })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on a click on the dimmed area but not on its content', () => {
    const onClose = vi.fn();
    render(
      <SideSheet open onClose={onClose} title="T">
        <p>inside</p>
      </SideSheet>,
    );
    fireEvent.click(screen.getByText('inside'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is 560 px wide, 480 px on a tablet and full width on a phone', () => {
    render(
      <SideSheet open onClose={() => {}} title="T">
        x
      </SideSheet>,
    );
    expect(screen.getByRole('dialog')).toHaveClass('w-[560px]', 'max-xl:w-[480px]', 'max-md:w-full');
  });
});

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function Trigger({ kind }: { kind: 'success' | 'error' }) {
    const toast = useToast();
    return (
      <button
        onClick={() =>
          toast[kind](kind === 'success' ? 'Due raised' : 'Could not save', {
            action: { label: 'View', href: '/dues' },
          })
        }
      >
        go
      </button>
    );
  }

  const setup = (kind: 'success' | 'error') =>
    render(
      <ToastProvider>
        <Trigger kind={kind} />
      </ToastProvider>,
    );

  it('keeps a polite and an assertive region mounted from the start', () => {
    setup('success');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('puts a success in the polite region with a link to the result, and removes it after 5 s', () => {
    setup('success');
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByRole('status')).toHaveTextContent('Due raised');
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/dues');
    act(() => {
      vi.advanceTimersByTime(TOAST_MS - 100);
    });
    expect(screen.getByText('Due raised')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText('Due raised')).toBeNull();
  });

  it('puts an error in the assertive region and keeps it until it is dismissed', () => {
    setup('error');
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('Could not save')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Could not save')).toBeNull();
  });

  it('stops the clock while the pointer or focus is on it (WCAG 2.2.1)', () => {
    setup('success');
    fireEvent.click(screen.getByText('go'));
    const toast = screen.getByText('Due raised').parentElement!;
    fireEvent.mouseEnter(toast);
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(screen.getByText('Due raised')).toBeInTheDocument();
    fireEvent.mouseLeave(toast);
    act(() => {
      vi.advanceTimersByTime(TOAST_MS + 100);
    });
    expect(screen.queryByText('Due raised')).toBeNull();
  });

  it('shows at most three at a time, newest last', () => {
    function Many() {
      const toast = useToast();
      return <button onClick={() => ['a', 'b', 'c', 'd'].forEach((m) => toast.success(m))}>go</button>;
    }
    render(
      <ToastProvider>
        <Many />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('go'));
    expect(screen.queryByText('a')).toBeNull();
    expect(screen.getByText('d')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(3);
  });

  it('runs a callback action such as Undo', () => {
    const undo = vi.fn();
    function T() {
      const toast = useToast();
      return (
        <button onClick={() => toast.success('Removed', { action: { label: 'Undo', onClick: undo } })}>
          go
        </button>
      );
    }
    render(
      <ToastProvider>
        <T />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('go'));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalled();
  });

  it('needs its provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger kind="success" />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});

describe('Dialog reopened', () => {
  it('shows fresh content each time it opens', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>open</button>
          <Dialog open={open} onClose={() => setOpen(false)} title="T">
            <input aria-label="field" defaultValue="" />
          </Dialog>
        </>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByText('open'));
    fireEvent.change(screen.getByLabelText('field'), { target: { value: 'typed' } });
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByLabelText('field')).toHaveValue('');
  });
});
