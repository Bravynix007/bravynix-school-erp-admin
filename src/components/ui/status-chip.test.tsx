import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusChip, statusTone } from './status-chip';

describe('StatusChip', () => {
  it('shows the word, not colour alone', () => {
    render(<StatusChip tone={statusTone.tenant.Inactive} label="Inactive" />);
    const chip = screen.getByText('Inactive');
    expect(chip).toHaveClass('bg-neutral-bg', 'text-neutral');
  });

  it('keeps one meaning per state', () => {
    expect(statusTone.due.Due).toBe('warning');
    expect(statusTone.due.Paid).toBe('success');
    expect(statusTone.account.Blocked).toBe('error');
    expect(statusTone.aiReport.New).toBe('info');
  });
});
