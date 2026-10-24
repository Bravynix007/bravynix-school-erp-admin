import { PageHeader } from './page-header';
import { EmptyState } from '@/components/ui/empty-state';

/** Placeholder for destinations whose module is not built yet (build plan phases). */
export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        title="Not built yet"
        description={`This screen arrives in ${phase} of the build plan.`}
        illustration={
          <svg width="96" height="72" viewBox="0 0 96 72" fill="none" aria-hidden="true">
            <rect x="8" y="10" width="80" height="54" rx="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 24h80" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M22 38h36M22 48h22"
              stroke="var(--color-action-primary)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    </>
  );
}
