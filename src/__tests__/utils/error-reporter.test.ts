import { reportError, setupGlobalErrorHandlers } from '../../utils/error-reporter';

const mockFetch = jest.fn((...args: any[]) => Promise.resolve({ ok: true } as Response));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('../../config/api', () => ({
  API_BASE_NO_PATH: 'http://localhost:80/api',
}));

describe('error-reporter', () => {
  beforeEach(() => {
    (globalThis as any).fetch = mockFetch;
    mockFetch.mockClear();
  });

  it('reportError posts with Platform.OS service and label', async () => {
    await reportError({ title: 'Boom', description: 'details' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:80/api/errors/report');
    const body = JSON.parse(init.body as string);
    expect(body.service).toBe('mobile-android');
    expect(body.labels).toContain('mobile-android');
    expect(body.title).toBe('Boom');
  });

  it('reportError swallows fetch failures', async () => {
    mockFetch.mockImplementationOnce(() => Promise.reject(new Error('network')));
    await expect(reportError({ title: 'x' })).resolves.toBeUndefined();
  });

  it('setupGlobalErrorHandlers registers a global handler', () => {
    const original = jest.requireActual('react-native').ErrorUtils?.getGlobalHandler?.();
    const setGlobalHandler = jest.fn((...args: any[]) => {});
    const getGlobalHandler = jest.fn(() => original);
    (globalThis as any).ErrorUtils = { setGlobalHandler, getGlobalHandler };

    setupGlobalErrorHandlers();

    expect(setGlobalHandler).toHaveBeenCalledTimes(1);
    const handler = setGlobalHandler.mock.calls[0][0];
    handler(new Error('fatal'), true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/errors/report'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
