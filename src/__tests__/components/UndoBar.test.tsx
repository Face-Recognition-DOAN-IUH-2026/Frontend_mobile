import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UndoBar } from '../../components/UndoBar';

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

describe('UndoBar', () => {
  it('renders message when visible', async () => {
    const { getByText } = await render(
      <UndoBar visible={true} message="Deleted" onUndo={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('Deleted')).toBeTruthy();
  });

  it('shows default undo label', async () => {
    const { getByText } = await render(
      <UndoBar visible={true} message="Deleted" onUndo={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('Hoàn tác')).toBeTruthy();
  });

  it('shows custom undo label when provided', async () => {
    const { getByText } = await render(
      <UndoBar visible={true} message="Deleted" undoLabel="Undo" onUndo={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('Undo')).toBeTruthy();
  });

  it('calls onUndo when undo action pressed', async () => {
    const onUndo = jest.fn();
    const { getByText } = await render(
      <UndoBar visible={true} message="Deleted" onUndo={onUndo} onDismiss={jest.fn()} />,
    );
    fireEvent.press(getByText('Hoàn tác'));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('renders undo icon', async () => {
    const { getByText } = await render(
      <UndoBar visible={true} message="Test" onUndo={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('undo')).toBeTruthy();
  });

  it('renders with different messages', async () => {
    const { getByText } = await render(
      <UndoBar visible={true} message="Đã xóa ca trực" onUndo={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('Đã xóa ca trực')).toBeTruthy();
  });
});
