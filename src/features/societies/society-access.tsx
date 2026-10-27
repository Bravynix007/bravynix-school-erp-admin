'use client';

import { useRef } from 'react';
import { Mono } from '@/components/ui/mono';
import { InlineAlert } from '@/components/ui/inline-alert';
import { BlockedSectionChips } from '@/features/blocks/blocked-section-chips';
import { SectionBlockButton } from '@/features/blocks/section-block-button';
import { INSTITUTION_SECTIONS, sectionTitle } from '@/features/blocks/section-copy';
import type { AccessBlock, BlockSection } from '@/features/blocks/types';
import { useSocietyBlocks } from '@/features/blocks/use-blocks';
import { formatStamp } from '@/lib/format/date';
import type { SocietyDetail } from './types';

/**
 * Access: which sections of this Society are blocked and why, and the buttons to block or unblock them
 * (PLT-42 to PLT-44; API design 10.4e). The blocked state comes from the Society itself; the reasons come from
 * the block list and are a courtesy, so a list that fails to load does not hide the buttons.
 */
export function SocietyAccess({ society }: { society: SocietyDetail }) {
  const blocks = useSocietyBlocks(society.id);
  const deactivated = society.status === 0;
  // Where focus goes when the button an operator used leaves the page, e.g. a lifted block on a deactivated Institution.
  const region = useRef<HTMLDivElement>(null);
  const focusRegion = () => region.current?.focus();
  const reasonOf = (section: BlockSection, institutionId: string | null): AccessBlock | undefined =>
    blocks.data?.items.find((block) => block.section === section && block.institutionId === institutionId);

  return (
    <div ref={region} role="group" aria-label="Access" tabIndex={-1} className="flex flex-col gap-4 pt-4">
      <p className="text-body text-ink-secondary">
        A block stops one group of people. Nothing is deleted and there is no expiry: it stays until you
        unblock it. The Owners of the Society see what is blocked and the reason.
      </p>
      {blocks.isError ? (
        <InlineAlert tone="warning">The reasons for the blocks could not be loaded.</InlineAlert>
      ) : null}
      <ul className="divide-y divide-line-subtle rounded-lg border border-line bg-surface">
        <li className="px-4 py-3">
          <SectionRow
            title="Owners of this Society"
            section="owners"
            societyId={society.id}
            institutionId={null}
            name={society.name}
            blocked={society.blockedSections.includes('owners')}
            canBlock={!deactivated}
            block={reasonOf('owners', null)}
            onTriggerGone={focusRegion}
          />
        </li>
        {society.institutions.map((institution) => (
          <li key={institution.id} className="flex flex-col gap-3 px-4 py-3">
            <p className="font-medium">
              {institution.name} <Mono className="text-caption text-ink-secondary">{institution.code}</Mono>
            </p>
            {INSTITUTION_SECTIONS.map((section) => (
              <SectionRow
                key={section}
                title={sectionTitle(section)}
                section={section}
                societyId={society.id}
                institutionId={institution.id}
                name={institution.name}
                blocked={institution.blockedSections.includes(section)}
                canBlock={!deactivated && institution.status === 1}
                block={reasonOf(section, institution.id)}
                onTriggerGone={focusRegion}
              />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionRow({
  title,
  section,
  societyId,
  institutionId,
  name,
  blocked,
  canBlock,
  block,
  onTriggerGone,
}: {
  title: string;
  section: BlockSection;
  societyId: string;
  institutionId: string | null;
  name: string;
  blocked: boolean;
  canBlock: boolean;
  block: AccessBlock | undefined;
  onTriggerGone: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span>{title}</span>
          {blocked ? <BlockedSectionChips sections={[section]} /> : null}
        </p>
        {blocked && block ? (
          <p className="text-caption text-ink-secondary">
            “{block.reason}” · {formatStamp(block.blockedBy, block.blockedAt)}
          </p>
        ) : null}
      </div>
      <SectionBlockButton
        target={{ section, societyId, institutionId }}
        name={name}
        blocked={blocked}
        canBlock={canBlock}
        onTriggerGone={onTriggerGone}
      />
    </div>
  );
}
