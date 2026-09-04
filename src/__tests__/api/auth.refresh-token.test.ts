jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
    post: jest.fn(),
  },
}));

jest.mock('../../api/secureStorage', () => ({
  setAccessToken: jest.fn(),
  setRefreshToken: jest.fn(),
  clearTokens: jest.fn(),
}));

import { authApi } from '../../api/auth';
import axios from 'axios';

const mockPost = axios.post as jest.Mock;

describe('authApi.refreshToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends only the refresh token and never an access-token authorization header', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'new-access-token' } });

    await authApi.refreshToken('refresh-token');

    expect(mockPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/refresh$/),
      { refresh_token: 'refresh-token' },
      expect.objectContaining({
        headers: { Authorization: undefined },
        timeout: 15000,
      }),
    );
  });
});
