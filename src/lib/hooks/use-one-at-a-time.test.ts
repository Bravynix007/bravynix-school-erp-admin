import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOneAtATime } from './use-one-at-a-time';

describe('useOneAtATime', () => {
  it('starts a second write only after the first is released', () => {
    const { result } = renderHook(() => useOneAtATime());
    const write = vi.fn();
    let release = () => {};
    act(() => {
      result.current((done) => {
        release = done;
        write();
      });
      result.current(() => write());
    });
    expect(write).toHaveBeenCalledTimes(1);

    act(() => release());
    act(() => result.current(() => write()));
    expect(write).toHaveBeenCalledTimes(2);
  });
});
