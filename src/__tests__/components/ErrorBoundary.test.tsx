import React from 'react';
import { render } from '@testing-library/react-native';
import ErrorBoundary from '../../components/ErrorBoundary';
import { reportError } from '../../utils/error-reporter';

jest.mock('../../utils/error-reporter', () => ({
  reportError: jest.fn(),
  setupGlobalErrorHandlers: jest.fn(),
}));

function Boom(): React.ReactNode {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    (reportError as jest.Mock).mockClear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders fallback UI when a child throws', async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(getByText('Đã xảy ra lỗi')).toBeTruthy();
  });

  it('reports the render error via reportError', async () => {
    await render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('kaboom'),
        priority: 'High',
      }),
    );
  });
});
