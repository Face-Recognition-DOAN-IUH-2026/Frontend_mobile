import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useUndo } from '../../lib/useUndo';

describe('useUndo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with empty state', async () => {
    const { result } = await renderHook(() => useUndo({ duration: 5000 }));
    expect(result.current.hiddenIds).toEqual([]);
    expect(result.current.confirmingId).toBeNull();
    expect(result.current.hasPending).toBe(false);
  });

  it('adds id to hiddenIds on undo', async () => {
    const { result } = await renderHook(() => useUndo({ duration: 5000 }));
    await act(async () => { result.current.undo('item-1'); });
    expect(result.current.hiddenIds).toContain('item-1');
    expect(result.current.hasPending).toBe(true);
  });

  it('does not duplicate id on double undo', async () => {
    const { result } = await renderHook(() => useUndo({ duration: 5000 }));
    await act(async () => { result.current.undo('item-1'); });
    await act(async () => { result.current.undo('item-1'); });
    expect(result.current.hiddenIds.filter(id => id === 'item-1')).toHaveLength(1);
  });

  it('removes id on cancelUndo', async () => {
    const { result } = await renderHook(() => useUndo({ duration: 5000 }));
    await act(async () => { result.current.undo('item-1'); });
    await act(async () => { result.current.cancelUndo('item-1'); });
    expect(result.current.hiddenIds).not.toContain('item-1');
    expect(result.current.hasPending).toBe(false);
  });

  it('sets confirmingId after duration expires', async () => {
    const { result } = await renderHook(() => useUndo({ duration: 5000 }));
    await act(async () => { result.current.undo('item-1'); });
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(result.current.confirmingId).toBe('item-1');
  });

  it('clears confirmingId on markConfirmed', async () => {
    const { result } = await renderHook(() => useUndo({ duration: 5000 }));
    await act(async () => { result.current.undo('item-1'); });
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(result.current.confirmingId).toBe('item-1');
    await act(async () => { result.current.markConfirmed('item-1'); });
    expect(result.current.confirmingId).toBeNull();
  });

  it('handles multiple independent items', async () => {
    const { result } = await renderHook(() => useUndo({ duration: 5000 }));
    await act(async () => { result.current.undo('a'); });
    await act(async () => { result.current.undo('b'); });
    expect(result.current.hiddenIds).toContain('a');
    expect(result.current.hiddenIds).toContain('b');
    expect(result.current.hasPending).toBe(true);
    await act(async () => { result.current.cancelUndo('a'); });
    expect(result.current.hiddenIds).toContain('b');
    expect(result.current.hiddenIds).not.toContain('a');
  });
});
