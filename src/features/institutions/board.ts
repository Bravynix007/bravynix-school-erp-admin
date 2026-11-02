/** The board codes of an Institution (PRD 11.4). */
const BOARDS: Record<number, string> = {
  1: 'CBSE',
  2: 'ICSE',
  3: 'State Board',
  4: 'IB',
  5: 'IGCSE',
  6: 'Other',
};

export const boardName = (code: number | null): string | null =>
  code === null ? null : (BOARDS[code] ?? null);
