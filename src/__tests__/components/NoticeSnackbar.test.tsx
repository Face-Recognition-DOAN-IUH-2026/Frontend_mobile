import React from 'react';
import { render } from '@testing-library/react-native';
import { NoticeSnackbar } from '../../components/NoticeSnackbar';

jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    useTheme: () => ({
      colors: {
        onSurface: '#000',
        inverseSurface: '#1a1a1a',
        inverseOnSurface: '#ffffff',
        primary: '#6366f1',
      },
    }),
  };
});

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
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

describe('NoticeSnackbar', () => {
  it('renders message when visible', async () => {
    const { getByText } = await render(
      <NoticeSnackbar visible={true} message="Saved!" severity="success" onDismiss={jest.fn()} />,
    );
    expect(getByText('Saved!')).toBeTruthy();
  });

  it('renders OK action button', async () => {
    const { getByText } = await render(
      <NoticeSnackbar visible={true} message="Test" onDismiss={jest.fn()} />,
    );
    expect(getByText('OK')).toBeTruthy();
  });

  it('renders with default severity info', async () => {
    const { getByText } = await render(
      <NoticeSnackbar visible={true} message="Info msg" onDismiss={jest.fn()} />,
    );
    expect(getByText('Info msg')).toBeTruthy();
  });

  it('renders success severity with correct icon', async () => {
    const { getByText } = await render(
      <NoticeSnackbar visible={true} message="Success!" severity="success" onDismiss={jest.fn()} />,
    );
    expect(getByText('Success!')).toBeTruthy();
    expect(getByText('check-circle')).toBeTruthy();
  });

  it('renders error severity with correct icon', async () => {
    const { getByText } = await render(
      <NoticeSnackbar visible={true} message="Error!" severity="error" onDismiss={jest.fn()} />,
    );
    expect(getByText('Error!')).toBeTruthy();
    expect(getByText('alert-circle')).toBeTruthy();
  });

  it('renders warning severity with correct icon', async () => {
    const { getByText } = await render(
      <NoticeSnackbar visible={true} message="Warning!" severity="warning" onDismiss={jest.fn()} />,
    );
    expect(getByText('Warning!')).toBeTruthy();
    expect(getByText('alert')).toBeTruthy();
  });
});
