import { useCallback, useEffect, useRef, useState } from 'react';

const UNDO_DURATION = 5000;

interface UseUndoOptions {
  duration?: number;
}

export interface UndoState {
  hiddenIds: string[];
  confirmingId: string | null;
  undo: (id: string) => void;
  cancelUndo: (id: string) => void;
  markConfirmed: (id: string) => void;
  hasPending: boolean;
}

export function useUndo({ duration = UNDO_DURATION }: UseUndoOptions = {}): UndoState {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const undo = useCallback((id: string) => {
    setHiddenIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });

    const timer = setTimeout(() => {
      setConfirmingId(id);
      timersRef.current.delete(id);
    }, duration);

    timersRef.current.set(id, timer);
  }, [duration]);

  const cancelUndo = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setHiddenIds((prev) => prev.filter((hid) => hid !== id));
    setConfirmingId((prev) => (prev === id ? null : prev));
  }, []);

  const markConfirmed = useCallback((id: string) => {
    timersRef.current.delete(id);
    setConfirmingId((prev) => (prev === id ? null : prev));
  }, []);

  const hasPending = hiddenIds.length > 0;

  return { hiddenIds, confirmingId, undo, cancelUndo, markConfirmed, hasPending };
}
