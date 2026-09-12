import axios from 'axios';
import api, { cancelPendingRequests } from '../../api/client';
import { clearTokens, getRefreshToken } from '../../api/secureStorage';

jest.mock('../../config/api', () => ({ API_BASE_URL: 'http://test/api' }));
jest.mock('../../utils/logger', () => ({ devError: jest.fn() }));
jest.mock('../../api/secureStorage', () => ({
  getSessionGeneration: jest.fn(() => 0),
  saveSessionTokens: jest.fn().mockResolvedValue(undefined),
  getAccessToken: jest.fn().mockResolvedValue('access'),
  getRefreshToken: jest.fn().mockResolvedValue('refresh'),
  setAccessToken: jest.fn().mockResolvedValue(undefined),
  setRefreshToken: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn(() => Object.assign(jest.fn().mockResolvedValue({ data: 'retried' }), {
    post: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  })) },
}));

const refreshApi = (axios.create as jest.Mock).mock.results[1].value;
const handleError = (api.interceptors.response.use as jest.Mock).mock.calls[0][1];
const unauthorized = (url: string) => ({ response: { status: 401 }, config: { url, headers: {} } });

describe('concurrent refresh', () => {
  beforeEach(() => {
    cancelPendingRequests();
    jest.clearAllMocks();
    (getRefreshToken as jest.Mock).mockResolvedValue('refresh');
  });

  it('rejects every waiter when refresh is rejected', async () => {
    let fail!: (error: unknown) => void;
    refreshApi.post.mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
    const first = handleError(unauthorized('/users/me'));
    const second = handleError(unauthorized('/borrow/history'));
    const result = Promise.allSettled([first, second]);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    fail({ response: { status: 401 } });
    expect((await result).map(item => item.status)).toEqual(['rejected', 'rejected']);
    expect(clearTokens).toHaveBeenCalledTimes(1);
  });

  it('preserves tokens when the refresh server is unreachable', async () => {
    refreshApi.post.mockRejectedValue(new Error('Network Error'));
    await expect(handleError(unauthorized('/users/me'))).rejects.toThrow('Network Error');
    expect(clearTokens).not.toHaveBeenCalled();
  });

  it('shares one refresh and retries each request only once', async () => {
    refreshApi.post.mockResolvedValue({ data: { access_token: 'new-access', refresh_token: 'new-refresh' } });
    const first = unauthorized('/users/me');
    const second = unauthorized('/borrow/history');
    await Promise.all([handleError(first), handleError(second)]);
    expect(refreshApi.post).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledTimes(2);
    await expect(handleError(second)).rejects.toBe(second);
    expect(refreshApi.post).toHaveBeenCalledTimes(1);
  });

  it('unlocks the queue after secure storage throws', async () => {
    (getRefreshToken as jest.Mock).mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(handleError(unauthorized('/users/me'))).rejects.toThrow('Storage unavailable');
    refreshApi.post.mockResolvedValue({ data: { access_token: 'new-access' } });
    await expect(handleError(unauthorized('/users/me'))).resolves.toEqual({ data: 'retried' });
  });
});
