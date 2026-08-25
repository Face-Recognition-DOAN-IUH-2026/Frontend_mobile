import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../context/AuthContext';
import AIWidget from '../../features/ai/components/AIWidget/AIWidget';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { ...props }, props.name);
});

jest.mock('../../features/ai/components/AIWidget/useAIWidgetStore', () => ({
  useAIWidgetStore: () => ({
    isOpen: false,
    isMinimized: false,
    activeTab: 'score',
    lastSummary: null,
    messages: [],
    isLoadingChat: false,
    chatSessionId: undefined,
    open: jest.fn(),
    close: jest.fn(),
    toggle: jest.fn(),
    minimize: jest.fn(),
    setActiveTab: jest.fn(),
    updateSummary: jest.fn(),
    sendMessage: jest.fn(),
    clearMessages: jest.fn(),
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <AuthProvider>{ui}</AuthProvider>
      </PaperProvider>
    </QueryClientProvider>,
  );
}

describe('AIWidget (mounted)', () => {
  it('renders the floating action button when open state is false', async () => {
    const { getByTestId } = await renderWithProviders(<AIWidget />);
    expect(getByTestId('ai-widget-fab')).toBeTruthy();
  });
});
