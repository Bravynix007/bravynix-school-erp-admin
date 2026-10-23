import { Spinner } from '@/components/ui/spinner';

export function FullPageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center text-primary">
      <Spinner size={28} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
