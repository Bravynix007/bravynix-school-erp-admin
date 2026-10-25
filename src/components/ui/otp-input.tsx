'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

const LENGTH = 6;

export interface OtpInputProps {
  value: string;
  onChange(value: string): void;
  /** Called once all six digits are present. */
  onComplete?(value: string): void;
  label: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Six separate digit boxes (STITCH_PROMPT screen 2). Typing moves forward,
 * Backspace moves back, and a pasted code fills every box. The first box
 * carries `autocomplete="one-time-code"` so browsers can offer the code.
 */
export function OtpInput({ value, onChange, onComplete, label, error, disabled, autoFocus }: OtpInputProps) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');

  const focus = (index: number) => boxes.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, LENGTH);
    onChange(clean);
    if (clean.length === LENGTH) onComplete?.(clean);
  };

  const setDigit = (index: number, digit: string) => {
    const chars = digits.slice();
    chars[index] = digit;
    commit(chars.join(''));
  };

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index]) {
      event.preventDefault();
      setDigit(index - 1, '');
      focus(index - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focus(index + 1);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    event.preventDefault();
    commit(pasted);
    focus(pasted.length);
  };

  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-label font-medium text-ink">{label}</legend>
      <div className="flex gap-2">
        {digits.map((digit, index) => (
          <input
            // Boxes never reorder; the index is the identity.
            key={index}
            ref={(element) => {
              boxes.current[index] = element;
            }}
            value={digit}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={LENGTH}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && index === 0}
            aria-label={`Digit ${index + 1} of ${LENGTH}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'otp-error' : undefined}
            onKeyDown={onKeyDown(index)}
            onPaste={onPaste}
            onChange={(event) => {
              const typed = event.target.value.replace(/\D/g, '');
              if (typed.length > 1) {
                // Autofill or a fast typist: treat it like a paste from this box.
                commit(digits.slice(0, index).join('') + typed);
                focus(index + typed.length);
                return;
              }
              setDigit(index, typed);
              if (typed) focus(index + 1);
            }}
            onFocus={(event) => event.target.select()}
            className={cn(
              'h-12 w-11 rounded-md border bg-surface text-center text-h2 font-semibold text-ink tabular',
              'focus:border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus',
              error ? 'border-error' : 'border-field hover:border-ink-secondary',
            )}
          />
        ))}
      </div>
      {error ? (
        <p id="otp-error" role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
