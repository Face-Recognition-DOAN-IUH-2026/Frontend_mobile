import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../api/auth';

jest.mock('../../../api/auth');
jest.mock('../../../api/notification', () => ({
  notificationApi: {
    unregisterDeviceToken: jest.fn(),
  },
}));
jest.mock('../../../api/secureStorage', () => ({
  getAccessToken: jest.fn().mockResolvedValue(null),
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

describe('AuthContext - LIB-252 Password Change Guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets mustChangePassword when login response has require_password_change', async () => {
    (authApi.patronLogin as jest.Mock).mockResolvedValueOnce({
      access_token: 'dummy.jwt.token',
      refresh_token: 'dummy_refresh',
      token_type: 'bearer',
      require_password_change: true,
      user: {
        id: 'user-1',
        student_code: '20012345',
        full_name: 'Nguyễn Văn A',
        email: '20012345@library.local',
        password_auto_generated: true,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.patronLogin('20012345', '11111111');
    });

    expect(result.current.mustChangePassword).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe('user-1');
  });

  it('resets mustChangePassword when user updates password', async () => {
    (authApi.patronLogin as jest.Mock).mockResolvedValueOnce({
      access_token: 'dummy.jwt.token',
      refresh_token: 'dummy_refresh',
      token_type: 'bearer',
      require_password_change: true,
      user: {
        id: 'user-1',
        student_code: '20012345',
        full_name: 'Nguyễn Văn A',
        password_auto_generated: true,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.patronLogin('20012345', '11111111');
    });

    expect(result.current.mustChangePassword).toBe(true);

    await act(async () => {
      result.current.setMustChangePassword(false);
      result.current.updateUser({ password_auto_generated: false } as any);
    });

    expect(result.current.mustChangePassword).toBe(false);
  });
});
