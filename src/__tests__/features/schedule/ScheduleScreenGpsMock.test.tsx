import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Location from 'expo-location';
import ScheduleScreen from '../../../features/schedule/screens/ScheduleScreen';
import { scheduleApi } from '../../../api/schedule';

jest.mock('expo-location', () => ({
  Accuracy: { High: 'high' },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('../../../api/schedule', () => ({
  scheduleApi: {
    getMySchedules: jest.fn(),
    checkIn: jest.fn(),
    checkOut: jest.fn(),
  },
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'u1', role: 'staff', email: 'staff@iuh.edu.vn' },
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: any) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, null, props.name);
});

const mockLocation = Location as jest.Mocked<typeof Location>;
const mockScheduleApi = scheduleApi as jest.Mocked<typeof scheduleApi>;

const MOCK_BLOCK_MESSAGE = 'Không thể xác thực vị trí. Vui lòng tắt ứng dụng giả lập vị trí.';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// startTime '00:00' keeps the check-in window open (opens 45 min before start),
// so the AssignmentCard always renders the check-in button for this fixture.
const baseAssignment = {
  id: 'a1',
  scheduleId: 's1',
  shiftId: 'sh1',
  zoneId: 'z1',
  workDate: todayStr(),
  status: 'scheduled',
  zone: { id: 'z1', zoneName: 'Tầng 1', floor: 1 },
  shift: { id: 'sh1', name: 'Ca sáng', startTime: '00:00', endTime: '23:59' },
};

// mockedFlag: true -> Android mock position; false -> real position;
// undefined -> flag unavailable (iOS/older OS) -> must not block.
async function renderScreen(mockedFlag: boolean | undefined) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
  mockLocation.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 10.762622, longitude: 106.660172 },
    timestamp: Date.now(),
    ...(mockedFlag === undefined ? {} : { mocked: mockedFlag }),
  } as any);
  mockScheduleApi.getMySchedules.mockResolvedValue({ items: [baseAssignment] } as any);
  mockScheduleApi.checkIn.mockResolvedValue({} as any);
  mockScheduleApi.checkOut.mockResolvedValue({} as any);

  return await render(
    <QueryClientProvider client={queryClient}>
      <ScheduleScreen />
    </QueryClientProvider>,
  );
}

async function pressCheckIn(utils: any) {
  await waitFor(() => expect(utils.getByText('Check-in khu vực')).toBeTruthy());
  await fireEvent.press(utils.getByText('Check-in khu vực'));
}

describe('BLF-GPS-NATIVE mock-provider detection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('blocks check-in when location comes from a mock provider', async () => {
    const utils = await renderScreen(true);

    await pressCheckIn(utils);

    // Snackbar copy appears and scheduleApi.checkIn is never called.
    await waitFor(() => expect(utils.getByText(MOCK_BLOCK_MESSAGE)).toBeTruthy());
    expect(mockScheduleApi.checkIn).not.toHaveBeenCalled();
  });

  it('proceeds with check-in when location is not from a mock provider', async () => {
    const utils = await renderScreen(false);

    await pressCheckIn(utils);

    await waitFor(() => {
      expect(mockScheduleApi.checkIn).toHaveBeenCalledWith(
        'a1',
        10.762622,
        106.660172,
      );
    });
    expect(utils.queryByText(MOCK_BLOCK_MESSAGE)).toBeNull();
  });

  it('proceeds with check-in when the mocked flag is unavailable (best-effort)', async () => {
    const utils = await renderScreen(undefined);

    await pressCheckIn(utils);

    await waitFor(() => {
      expect(mockScheduleApi.checkIn).toHaveBeenCalledWith(
        'a1',
        10.762622,
        106.660172,
      );
    });
    expect(utils.queryByText(MOCK_BLOCK_MESSAGE)).toBeNull();
  });
});
