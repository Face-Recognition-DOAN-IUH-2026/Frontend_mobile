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
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const reconnect = () => {
      if (!active || timer) return;
      timer = setTimeout(() => { timer = undefined; connect(); }, Math.min(1000 * 2 ** attempts++, 30000));
    };

    const connect = () => {
    connectAccessRealtime(
      (event) => {
        if (!active) return;
        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
      },
      (next) => {
        if (active) setStatus(next);
        if (next === 'connected') attempts = 0;
        if (next === 'closed') reconnect();
      },
    )
      .then((socket) => {
        if (active) ws = socket;
        else socket.close();
      })
      .catch(() => {
        if (active) setStatus('error');
        reconnect();
      });
    };
    connect();

    return () => {
      active = false;
      clearTimeout(timer);
      ws?.close();
    };
  }, [enabled]);

  return { events, status };
}
