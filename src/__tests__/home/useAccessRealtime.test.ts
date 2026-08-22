import { renderHook, act } from '@testing-library/react-native';
import { useAccessRealtime } from '../../features/home/hooks/useAccessRealtime';
import { connectAccessRealtime } from '../../api/accessRealtime';

jest.mock('../../api/accessRealtime', () => ({
  connectAccessRealtime: jest.fn(() => Promise.resolve({ close: jest.fn() })),
}));

const fakeEvent = {
  event_id: 'evt-1',
  event_type: 'camera_event' as const,
  camera_id: 'cam-1',
  status: 'granted' as const,
  full_name: 'Nguyen Van A',
  student_code: 'SV001',
  access_type: 'entry' as const,
  occurred_at: new Date().toISOString(),
  source: 'access-service',
};

describe('useAccessRealtime', () => {
  beforeEach(() => {
    (connectAccessRealtime as jest.Mock).mockClear();
  });

  it('connects to the access websocket on mount', async () => {
    await renderHook(() => useAccessRealtime());
    expect(connectAccessRealtime).toHaveBeenCalledTimes(1);
  });

  it('appends a received camera event to state', async () => {
    const { result } = await renderHook(() => useAccessRealtime());
    const onEvent = (connectAccessRealtime as jest.Mock).mock.calls[0][0];
    await act(async () => {
      onEvent(fakeEvent);
    });
    expect(result.current.events[0]).toMatchObject({ event_id: 'evt-1' });
  });

  it('keeps at most the 8 most recent events', async () => {
    const { result } = await renderHook(() => useAccessRealtime());
    const onEvent = (connectAccessRealtime as jest.Mock).mock.calls[0][0];
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        onEvent({ ...fakeEvent, event_id: `evt-${i}` });
      }
    });
    expect(result.current.events).toHaveLength(8);
  });
});
