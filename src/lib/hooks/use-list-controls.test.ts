import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useListControls } from './use-list-controls';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useListControls', () => {
  it('starts on page 1 sorted ascending by the default key', () => {
    const { result } = renderHook(() => useListControls('name'));
    expect(result.current.page).toBe(1);
    expect(result.current.sortParam).toBe('name');
  });

  it('waits for typing to pause before it asks for a search, and returns to page 1', () => {
    const { result } = renderHook(() => useListControls('name'));
    act(() => result.current.setPage(4));
    act(() => result.current.setSearch('sun'));
    expect(result.current.q).toBe('');
    expect(result.current.page).toBe(4);
    act(() => void vi.advanceTimersByTime(300));
    expect(result.current.q).toBe('sun');
    expect(result.current.page).toBe(1);
  });

  it('toggles the direction on the same column and starts ascending on a new one', () => {
    const { result } = renderHook(() => useListControls('name'));
    act(() => result.current.toggleSort('name'));
    expect(result.current.sortParam).toBe('-name');
    act(() => result.current.toggleSort('name'));
    expect(result.current.sortParam).toBe('name');
    act(() => result.current.toggleSort('code'));
    expect(result.current.sort).toEqual({ key: 'code', direction: 'asc' });
  });
});
