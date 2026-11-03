import { describe, expect, it } from 'vitest';
import { categories, classes, entry } from '@/test/masters';
import { groupByCategory, inOrder, moveBody } from './master-order';

describe('master order', () => {
  it('lists entries by display order', () => {
    const shuffled = [entry({ id: 'b', displayOrder: 2 }), entry({ id: 'a', displayOrder: 1 })];
    expect(inOrder(shuffled).map((item) => item.id)).toEqual(['a', 'b']);
    // The caller's list is not reordered.
    expect(shuffled[0]!.id).toBe('b');
  });

  it('groups the predefined classes under their categories, hidden ones included, and lists an empty category', () => {
    const groups = groupByCategory([...categories(), entry({ id: 'c3', displayOrder: 3 })], classes());
    expect(groups.map((group) => [group.key, group.entries.map((item) => item.id)])).toEqual([
      ['c1', ['k1', 'k2']],
      ['c2', ['k3']],
      ['c3', []],
    ]);
  });

  it('moves an entry to the place of its neighbour, hidden neighbours counted', () => {
    const group = inOrder(classes()).slice(0, 2);
    expect(moveBody(group, group[1]!, -1)).toEqual({ version: 1, displayOrder: 1 });
    expect(moveBody(group, group[0]!, 1)).toEqual({ version: 1, displayOrder: 2 });
  });

  it('has no move past either end', () => {
    const group = inOrder(classes()).slice(0, 2);
    expect(moveBody(group, group[0]!, -1)).toBeNull();
    expect(moveBody(group, group[1]!, 1)).toBeNull();
  });
});
