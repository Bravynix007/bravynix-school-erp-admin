import type { MasterChange, MasterEntry } from './types';

/** The entries in the order the API keeps them. */
export const inOrder = (entries: readonly MasterEntry[]): MasterEntry[] =>
  [...entries].sort((a, b) => a.displayOrder - b.displayOrder);

export interface Group {
  /** The class category's ID; `null` for a master with no groups. */
  key: string | null;
  entries: MasterEntry[];
}

/** The predefined classes of each category, in the categories' order; each category is listed even with none. */
export function groupByCategory(
  categories: readonly MasterEntry[],
  classes: readonly MasterEntry[],
): Group[] {
  return inOrder(categories).map((category) => ({
    key: category.id,
    entries: inOrder(classes.filter((entry) => entry.classCategoryId === category.id)),
  }));
}

/**
 * The write that moves an entry one place up or down among the entries of its group. The API takes the position to
 * move to, and the entries it passes shift one place, so the position is the neighbour's. `null` at either end.
 */
export function moveBody(group: readonly MasterEntry[], entry: MasterEntry, by: -1 | 1): MasterChange | null {
  const neighbour = group[group.findIndex((item) => item.id === entry.id) + by];
  return neighbour ? { version: entry.version, displayOrder: neighbour.displayOrder } : null;
}
