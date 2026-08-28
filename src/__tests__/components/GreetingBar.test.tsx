import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GreetingBar } from '../../components/GreetingBar';

jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    useTheme: () => ({
      colors: {
        surface: '#ffffff',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        primary: '#6366f1',
        outlineVariant: '#e5e7eb',
        custom: {
          success: '#10B981',
          warning: '#F59E0B',
        },
      },
    }),
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

describe('GreetingBar', () => {
  it('renders user name and greeting', async () => {
    const { getByText } = await render(
      <GreetingBar userName="Nguyễn Văn A" onRefresh={jest.fn()} liveConnected={true} />
    );

    expect(getByText(/Nguyễn Văn A/)).toBeTruthy();
  });

  it('renders realtime connected status badge', async () => {
    const { getByText } = await render(
      <GreetingBar userName="Nguyễn Văn A" onRefresh={jest.fn()} liveConnected={true} />
    );

    expect(getByText('Dữ liệu thời gian thực')).toBeTruthy();
  });

  it('renders offline/polling status when liveConnected is false', async () => {
    const { getByText } = await render(
      <GreetingBar userName="Nguyễn Văn A" onRefresh={jest.fn()} liveConnected={false} />
    );

    expect(getByText('Tự động làm mới')).toBeTruthy();
  });

  it('triggers onRefresh when refresh button pressed', async () => {
    const mockRefresh = jest.fn();
    const { getByTestId } = await render(
      <GreetingBar userName="Nguyễn Văn A" onRefresh={mockRefresh} liveConnected={true} />
    );

    const refreshBtn = getByTestId('greeting-refresh-btn');
    fireEvent.press(refreshBtn);
    expect(mockRefresh).toHaveBeenCalled();
  });
});
