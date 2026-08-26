import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { AppTheme, CustomColors } from './types';
import { baseColors } from './BaseColors';

// Be Vietnam Pro — font tiếng Việt đẹp, chuyên nghiệp
// Load từ Expo Google Fonts: @expo-google-fonts/be-vietnam-pro
// Fallback về System nếu chưa load
const fontConfig = {
  fontFamily: 'BeVietnamPro_400Regular',
};

export const lightColors = {
  primary:          baseColors.primary,
  onPrimary:        '#FFFFFF',
  primaryContainer: baseColors.surfaceVariantLight,
  secondary:        baseColors.secondary,
  background:       baseColors.backgroundLight,
  surface:          baseColors.surfaceLight,
  surfaceVariant:   baseColors.surfaceVariantLight,
  error:            baseColors.error,
  errorContainer:   '#FEE2E2',
  onSurface:        baseColors.textDark,
  onSurfaceVariant: baseColors.textDarkSecondary,
  outline:          baseColors.borderLight,
  outlineVariant:   baseColors.dividerLight,
  success:          baseColors.success,
  warning:          baseColors.warning,
  divider:          baseColors.dividerLight,
};

export { CustomColors };

export const LightTheme: AppTheme = {
  ...MD3LightTheme,
  dark: false,
  roundness: 10,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary:          lightColors.primary,
    primaryContainer: lightColors.primaryContainer,
    secondary:        lightColors.secondary,
    tertiary:         baseColors.secondary,         // Amber như accent
    background:       lightColors.background,
    surface:          lightColors.surface,
    surfaceVariant:   lightColors.surfaceVariant,
    error:            lightColors.error,
    errorContainer:   lightColors.errorContainer,
    onPrimary:        lightColors.onPrimary,
    onSecondary:      '#FFFFFF',
    onTertiary:       '#FFFFFF',
    onBackground:     lightColors.onSurface,
    onSurface:        lightColors.onSurface,
    onSurfaceVariant: lightColors.onSurfaceVariant,
    onError:          '#FFFFFF',
    outline:          lightColors.outline,
    outlineVariant:   lightColors.outlineVariant,
    inverseSurface:   '#1A2744',
    inverseOnSurface: '#F4F8FC',
    inversePrimary:   '#5BA8D4',
    shadow:           'rgba(30, 96, 145, 0.12)',
    surfaceTint:      lightColors.primary,
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F0F6FC',
      level3: '#E8F2F9',
      level4: '#E0EDF6',
      level5: '#D8E8F3',
    },
    custom: {
      success:      lightColors.success,
      warning:      lightColors.warning,
      textDisabled: '#9DB2C4',
    },
    divider: lightColors.divider,
  },
};