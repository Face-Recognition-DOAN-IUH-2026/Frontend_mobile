import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { DarkTheme } from '../theme/DarkTheme';
import { LightTheme } from '../theme/LightTheme';
import { AppTheme } from '../theme/types';

export type MobileThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: MobileThemeMode;
  isDark: boolean;
  theme: AppTheme;
  toggleTheme: () => Promise<void>;
  setThemeMode: (mode: MobileThemeMode) => Promise<void>;
}

const STORAGE_KEY = 'mobile_theme_mode';
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  // Default: light mode — app thư viện dùng ngoài trời, light dễ đọc hơn
  const [mode, setMode] = useState<MobileThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') setMode(stored);
      })
      .catch(() => {});
  }, []);

  const setThemeMode = async (nextMode: MobileThemeMode) => {
    setMode(nextMode);
    await AsyncStorage.setItem(STORAGE_KEY, nextMode);
  };

  const toggleTheme = async () => {
    await setThemeMode(mode === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      theme: mode === 'dark' ? DarkTheme : LightTheme,
      toggleTheme,
      setThemeMode,
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useMobileTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useMobileTheme must be used within MobileThemeProvider');
  }
  return context;
}