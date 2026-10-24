import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusChip, statusTone } from './status-chip';

describe('StatusChip', () => {
  it('shows the word, not colour alone', () => {
    render(<StatusChip tone={statusTone.tenant.Paused} label="Paused" />);
    const chip = screen.getByText('Paused');
    expect(chip).toHaveClass('bg-warning-bg', 'text-warning');
  });

  it('keeps one meaning per state', () => {
    expect(statusTone.due.Due).toBe('warning');
    expect(statusTone.due.Paid).toBe('success');
    expect(statusTone.account.Blocked).toBe('error');
    expect(statusTone.aiReport.New).toBe('info');
  });
});
