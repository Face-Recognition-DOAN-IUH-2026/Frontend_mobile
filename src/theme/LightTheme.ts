import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { AppTheme, CustomColors } from './types';

const fontConfig = {
  fontFamily: 'System',
};

export const lightColors = {
  primary: '#1A73E8',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D2E3FC',
  secondary: '#5F6368',
  tertiary: '#E37400',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F0F0',
  error: '#D93025',
  errorContainer: '#FCE8E6',
  onSurface: '#1F1F1F',
  onSurfaceVariant: '#5F6368',
  outline: '#DADCE0',
  outlineVariant: '#E8EAED',
  success: '#34A853',
  warning: '#FBBC04',
  divider: '#E8EAED',
};

export { CustomColors };

export const LightTheme: AppTheme = {
  ...MD3LightTheme,
  dark: false,
  roundness: 8,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    primaryContainer: lightColors.primaryContainer,
    secondary: lightColors.secondary,
    tertiary: lightColors.tertiary,
    background: lightColors.background,
    surface: lightColors.surface,
    surfaceVariant: lightColors.surfaceVariant,
    error: lightColors.error,
    errorContainer: lightColors.errorContainer,
    onPrimary: lightColors.onPrimary,
    onSecondary: '#FFFFFF',
    onTertiary: '#FFFFFF',
    onBackground: lightColors.onSurface,
    onSurface: lightColors.onSurface,
    onSurfaceVariant: lightColors.onSurfaceVariant,
    onError: '#FFFFFF',
    outline: lightColors.outline,
    outlineVariant: lightColors.outlineVariant,
    inverseSurface: '#2A2A2A',
    inverseOnSurface: '#F5F5F5',
    inversePrimary: '#8AB4F8',
    shadow: 'rgba(0,0,0,0.15)',
    surfaceTint: lightColors.primary,
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F5F5F5',
      level3: '#EEEEEE',
      level4: '#E8E8E8',
      level5: '#E0E0E0',
    },
    custom: {
      success: lightColors.success,
      warning: lightColors.warning,
      textDisabled: '#AAAAAA',
    },
    divider: lightColors.divider,
  },
};