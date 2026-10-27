import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { buttonClasses } from './button';

/** A link that looks like a button: for "go to another page", where a real button would hide the destination. */
export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
}: {
  href: Route;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'md' | 'sm';
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(buttonClasses(variant, size), className)}>
      {icon}
      {children}
    </Link>
  );
}
