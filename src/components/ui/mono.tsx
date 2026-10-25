import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Invoice numbers, codes, request IDs and setup keys are always mono (DESIGN.md 6). */
export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-mono', className)}>{children}</span>;
}
