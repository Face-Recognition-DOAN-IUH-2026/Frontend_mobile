import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { EmptyState } from '../../theme/MobileDesignSystem';

jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    useTheme: () => ({
      colors: {
        outline: '#9ca3af',
        onSurface: '#000',
        onSurfaceVariant: '#666',
      },
    }),
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

describe('EmptyState', () => {
  it('renders the icon', async () => {
    const { getByText } = await render(
      <EmptyState icon="book-open-variant" message="No books" />,
    );
    expect(getByText('book-open-variant')).toBeTruthy();
  });

  it('renders the message as headline', async () => {
    const { getByText } = await render(
      <EmptyState icon="book-open-variant" message="No books found" />,
    );
    expect(getByText('No books found')).toBeTruthy();
  });

  it('prefers title over message for headline', async () => {
    const { getByText, queryByText } = await render(
      <EmptyState icon="book-open-variant" message="Fallback" title="Primary Title" />,
    );
    expect(getByText('Primary Title')).toBeTruthy();
    expect(queryByText('Fallback')).toBeNull();
  });

  it('renders description when provided', async () => {
    const { getByText } = await render(
      <EmptyState icon="alert" message="Empty" description="Try adding something" />,
    );
    expect(getByText('Try adding something')).toBeTruthy();
  });

  it('does not render description when not provided', async () => {
    const { queryByText } = await render(
      <EmptyState icon="alert" message="Empty" />,
    );
    expect(queryByText('Try adding something')).toBeNull();
  });

  it('renders action when provided', async () => {
    const { getByText } = await render(
      <EmptyState icon="alert" message="Empty" action={<Text testID="action-btn">Retry</Text>} />,
    );
    expect(getByText('Retry')).toBeTruthy();
  });
});
