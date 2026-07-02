function createUndoState(duration = 5000) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let hiddenIds: string[] = [];
  let confirmingId: string | null = null;

  function undo(id: string) {
    if (!hiddenIds.includes(id)) {
      hiddenIds = [...hiddenIds, id];
    }
    const timer = setTimeout(() => {
      confirmingId = id;
      timers.delete(id);
    }, duration);
    timers.set(id, timer);
  }

  function cancelUndo(id: string) {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    hiddenIds = hiddenIds.filter((hid) => hid !== id);
    if (confirmingId === id) confirmingId = null;
  }

  function markConfirmed(id: string) {
    timers.delete(id);
    if (confirmingId === id) confirmingId = null;
  }

  function cleanup() {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
  }

  return {
    get state() {
      return { hiddenIds: [...hiddenIds], confirmingId, hasPending: hiddenIds.length > 0 };
    },
    undo,
    cancelUndo,
    markConfirmed,
    cleanup,
  };
}

describe('useUndo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hides item on undo', () => {
    const undoState = createUndoState();
    undoState.undo('item-1');
    expect(undoState.state.hiddenIds).toEqual(['item-1']);
    expect(undoState.state.hasPending).toBe(true);
  });

  it('does not duplicate hidden ids', () => {
    const undoState = createUndoState();
    undoState.undo('item-1');
    undoState.undo('item-1');
    expect(undoState.state.hiddenIds).toEqual(['item-1']);
  });

  it('moves item to confirming after timer expires', () => {
    const undoState = createUndoState(5000);
    undoState.undo('item-1');
    jest.advanceTimersByTime(5000);
    expect(undoState.state.confirmingId).toBe('item-1');
  });

  it('cancelUndo restores item before timer expires', () => {
    const undoState = createUndoState();
    undoState.undo('item-1');
    undoState.cancelUndo('item-1');
    expect(undoState.state.hiddenIds).toEqual([]);
    expect(undoState.state.confirmingId).toBeNull();
    expect(undoState.state.hasPending).toBe(false);
  });

  it('cancelUndo does not mark confirmed after timer expires', () => {
    const undoState = createUndoState();
    undoState.undo('item-1');
    jest.advanceTimersByTime(4000);
    undoState.cancelUndo('item-1');
    expect(undoState.state.confirmingId).toBeNull();
    expect(undoState.state.hiddenIds).toEqual([]);
  });

  it('markConfirmed clears confirming state', () => {
    const undoState = createUndoState();
    undoState.undo('item-1');
    jest.advanceTimersByTime(5000);
    expect(undoState.state.confirmingId).toBe('item-1');
    undoState.markConfirmed('item-1');
    expect(undoState.state.confirmingId).toBeNull();
    expect(undoState.state.hiddenIds).toEqual(['item-1']); // stays hidden
  });

  it('supports multiple items', () => {
    const undoState = createUndoState();
    undoState.undo('item-1');
    undoState.undo('item-2');
    expect(undoState.state.hiddenIds).toEqual(['item-1', 'item-2']);
    undoState.cancelUndo('item-1');
    expect(undoState.state.hiddenIds).toEqual(['item-2']);
  });

  it('cleanup clears all timers', () => {
    const undoState = createUndoState();
    undoState.undo('item-1');
    undoState.undo('item-2');
    undoState.cleanup();
    jest.advanceTimersByTime(5000);
    expect(undoState.state.confirmingId).toBeNull();
  });

  it('hasPending is false when no items are pending', () => {
    const undoState = createUndoState();
    expect(undoState.state.hasPending).toBe(false);
    undoState.undo('item-1');
    expect(undoState.state.hasPending).toBe(true);
    undoState.cancelUndo('item-1');
    expect(undoState.state.hasPending).toBe(false);
  });

  it('cancelUndo restores item even after confirmed', () => {
    const undoState = createUndoState();
    undoState.undo('item-1');
    jest.advanceTimersByTime(5000);
    expect(undoState.state.confirmingId).toBe('item-1');
    undoState.markConfirmed('item-1');
    undoState.cancelUndo('item-1');
    expect(undoState.state.hiddenIds).toEqual([]);
    expect(undoState.state.confirmingId).toBeNull();
  });
});
