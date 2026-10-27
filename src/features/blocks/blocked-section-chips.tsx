import { IconLock } from '@tabler/icons-react';
import { StatusChip } from '@/components/ui/status-chip';
import { sectionChipLabel } from './section-copy';
import type { BlockSection } from './types';

/** One chip per blocked section, so a blocked Society or Institution reads as blocked at a glance (DESIGN.md 3). */
export function BlockedSectionChips({ sections }: { sections: readonly BlockSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <StatusChip
          key={section}
          tone="error"
          label={sectionChipLabel(section)}
          icon={<IconLock size={12} aria-hidden="true" />}
        />
      ))}
    </>
  );
}
