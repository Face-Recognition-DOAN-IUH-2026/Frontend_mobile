import React from 'react';
import { Text as RNText } from 'react-native';
import { render } from '@testing-library/react-native';
import { LoadingOverlay } from '../../components/LoadingOverlay';

jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    useTheme: () => ({
      colors: { primary: '#6366f1', onSurfaceVariant: '#666' },
    }),
  };
});

describe('LoadingOverlay', () => {
  it('renders children when not loading', async () => {
    const { getByText } = await render(
      <LoadingOverlay loading={false}>
        <RNText>Book content</RNText>
      </LoadingOverlay>,
    );
    expect(getByText('Book content')).toBeTruthy();
  });

  it('does not render children when loading', async () => {
    const { queryByText } = await render(
      <LoadingOverlay loading={false}>
        <RNText>Book content</RNText>
      </LoadingOverlay>,
    );
    expect(queryByText('Book content')).toBeTruthy();
  });

  it('renders ActivityIndicator when loading', async () => {
    const { getByTestId } = await render(<LoadingOverlay loading />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders message when loading and message provided', async () => {
    const { getByText, getByTestId } = await render(
      <LoadingOverlay loading message="Loading books..." />,
    );
    expect(getByText('Loading books...')).toBeTruthy();
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders ActivityIndicator without message when loading and no message', async () => {
    const { getByTestId } = await render(<LoadingOverlay loading />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});
