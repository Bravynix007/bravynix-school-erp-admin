import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Checkbox } from './checkbox';
import { MoneyField } from './money-field';
import { Select } from './select';
import { Textarea } from './textarea';
import { TextField } from './text-field';

describe('field outline', () => {
  it('uses the field border token, not the decorative divider, on every input box', () => {
    render(
      <>
        <TextField label="Name" />
        <Select label="Plan" options={[{ value: 'a', label: 'A' }]} />
        <Textarea label="Note" />
      </>,
    );
    for (const control of [
      screen.getByLabelText('Name'),
      screen.getByLabelText('Plan'),
      screen.getByLabelText('Note'),
    ]) {
      expect(control.closest('.border-field')).not.toBeNull();
    }
  });

  it('turns red with the message announced when there is an error', () => {
    render(<TextField label="Email" error="Enter a valid email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
  });
});

describe('TextField', () => {
  it('can hide the label visually and keep it for assistive technology', () => {
    render(<TextField label="Search institutions" hideLabel />);
    expect(screen.getByLabelText('Search institutions')).toBeInTheDocument();
    expect(screen.getByText('Search institutions')).toHaveClass('sr-only');
  });

  it('passes inputClassName to the input', () => {
    render(<TextField label="Name" inputClassName="text-right" />);
    expect(screen.getByLabelText('Name')).toHaveClass('text-right');
  });
});

describe('Select', () => {
  it('shows the placeholder first and reports the choice', async () => {
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <Select
          label="Plan"
          placeholder="Choose a plan"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          options={[
            { value: 'basic', label: 'Basic' },
            { value: 'plus', label: 'Plus' },
          ]}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveDisplayValue('Choose a plan');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Plan' }), 'plus');
    expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveDisplayValue('Plus');
  });
});

describe('Checkbox', () => {
  it('toggles from its label and describes itself with the hint', async () => {
    render(<Checkbox label="Send the invoice" hint="Goes to the Society Owner" />);
    const box = screen.getByRole('checkbox', { name: /Send the invoice/ });
    expect(box).toHaveAccessibleDescription('Goes to the Society Owner');
    await userEvent.click(screen.getByText('Send the invoice'));
    expect(box).toBeChecked();
  });
});

describe('MoneyField', () => {
  function Harness({ initial = '' }: { initial?: string }) {
    const [value, setValue] = useState(initial);
    return <MoneyField label="Monthly fee" value={value} onValueChange={setValue} />;
  }

  it('keeps an exact decimal string with at most two decimals', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Monthly fee');
    await userEvent.type(input, '124500.5099');
    expect(input).toHaveValue('124500.50');
  });

  it('ignores letters and a second dot, and drops pasted commas', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Monthly fee');
    await userEvent.type(input, '1a2.3.4');
    expect(input).toHaveValue('12.34');
    await userEvent.clear(input);
    await userEvent.click(input);
    await userEvent.paste('1,24,500');
    expect(input).toHaveValue('124500');
  });

  it('is right aligned, tabular and offers the numeric keypad', () => {
    render(<Harness initial="10" />);
    const input = screen.getByLabelText('Monthly fee');
    expect(input).toHaveClass('text-right', 'tabular');
    expect(input).toHaveAttribute('inputmode', 'decimal');
  });
});
