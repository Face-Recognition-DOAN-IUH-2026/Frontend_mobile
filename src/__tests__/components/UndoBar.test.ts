function undoState({ visible, message, undoLabel, onUndo, onDismiss }: {
  visible: boolean;
  message: string;
  undoLabel?: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const label = undoLabel ?? 'Hoàn tác';
  return {
    visible,
    message,
    undoLabel: label,
    onUndoCalled: false,
    onDismissCalled: false,
    triggerUndo: () => { onUndo(); return true; },
    triggerDismiss: () => { onDismiss(); return true; },
  };
}

describe('UndoBar', () => {
  const onUndo = jest.fn();
  const onDismiss = jest.fn();

  it('is visible when visible=true', () => {
    const output = undoState({ visible: true, message: 'Deleted', onUndo, onDismiss });
    expect(output.visible).toBe(true);
  });

  it('is not visible when visible=false', () => {
    const output = undoState({ visible: false, message: 'Deleted', onUndo, onDismiss });
    expect(output.visible).toBe(false);
  });

  it('shows the message', () => {
    const output = undoState({ visible: true, message: 'Đã xóa ca trực', onUndo, onDismiss });
    expect(output.message).toBe('Đã xóa ca trực');
  });

  it('uses default undo label when not provided', () => {
    const output = undoState({ visible: true, message: 'Deleted', onUndo, onDismiss });
    expect(output.undoLabel).toBe('Hoàn tác');
  });

  it('uses custom undo label when provided', () => {
    const output = undoState({ visible: true, message: 'Deleted', undoLabel: 'Undo', onUndo, onDismiss });
    expect(output.undoLabel).toBe('Undo');
  });

  it('calls onUndo callback', () => {
    const undoFn = jest.fn();
    const output = undoState({ visible: true, message: 'Deleted', onUndo: undoFn, onDismiss });
    output.triggerUndo();
    expect(undoFn).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss callback', () => {
    const dismissFn = jest.fn();
    const output = undoState({ visible: true, message: 'Deleted', onUndo, onDismiss: dismissFn });
    output.triggerDismiss();
    expect(dismissFn).toHaveBeenCalledTimes(1);
  });
});
