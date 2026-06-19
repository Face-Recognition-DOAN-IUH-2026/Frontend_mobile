import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import { AppTheme } from './types';
import { baseColors } from './BaseColors';

const fontConfig = {
  fontFamily: 'System',
};

export { AppTheme, CustomColors } from './types';
export const DarkTheme: AppTheme = {
  ...MD3DarkTheme,
  dark: true,
  roundness: 8,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#1A73E8',
    primaryContainer: '#1A3A6B',
    secondary: baseColors.secondary,
    tertiary: '#E37400',
    background: baseColors.background,
    surface: baseColors.surface,
    surfaceVariant: baseColors.surfaceVariant,
    error: baseColors.error,
    errorContainer: baseColors.errorDark,
    onPrimary: '#FFFFFF',
    onSecondary: baseColors.text,
    onTertiary: '#FFFFFF',
    onBackground: baseColors.text,
    onSurface: baseColors.text,
    onSurfaceVariant: baseColors.textSecondary,
    onError: baseColors.text,
    outline: baseColors.border,
    outlineVariant: baseColors.divider,
    inverseSurface: baseColors.surfaceVariant,
    inverseOnSurface: baseColors.text,
    inversePrimary: '#8AB4F8',
    shadow: baseColors.border,
    surfaceTint: '#1A73E8',
    elevation: {
      level0: 'transparent',
      level1: baseColors.surface,
      level2: baseColors.surfaceVariant,
      level3: '#2A2F3A',
      level4: '#2F3540',
      level5: '#353B48',
    },
    custom: {
      textDisabled: baseColors.textDisabled,
      success: baseColors.success,
      warning: baseColors.warning,
    },
    divider: baseColors.divider,
  },
};