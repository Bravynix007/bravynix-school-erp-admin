import type { BlockSection } from './types';

/** How each section reads in buttons, chips and sentences (PRD 9.4). */
export const SECTION_NOUN: Record<BlockSection, string> = {
  owners: 'Owners',
  staff: 'staff',
  students: 'students',
};

/** The sections that can be blocked on an Institution, in the order they are shown. */
export const INSTITUTION_SECTIONS = ['staff', 'students'] as const satisfies readonly BlockSection[];

/** What blocking a section does, said before the operator confirms (API design 6.5). */
export const BLOCK_EFFECT: Record<BlockSection, string> = {
  owners:
    'The Owners can no longer work in this Society. They can still sign in to see what is blocked and why.',
  staff:
    'Its Institution Admins, teachers and staff can no longer work in this Institution. Its Owners are not affected.',
  students:
    'Parents lose access to the children of this Institution. Its Owners and staff are not affected. The block is recorded now and starts to stop parents once they can sign in, in the People release.',
};

export const sectionChipLabel = (section: BlockSection) =>
  `${SECTION_NOUN[section].charAt(0).toUpperCase()}${SECTION_NOUN[section].slice(1)} blocked`;
