import { useEffect, useState } from 'react';
import { connectAccessRealtime } from '../../../api/accessRealtime';
import { CameraEvent } from '../../../types';

const MAX_EVENTS = 8;

type WsStatus = 'idle' | 'connected' | 'closed' | 'error';

export function useAccessRealtime(enabled = true) {
  const [events, setEvents] = useState<CameraEvent[]>([]);
  const [status, setStatus] = useState<WsStatus>('idle');

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    let ws: WebSocket | null = null;

    connectAccessRealtime(
      (event) => {
        if (!active) return;
        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
      },
      (next) => {
        if (active) setStatus(next);
      },
    )
      .then((socket) => {
        if (active) ws = socket;
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
      ws?.close();
    };
  }, [enabled]);

  return { events, status };
}
