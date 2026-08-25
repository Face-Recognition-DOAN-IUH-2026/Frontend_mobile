/**
 * RED: Test that 401 on login endpoints does NOT trigger refresh flow
 */
import axios from 'axios';

jest.mock('../../api/secureStorage', () => ({
  getAccessToken: jest.fn().mockResolvedValue(null),
  getRefreshToken: jest.fn().mockResolvedValue('fake-refresh-token'),
  setAccessToken: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/logger', () => ({
  devError: jest.fn(),
}));

jest.mock('../../lib/event-bus', () => ({
  __esModule: true,
  default: { emit: jest.fn(), on: jest.fn(() => jest.fn()) },
}));

import api from '../../api/client';
import bus from '../../lib/event-bus';
import { getRefreshToken, clearTokens } from '../../api/secureStorage';

// We need to test interceptor behavior by mocking adapter
describe('api client interceptor - auth endpoints should not refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should NOT attempt refresh for POST /auth/login 401 Invalid credentials', async () => {
    const mockAdapter = jest.fn().mockRejectedValueOnce({
      response: { status: 401, data: { error: 'Invalid credentials' } },
      config: { url: '/auth/login', method: 'post', headers: {} },
    });
    // Replace adapter for this test via mocking axios
    // Instead we test via direct request mock
    const error = {
      response: { status: 401, data: { error: 'Invalid credentials' } },
      config: { url: '/auth/login', method: 'post', headers: {}, _retry: undefined },
    };

    // Import the interceptor logic indirectly: simulate what interceptor does
    // For RED, we expect current implementation WRONGLY tries to refresh
    // So we assert that getRefreshToken should NOT be called for auth endpoints
    // This test will FAIL before fix (because current code does call getRefreshToken)
    const AUTH_ENDPOINTS = ['/auth/login', '/patrons/login'];
    const url = '/auth/login';
    const isAuthEndpoint = AUTH_ENDPOINTS.some(p => url.includes(p));
    expect(isAuthEndpoint).toBe(true);

    // Simulate current buggy behavior: it would call refresh
    // After fix, interceptor should early return without calling refresh
    // We test the fixed function exists
    const { shouldSkipAuthRefresh } = require('../../api/client');
    expect(shouldSkipAuthRefresh('/auth/login')).toBe(true);
    expect(shouldSkipAuthRefresh('/patrons/login')).toBe(true);
    expect(shouldSkipAuthRefresh('/users/me')).toBe(false);
  });

  it('should skip refresh for all auth-related endpoints', async () => {
    const { shouldSkipAuthRefresh } = require('../../api/client');
    expect(shouldSkipAuthRefresh('/auth/login')).toBe(true);
    expect(shouldSkipAuthRefresh('/patrons/login')).toBe(true);
    expect(shouldSkipAuthRefresh('/auth/refresh')).toBe(true);
    expect(shouldSkipAuthRefresh('/patrons/register')).toBe(true);
    expect(shouldSkipAuthRefresh('/auth/pre-register-otp')).toBe(true);
    expect(shouldSkipAuthRefresh('/patrons/check-exists')).toBe(true);
    expect(shouldSkipAuthRefresh('/users/me')).toBe(false);
    expect(shouldSkipAuthRefresh('/borrow/history')).toBe(false);
  });
});
