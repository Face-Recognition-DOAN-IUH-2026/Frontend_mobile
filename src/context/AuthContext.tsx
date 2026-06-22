import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authApi } from '../api/auth';
import { devError } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  patron: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  staffLogin: (email: string, password: string) => Promise<void>;
  patronLogin: (studentCode: string, password: string) => Promise<void>;
  faceLogin: (imageUri: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getFullName(data: any): string {
  return data?.fullName || data?.full_name || '';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patron, setPatron] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const patronDataStr = await AsyncStorage.getItem('patronData');
      const userDataStr = await AsyncStorage.getItem('userData');
      if (token && patronDataStr) {
        const patronData = JSON.parse(patronDataStr);
        setPatron(patronData);
setUser({ id: patronData.id, email: patronData.email || '', full_name: getFullName(patronData), role: 'patron', avatar_url: patronData.avatar_url });
      } else if (token && userDataStr) {
        const userData = JSON.parse(userDataStr);
        setPatron(null);
setUser({
    id: userData.id,
    email: userData.email || '',
    full_name: getFullName(userData),
    role: userData.role,
    avatar_url: userData.avatar_url,
  });
      }
    } catch (error) {
      devError('Auth check failed:', error);
      await authApi.logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const patronLogin = async (studentCode: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.patronLogin({ student_code: studentCode, password });
      setPatron(response.user);
      setUser({ id: response.user.id, email: response.user.email || '', full_name: getFullName(response.user), role: 'patron', avatar_url: response.user.avatar_url });
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
  avatar_url: userData.avatar_url,
});
    } finally {
      setIsLoading(false);
    }
  };

  const faceLogin = async (imageUri: string) => {
    setIsLoading(true);
    try {
      await authApi.faceLogin(imageUri);
      const patronData = await authApi.getCurrentPatron();
      await AsyncStorage.setItem('patronData', JSON.stringify(patronData));
      setPatron(patronData);
      setUser({ id: patronData.id, email: patronData.email || '', full_name: getFullName(patronData), role: 'patron', avatar_url: patronData.avatar_url });
    } catch (error) {
      await authApi.logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setPatron(null);
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
        checkAuth,
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
