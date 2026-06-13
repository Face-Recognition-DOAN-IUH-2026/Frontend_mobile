import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authApi } from '../api/auth';

interface AuthContextType {
  user: User | null;
  patron: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  patronLogin: (studentCode: string, password: string) => Promise<void>;
  faceLogin: (imageUri: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patron, setPatron] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const patronDataStr = await AsyncStorage.getItem('patronData');
      if (token && patronDataStr) {
        const patronData = JSON.parse(patronDataStr);
        setPatron(patronData);
        setUser({ id: patronData.id, email: patronData.email || '', full_name: patronData.fullName, role: 'patron' });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
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
      console.log('AuthContext patronLogin called');
      const response = await authApi.patronLogin({ student_code: studentCode, password });
      console.log('AuthContext received:', response);
      setPatron(response.user);
      console.log('setPatron called');
      setUser({ id: response.user.id, email: response.user.email || '', full_name: response.user.fullName, role: 'patron' });
      console.log('setUser called');
    } finally {
      setIsLoading(false);
    }
  };

  const faceLogin = async (imageBase64: string) => {
    setIsLoading(true);
    try {
      await authApi.faceLogin(imageBase64);
      const patronData = await authApi.getCurrentPatron();
      await AsyncStorage.setItem('patronData', JSON.stringify(patronData));
      setPatron(patronData);
      setUser({ id: patronData.id, email: patronData.email || '', full_name: patronData.fullName, role: 'patron' });
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