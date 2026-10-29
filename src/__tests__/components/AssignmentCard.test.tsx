import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AssignmentCard from '../../components/AssignmentCard';
import { StaffScheduleAssignment } from '../../types';

const mockTheme = {
  colors: {
    primary: '#6366f1',
    onPrimary: '#ffffff',
    background: '#0f172a',
    surface: '#1e293b',
    onSurface: '#f8fafc',
    outline: '#475569',
    outlineVariant: '#334155',
  },
};

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    useTheme: () => mockTheme,
  };
});

describe('AssignmentCard Component', () => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentHour = now.getHours();
  const startTime = `${String(Math.max(0, currentHour)).padStart(2, '0')}:00`;
  const endTime = `${String(Math.min(23, currentHour + 2)).padStart(2, '0')}:00`;

  const baseItem: StaffScheduleAssignment = {
    id: 'asg-1',
    staffId: 'staff-1',
    shiftId: 'shift-1',
    zoneId: 'zone-1',
    workDate: today,
    status: 'scheduled',
    shift: {
      id: 'shift-1',
      name: 'Ca trực',
      startTime,
      endTime,
      minStaff: 1,
      isActive: true,
    },
    zone: {
      id: 'zone-1',
      floor: 1,
      zoneName: 'Tầng 1 - Khu A',
      isActive: true,
    },
    staff: {
      id: 'staff-1',
      email: 'staff@library.vn',
      role: 'staff',
      status: 'active',
    },
  };

  it('renders shift, floor and email correctly', async () => {
    const { getByText } = await render(
      <AssignmentCard
        item={baseItem}
        onCheckIn={jest.fn()}
        onCheckOut={jest.fn()}
        actionLoadingId={null}
        shiftLabel="Ca trực"
        shiftTime={`${startTime}-${endTime}`}
      />
    );

    expect(getByText(/Ca trực/)).toBeTruthy();
    expect(getByText('staff@library.vn')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });

  it('calls onCheckIn when area check-in button is pressed', async () => {
    const onCheckIn = jest.fn();
    const { getByText } = await render(
      <AssignmentCard
        item={baseItem}
        onCheckIn={onCheckIn}
        onCheckOut={jest.fn()}
        actionLoadingId={null}
      />
    );

    fireEvent.press(getByText('Check-in khu vực'));
    expect(onCheckIn).toHaveBeenCalledWith('asg-1');
  });

  it('shows Check-out button when checked in but not checked out', async () => {
    const checkedInItem: StaffScheduleAssignment = {
      ...baseItem,
      status: 'in_progress',
      attendance: {
        id: 'att-1',
        scheduleId: 'asg-1',
        staffId: 'staff-1',
        checkInAt: `${today}T08:05:00`,
        status: 'on_time',
        method: 'mobile',
      },
    };

    const onCheckOut = jest.fn();
    const { getByText, queryByText } = await render(
      <AssignmentCard
        item={checkedInItem}
        onCheckIn={jest.fn()}
        onCheckOut={onCheckOut}
        actionLoadingId={null}
      />
    );

    expect(getByText(/08:05/)).toBeTruthy();
    expect(getByText('Check-out')).toBeTruthy();
    expect(queryByText('Face Check-in')).toBeNull();

    fireEvent.press(getByText('Check-out'));
    expect(onCheckOut).toHaveBeenCalledWith('asg-1');
  });

  it('shows pending manual badge and hides check-in button when request is pending', async () => {
    const pendingItem: StaffScheduleAssignment = {
      ...baseItem,
      attendance: {
        id: 'att-1',
        scheduleId: 'asg-1',
        staffId: 'staff-1',
        status: 'pending_manual',
        method: 'manual',
      },
    };

    const { getByText, queryByText } = await render(
      <AssignmentCard
        item={pendingItem}
        onCheckIn={jest.fn()}
        onCheckOut={jest.fn()}
        actionLoadingId={null}
      />
    );

    expect(getByText('Đang chờ duyệt check-in thủ công')).toBeTruthy();
    expect(queryByText('Face Check-in')).toBeNull();
    expect(queryByText('Check-out')).toBeNull();
  });
});
