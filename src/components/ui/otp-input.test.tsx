import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OtpInput } from './otp-input';

function Harness({ onComplete }: { onComplete: (value: string) => void }) {
  const [value, setValue] = useState('');
  return <OtpInput label="Email code" value={value} onChange={setValue} onComplete={onComplete} />;
}

const boxes = () => screen.getAllByRole('textbox');

describe('OtpInput', () => {
  it('moves forward as digits are typed and completes at six', async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    await userEvent.click(boxes()[0]!);
    await userEvent.keyboard('48201');
    expect(boxes()[5]).toHaveFocus();
    expect(onComplete).not.toHaveBeenCalled();
    await userEvent.keyboard('7');
    expect(onComplete).toHaveBeenCalledWith('482017');
  });

  it('ignores letters', async () => {
    render(<Harness onComplete={vi.fn()} />);
    await userEvent.click(boxes()[0]!);
    await userEvent.keyboard('a');
    expect(boxes()[0]).toHaveValue('');
  });

  it('fills every box from a paste', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    fireEvent.paste(boxes()[0]!, { clipboardData: { getData: () => '482 017' } });
    expect(
      boxes()
        .map((b) => (b as HTMLInputElement).value)
        .join(''),
    ).toBe('482017');
    expect(onComplete).toHaveBeenCalledWith('482017');
  });

  it('Backspace on an empty box clears the one before', async () => {
    render(<Harness onComplete={vi.fn()} />);
    await userEvent.click(boxes()[0]!);
    await userEvent.keyboard('48');
    await userEvent.keyboard('{Backspace}');
    expect(boxes()[1]).toHaveFocus();
    expect(boxes()[1]).toHaveValue('');
    expect(boxes()[0]).toHaveValue('4');
  });
});
