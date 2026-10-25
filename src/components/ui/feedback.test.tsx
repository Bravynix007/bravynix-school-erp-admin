import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuditDiff } from './audit-diff';
import { ErrorBanner } from './error-banner';
import { LANGUAGES, LanguageSelect } from './language-select';
import { OfflineBand } from './offline-band';
import { PipelineCard, ProgressBar } from './progress';
import { Stepper } from './stepper';
import { SupportModeBar } from './support-mode-bar';
import { AccessDenied, RecordNotFound } from '../shell/status-panels';

describe('Stepper', () => {
  const steps = [
    { key: 'society', label: 'Society' },
    { key: 'institution', label: 'Institution' },
    { key: 'owner', label: 'Owner and plan' },
  ];

  it('marks the current step, shows a check on done steps and numbers the rest', () => {
    render(<Stepper label="Onboarding" steps={steps} current={1} />);
    const list = screen.getByRole('list', { name: 'Onboarding' });
    const items = within(list).getAllByRole('listitem');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).toHaveTextContent('Step 1, done: Society');
    expect(items[1]).toHaveTextContent('Step 2, current: Institution');
    expect(items[2]).toHaveTextContent('Step 3: Owner and plan');
  });

  it('lets a person go back to a done step only', async () => {
    const onStepClick = vi.fn();
    render(<Stepper label="Onboarding" steps={steps} current={2} onStepClick={onStepClick} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: /Society/ }));
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it('has no buttons when going back is not offered', () => {
    render(<Stepper label="Onboarding" steps={steps} current={2} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ErrorBanner', () => {
  it('announces at once, shows the code tag and the request ID, and offers the action', () => {
    render(
      <ErrorBanner
        message="Someone changed this record while you were editing. Reload to see their changes."
        code="VERSION_CONFLICT"
        requestId="req_81f2"
        tone="warning"
        action={<button>Reload</button>}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Someone changed this record');
    expect(within(alert).getByText('VERSION_CONFLICT')).toHaveClass('font-mono');
    expect(within(alert).getByText('req_81f2')).toHaveClass('font-mono');
    expect(within(alert).getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('works with only a message', () => {
    render(<ErrorBanner message="Something went wrong." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
  });
});

describe('ProgressBar and PipelineCard', () => {
  it('reports its value to assistive technology, clamped to the range', () => {
    render(<ProgressBar label="Import" value={150} max={100} />);
    const bar = screen.getByRole('progressbar', { name: 'Import' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('says every stage in words and counts the finished ones', () => {
    render(
      <PipelineCard
        title="Month-end run"
        stages={[
          { key: 'a', label: 'Collect usage', state: 'done' },
          { key: 'b', label: 'Raise dues', state: 'active', detail: '12 of 47 Institutions' },
          { key: 'c', label: 'Send reminders', state: 'pending' },
          { key: 'd', label: 'Archive', state: 'failed' },
        ]}
      />,
    );
    expect(screen.getByText('1 of 4 done')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Done');
    expect(items[1]).toHaveTextContent('Running');
    expect(items[1]).toHaveTextContent('12 of 47 Institutions');
    expect(items[2]).toHaveTextContent('Waiting');
    expect(items[3]).toHaveTextContent('Failed');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });
});

describe('AuditDiff', () => {
  it('shows field, before and after in columns, with an empty marker for a missing value', () => {
    render(
      <AuditDiff
        caption="Changes in this entry"
        changes={[
          { field: 'Plan', before: 'Basic', after: 'Plus' },
          { field: 'Notes', before: null, after: 'Upgraded' },
        ]}
      />,
    );
    const table = screen.getByRole('table', { name: 'Changes in this entry' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Field', 'Before', 'After']);
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(/Plan.*Basic.*Plus/);
    expect(within(rows[1]!).getByRole('rowheader')).toHaveTextContent('Plan');
    expect(rows[2]).toHaveTextContent('(empty)');
    expect(rows[2]).toHaveTextContent('Upgraded');
  });
});

describe('LanguageSelect', () => {
  it('offers the seven languages in their own scripts, each with its lang', async () => {
    const onChange = vi.fn();
    render(<LanguageSelect value="en" onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: 'Language' });
    expect(within(select).getAllByRole('option')).toHaveLength(7);
    expect(LANGUAGES.map((l) => l.code)).toEqual(['en', 'hi', 'kn', 'ml', 'mr', 'ta', 'te']);
    expect(screen.getByRole('option', { name: 'தமிழ்' })).toHaveAttribute('lang', 'ta');
    await userEvent.selectOptions(select, 'te');
    expect(onChange).toHaveBeenCalledWith('te');
  });
});

describe('SupportModeBar', () => {
  afterEach(() => vi.useRealTimers());

  function setup(secondsLeft: number) {
    vi.useFakeTimers();
    const start = new Date('2026-10-25T10:00:00.000Z').getTime();
    vi.setSystemTime(start);
    const onExit = vi.fn();
    render(
      <SupportModeBar
        scope="Green Valley School"
        expiresAt={new Date(start + secondsLeft * 1000).toISOString()}
        onExit={onExit}
      />,
    );
    return onExit;
  }

  const announced = () => screen.getByRole('status', { name: '' }).textContent;

  it('says it is read only, who is being looked at and how long is left', () => {
    setup(42 * 60 + 10);
    expect(screen.getByText(/Support session · read only · Green Valley School/)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('42:10');
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
    expect(announced()).toBe('');
  });

  it('counts down on screen but speaks only at 5 minutes, 1 minute and the end', () => {
    setup(5 * 60 + 2);
    expect(announced()).toBe('');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('04:59');
    expect(announced()).toBe('Support session ends in under 5 minutes.');
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(announced()).toBe('Support session ends in under 5 minutes.');
    act(() => {
      vi.advanceTimersByTime(180_000);
    });
    expect(announced()).toBe('Support session ends in under 1 minute.');
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    expect(announced()).toBe('Support session has ended.');
  });

  it('ends the session on request, and uses the marigold signal', async () => {
    const onExit = setup(600);
    vi.useRealTimers();
    await userEvent.click(screen.getByRole('button', { name: 'End session' }));
    expect(onExit).toHaveBeenCalled();
    expect(screen.getByText(/Support session/).closest('div')).toHaveClass('bg-support');
  });
});

describe('OfflineBand', () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
  });

  it('is absent online, shows the band offline, and reacts to the browser events', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    render(<OfflineBand />);
    // The live region is there from the start, empty, so the change is announced when it fills.
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent("You're offline. Changes can't be saved.");
    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});

describe('status panels', () => {
  it('403 says so and links to the dashboard', () => {
    render(<AccessDenied />);
    expect(screen.getByRole('heading', { name: "You don't have access to this" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the dashboard' })).toHaveAttribute('href', '/dashboard');
  });

  it('404 says the record is gone and links back to the list', () => {
    render(<RecordNotFound listHref="/institutions" listLabel="Institutions" />);
    expect(screen.getByRole('heading', { name: /no longer exists or was deactivated/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Institutions' })).toHaveAttribute(
      'href',
      '/institutions',
    );
  });
});

describe('review fixes', () => {
  it('ProgressBar can say its value in words', () => {
    render(<ProgressBar label="Run" value={2} max={5} valueText="2 of 5 stages done" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '2 of 5 stages done');
  });

  it('AuditDiff wraps a long unbroken value inside a fixed-layout table (B2)', () => {
    render(
      <AuditDiff
        caption="c"
        changes={[{ field: 'Email', before: null, after: 'a'.repeat(80) + '@x.example' }]}
      />,
    );
    expect(screen.getByRole('table')).toHaveClass('table-fixed');
    expect(screen.getByText(/^a{80}@x\.example$/).closest('td')).toHaveClass('[overflow-wrap:anywhere]');
  });

  it('SupportModeBar is a named region and tells the screen when time is up', () => {
    vi.useFakeTimers();
    const start = new Date('2026-10-25T10:00:00.000Z').getTime();
    vi.setSystemTime(start);
    const onExpire = vi.fn();
    render(
      <SupportModeBar
        scope="X"
        expiresAt={new Date(start + 2000).toISOString()}
        onExit={() => {}}
        onExpire={onExpire}
      />,
    );
    expect(screen.getByRole('region', { name: 'Support session' })).toBeInTheDocument();
    expect(onExpire).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
