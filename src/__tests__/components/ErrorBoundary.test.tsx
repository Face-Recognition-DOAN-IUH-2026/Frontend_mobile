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
  beforeEach(() => {
    (reportError as jest.Mock).mockClear();
  });

  it('renders fallback UI when a child throws', async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(getByText('Da xay ra loi')).toBeTruthy();
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
