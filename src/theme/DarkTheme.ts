import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import { colors } from './colors';

const fontConfig = {
  fontFamily: 'System',
};

export const DarkTheme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.surfaceVariant,
    secondary: colors.secondary,
    secondaryContainer: colors.surfaceVariant,
    tertiary: colors.warning,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    error: colors.error,
    errorContainer: colors.errorDark,
    onPrimary: colors.background,
    onSecondary: colors.text,
    onTertiary: colors.background,
    onBackground: colors.text,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    onError: colors.text,
    outline: colors.border,
    outlineVariant: colors.divider,
    inverseSurface: colors.surfaceVariant,
    inverseOnSurface: colors.text,
    inversePrimary: colors.primary,
    shadow: colors.border,
    surfaceTint: colors.primary,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surfaceVariant,
      level3: '#2A2F3A',
      level4: '#2F3540',
      level5: '#353B48',
    },
    custom: {
      bookmark: colors.bookmark,
      glow: colors.glow,
      textDisabled: colors.textDisabled,
      success: colors.success,
      warning: colors.warning,
    },
  },
  roundness: 8,
  fonts: configureFonts({ config: fontConfig }),
};

export type AppTheme = typeof DarkTheme;
