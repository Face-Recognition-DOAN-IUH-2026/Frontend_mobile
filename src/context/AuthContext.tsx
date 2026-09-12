import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Guard: expo-notifications needs native modules not available in Expo Go
function isNotificationsAvailable(): boolean {
  try {
    require('expo-notifications/build/NotificationPermissionsModule');
    return true;
  } catch {
    return false;
  }
}
const NOTIFS_AVAILABLE = isNotificationsAvailable();
import { User, UserRole } from '../types';
import { authApi } from '../api/auth';
import { notificationApi } from '../api/notification';
import { devError } from '../utils/logger';
import { queryClient } from '../lib/queryClient';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '../api/secureStorage';
import { cancelPendingRequests } from '../api/client';
import bus from '../lib/event-bus';
import { getSessionGeneration, saveSessionTokens } from '../api/secureStorage';
import { useAIWidgetStore } from '../features/ai/components/AIWidget/useAIWidgetStore';

interface JwtPayload {
  sub?: string;
  email?: string;
  full_name?: string;
  fullName?: string;
  role?: string;
  roles?: string[];
  exp?: number;
  userId?: string;
}

export interface Patron {
  id: string;
  email?: string;
  full_name?: string;
  fullName?: string;
  avatar_url?: string;
  avatarUrl?: string;
  permanent_address?: string;
  phone?: string;
  faculty?: string;
  student_code?: string;
  password_auto_generated?: boolean;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  patron: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  staffLogin: (email: string, password: string) => Promise<void>;
  patronLogin: (studentCode: string, password: string) => Promise<void>;
  faceLogin: (imageUri: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  updatePatron: (patch: Partial<Patron>) => void;
  restoreUserFromToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getFullName(data: User | Patron): string {
  return (data as any).fullName || (data as any).full_name || '';
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patron, setPatron] = useState<Patron | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreUserFromToken = useCallback(async () => {
    const generation = getSessionGeneration();
    try {
      let accessToken = await getAccessToken();
      let payload = accessToken ? decodeJwtPayload(accessToken) : null;
      const isExpired = !payload || (payload.exp !== undefined && payload.exp * 1000 < Date.now());

      // Match the web flow: recover a session using its refresh token whenever
      // the access token is missing, malformed, or expired.
      if (isExpired) {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          await clearTokens();
          setUser(null);
          setIsLoading(false);
          return;
        }

        try {
          const result = await authApi.refreshToken(refreshToken);
          accessToken = result.access_token;
          payload = decodeJwtPayload(accessToken);
          if (!payload) throw new Error('Refresh returned an invalid access token');

          await saveSessionTokens(accessToken, result.refresh_token, generation);
        } catch (error: any) {
          if (generation !== getSessionGeneration()) return;
          devError('[Auth] Refresh token failed on restore');
          if (error?.response?.status === 401 || error?.response?.status === 403) await clearTokens();
          setUser(null);
          setPatron(null);
          setIsLoading(false);
          return;
        }
      }

      if (!payload) {
        await clearTokens();
        setUser(null);
        return;
      }

      if (generation !== getSessionGeneration()) return;
      const role = (payload.roles?.[0] || payload.role || 'patron') as UserRole;

      // Set basic user from token immediately
      setUser({
        id: (payload.userId || payload.sub) || '',
        email: payload.email || '',
        full_name: payload.fullName || payload.full_name || '',
        role,
      });

      // Fetch full profile to get avatar_url and other fields not in JWT
      try {
        if (role === 'admin' || role === 'staff') {
          setPatron(null);
          const userData = await authApi.getCurrentUser();
          if (generation !== getSessionGeneration()) return;
          setUser((prev) => prev ? { ...prev, avatar_url: userData.avatar_url || userData.avatarUrl } : null);
        } else {
          const patronData = await authApi.getCurrentPatron();
          if (generation !== getSessionGeneration()) return;
          setPatron(patronData);
          setUser((prev) => prev ? { ...prev, avatar_url: patronData.avatar_url || patronData.avatarUrl } : null);
        }
      } catch {
        devError('[Auth] Failed to fetch profile on restore');
      }
    } catch (err: unknown) {
      devError('[Auth] Failed to restore session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreUserFromToken();
  }, [restoreUserFromToken]);

  useEffect(() => {
    const unsub = bus.on('auth:expired', () => {
      setUser(null);
      setPatron(null);
      queryClient.clear();
    });
    return () => unsub();
  }, []);

  const patronLogin = async (studentCode: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.patronLogin({ student_code: studentCode, password });
      setPatron(response.user);
      setUser({ id: response.user.id, email: response.user.email || '', full_name: getFullName(response.user), role: 'patron', avatar_url: response.user.avatar_url || response.user.avatarUrl });
    } finally {
      setIsLoading(false);
    }
  };

  const staffLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.login({ email, password });
      const userData = response.user;
      if (!userData || !['admin', 'staff'].includes(userData.role)) {
        await authApi.logout();
        throw new Error('Tài khoản này không có quyền dùng máy quét trả sách');
      }
      setPatron(null);
      setUser({
        id: userData.id,
        email: userData.email || email,
        full_name: getFullName(userData),
        role: userData.role,
        avatar_url: userData.avatar_url || userData.avatarUrl,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const faceLogin = async (imageUri: string) => {
    setIsLoading(true);
    try {
      const tokenRes = await authApi.faceLogin(imageUri);
      const payload = decodeJwtPayload(tokenRes.access_token);
      const role: string = payload?.roles?.[0] || payload?.role || 'patron';

      if (role === 'admin' || role === 'staff') {
        const userData = await authApi.getCurrentUser();
        setPatron(null);
        setUser({ id: userData.id, email: userData.email || '', full_name: getFullName(userData), role: userData.role, avatar_url: userData.avatar_url || userData.avatarUrl });
      } else {
        const patronData = await authApi.getCurrentPatron();
        setPatron(patronData);
        setUser({ id: patronData.id, email: patronData.email || '', full_name: getFullName(patronData), role: 'patron', avatar_url: patronData.avatar_url || patronData.avatarUrl });
      }
    } catch (error) {
      await authApi.logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (NOTIFS_AVAILABLE) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        await notificationApi.unregisterDeviceToken(tokenData.data);
      } catch {}
    }
    cancelPendingRequests();
    // Clear AI widget conversation from RAM so the next user on the same
    // device does not see the previous session's history. (P1-2)
    useAIWidgetStore.getState().clearMessages();
    await authApi.logout();
    queryClient.clear();
    setUser(null);
    setPatron(null);
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    setPatron((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  // P2-6: dedicated updater so EditProfileScreen can sync patron-specific
  // fields (phone, permanent_address) that are not part of the User type.
  const updatePatron = (patch: Partial<Patron>) => {
    setPatron((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        patron,
        isLoading,
        isAuthenticated: !!user,
        staffLogin,
        patronLogin,
        faceLogin,
        logout,
        updateUser,
        updatePatron,
        restoreUserFromToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
