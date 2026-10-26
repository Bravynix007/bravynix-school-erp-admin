import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useListControls } from './use-list-controls';

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, '', '/societies/');
});
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

  it('starts from the search, page and sort in the URL', () => {
    window.history.replaceState(null, '', '/societies/?q=sun&page=3&sort=-code');
    const { result } = renderHook(() => useListControls('name'));
    expect(result.current.search).toBe('sun');
    expect(result.current.q).toBe('sun');
    expect(result.current.page).toBe(3);
    expect(result.current.sort).toEqual({ key: 'code', direction: 'desc' });
  });

  it('falls back to the defaults for a page or sort that is not valid', () => {
    window.history.replaceState(null, '', '/societies/?page=zero&sort=-');
    const { result } = renderHook(() => useListControls('name'));
    expect(result.current.page).toBe(1);
    expect(result.current.sortParam).toBe('name');
  });

  it('writes the search, page and sort to the URL, and leaves the defaults out', () => {
    window.history.replaceState(null, '', '/societies/?status=inactive');
    const { result } = renderHook(() => useListControls('name'));
    expect(window.location.search).toBe('?status=inactive');
    act(() => result.current.setPage(2));
    act(() => result.current.toggleSort('code'));
    expect(window.location.search).toBe('?status=inactive&sort=code');
    act(() => result.current.setPage(4));
    act(() => result.current.setSearch('sun'));
    act(() => void vi.advanceTimersByTime(300));
    expect(window.location.search).toBe('?status=inactive&sort=code&q=sun');
    act(() => result.current.setPage(2));
    expect(window.location.search).toBe('?status=inactive&sort=code&q=sun&page=2');
  });
});
