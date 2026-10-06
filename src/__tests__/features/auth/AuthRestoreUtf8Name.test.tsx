import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../api/auth';
import { getAccessToken } from '../../../api/secureStorage';

jest.mock('../../../api/auth');
jest.mock('../../../api/notification', () => ({
  notificationApi: {
    unregisterDeviceToken: jest.fn(),
  },
}));
jest.mock('../../../api/secureStorage', () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn().mockResolvedValue(null),
  setAccessToken: jest.fn().mockResolvedValue(undefined),
  setRefreshToken: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
  getSessionGeneration: jest.fn().mockReturnValue(1),
  saveSessionTokens: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../api/client', () => ({
  cancelPendingRequests: jest.fn(),
}));

function createJwt(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8')
    .toString('base64')
    .replace(/=/g, '');
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/=/g, '');
  return `${header}.${body}.signature`;
}

describe('AuthContext - UTF-8 Name Preservation on Restore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('correctly decodes Vietnamese UTF-8 full_name from JWT without mojibake', async () => {
    const rawName = 'Bùi Văn Long';
    const fakeToken = createJwt({
      userId: 'patron-123',
      fullName: rawName,
      role: 'patron',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    (getAccessToken as jest.Mock).mockResolvedValue(fakeToken);
    (authApi.getCurrentPatron as jest.Mock).mockResolvedValue({
      id: 'patron-123',
      full_name: rawName,
      avatar_url: 'https://avatar.test/img.png',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    let hookResult: any;
    await act(async () => {
      const { result } = await renderHook(() => useAuth(), { wrapper });
      hookResult = result;
      // Let any asynchronous restore settle
      await Promise.resolve();
    });

    expect(hookResult.current.user).not.toBeNull();
    expect(hookResult.current.user?.full_name).toBe('Bùi Văn Long');
    expect(hookResult.current.user?.full_name).not.toContain('BÃ¹i');
  });
});
