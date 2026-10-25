import { forwardRef } from 'react';
import { TextField, type TextFieldProps } from './text-field';

export interface MoneyFieldProps extends Omit<
  TextFieldProps,
  'type' | 'value' | 'onChange' | 'prefix' | 'inputMode' | 'defaultValue'
> {
  /** Exact decimal string such as "124500.50" (API design 7.3); never a number. */
  value: string;
  onValueChange: (value: string) => void;
}

/** Rupees with at most two decimals. The value stays a string end to end (money is never a float). */
const ALLOWED = /^\d*(\.\d{0,2})?$/;

export const MoneyField = forwardRef<HTMLInputElement, MoneyFieldProps>(function MoneyField(
  { value, onValueChange, ...rest },
  ref,
) {
  return (
    <TextField
      ref={ref}
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      prefix={<span aria-hidden="true">₹</span>}
      inputClassName="text-right tabular"
      value={value}
      onChange={(event) => {
        const next = event.target.value.replace(/,/g, '').trim();
        if (ALLOWED.test(next)) onValueChange(next);
      }}
    />
  );
});
