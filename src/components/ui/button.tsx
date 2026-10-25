import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover active:shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]',
  secondary: 'bg-surface text-ink border border-line hover:border-line-strong hover:bg-sunken',
  tertiary: 'bg-transparent text-primary hover:underline px-0',
  danger: 'bg-danger text-on-primary hover:brightness-95',
};

/** Buttons per DESIGN.md 12. One primary per view; danger only inside confirm dialogs. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    className,
    children,
    disabled,
    onClick,
    ...rest
  },
  ref,
) {
  // A busy or soft-disabled button stays in the tab order (aria-disabled), so focus is not thrown to the page
  // when it becomes unavailable (WCAG 2.4.3); its clicks are ignored. `disabled` removes it from the order.
  const inert = loading || rest['aria-disabled'] === true || rest['aria-disabled'] === 'true';
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-busy={loading || undefined}
      // A busy submit button must not submit again: cancel the click's default action too.
      onClick={inert ? (event) => event.preventDefault() : onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md text-label font-medium whitespace-nowrap transition-colors',
        size === 'md' ? 'h-10 px-4' : 'h-9 px-3',
        variants[variant],
        'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-sunken disabled:text-disabled',
        'aria-disabled:cursor-not-allowed aria-disabled:border-transparent aria-disabled:bg-sunken aria-disabled:text-disabled',
        className,
      )}
      {...rest}
      aria-disabled={inert || undefined}
    >
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </button>
  );
});
