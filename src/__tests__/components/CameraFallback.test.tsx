import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import CameraFallback from '../../components/CameraFallback';

jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    useTheme: () => ({
      colors: {
        background: '#fff',
        surfaceVariant: '#eee',
        onSurfaceVariant: '#666',
        onSurface: '#000',
        outlineVariant: '#ccc',
        custom: { textDisabled: '#999' },
        primary: '#6366f1',
      },
    }),
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, null, props.name);
});

describe('CameraFallback', () => {
  const onRetry = jest.fn();
  const onManualSubmit = jest.fn();
  const onPickImage = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders default message', async () => {
    const { getByText } = await render(<CameraFallback onRetry={onRetry} />);
    expect(getByText('Không thể khởi động camera')).toBeTruthy();
  });

  it('renders custom message', async () => {
    const { getByText } = await render(
      <CameraFallback onRetry={onRetry} message="Camera đã ngắt kết nối" />,
    );
    expect(getByText('Camera đã ngắt kết nối')).toBeTruthy();
  });

  it('calls onRetry when retry button pressed', async () => {
    const { getByText } = await render(<CameraFallback onRetry={onRetry} />);
    fireEvent.press(getByText('Thử lại camera'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows manual input when showManualInput=true', async () => {
    const { getByPlaceholderText } = await render(
      <CameraFallback onRetry={onRetry} showManualInput onManualSubmit={onManualSubmit} />,
    );
    expect(getByPlaceholderText('Nhập tại đây...')).toBeTruthy();
  });

  it('does not show manual input by default', async () => {
    const { queryByPlaceholderText } = await render(<CameraFallback onRetry={onRetry} />);
    expect(queryByPlaceholderText('Nhập tại đây...')).toBeNull();
  });

  it('submits manual value on OK button press', async () => {
    const { getByPlaceholderText, getByText } = await render(
      <CameraFallback onRetry={onRetry} showManualInput onManualSubmit={onManualSubmit} />,
    );
    const input = getByPlaceholderText('Nhập tại đây...');
    await act(async () => {
      fireEvent.changeText(input, 'test@example.com');
    });
    fireEvent.press(getByText('OK'));
    expect(onManualSubmit).toHaveBeenCalledWith('test@example.com');
  });

  it('does not submit empty manual value', async () => {
    const { getByPlaceholderText, getByText } = await render(
      <CameraFallback onRetry={onRetry} showManualInput onManualSubmit={onManualSubmit} />,
    );
    const input = getByPlaceholderText('Nhập tại đây...');
    fireEvent.changeText(input, '   ');
    fireEvent.press(getByText('OK'));
    expect(onManualSubmit).not.toHaveBeenCalled();
  });

  it('shows pick image button when showPickImage=true', async () => {
    const { getByText } = await render(
      <CameraFallback onRetry={onRetry} showPickImage onPickImage={onPickImage} />,
    );
    expect(getByText('Chọn ảnh từ thư viện')).toBeTruthy();
  });

  it('does not show pick image by default', async () => {
    const { queryByText } = await render(<CameraFallback onRetry={onRetry} />);
    expect(queryByText('Chọn ảnh từ thư viện')).toBeNull();
  });

  it('calls onPickImage when pick image button pressed', async () => {
    const { getByText } = await render(
      <CameraFallback onRetry={onRetry} showPickImage onPickImage={onPickImage} />,
    );
    fireEvent.press(getByText('Chọn ảnh từ thư viện'));
    expect(onPickImage).toHaveBeenCalledTimes(1);
  });
});
