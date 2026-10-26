import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUrlState, writeQuery } from './use-url-state';

beforeEach(() => window.history.replaceState(null, '', '/societies/workspace/?id=s1'));

describe('writeQuery', () => {
  it('sets and removes parameters, keeps the others, and adds no history entry', () => {
    const entries = window.history.length;
    writeQuery({ tab: 'owners', q: 'sun' });
    expect(window.location.search).toBe('?id=s1&tab=owners&q=sun');
    writeQuery({ q: null, tab: '' });
    expect(window.location.search).toBe('?id=s1');
    expect(window.history.length).toBe(entries);
  });
});

describe('useUrlState', () => {
  it('starts from the URL, follows the state, and leaves the fallback out of the address', () => {
    window.history.replaceState(null, '', '/societies/workspace/?id=s1&tab=owners');
    const { result } = renderHook(() => useUrlState('tab', 'overview'));
    expect(result.current[0]).toBe('owners');
    act(() => result.current[1]('institutions'));
    expect(result.current[0]).toBe('institutions');
    expect(window.location.search).toBe('?id=s1&tab=institutions');
    act(() => result.current[1]('overview'));
    expect(window.location.search).toBe('?id=s1');
  });

  it('uses the fallback for a value the screen does not accept', () => {
    window.history.replaceState(null, '', '/societies/workspace/?id=s1&tab=nonsense');
    const { result } = renderHook(() => useUrlState('tab', 'overview', (value) => value === 'owners'));
    expect(result.current[0]).toBe('overview');
  });
});
