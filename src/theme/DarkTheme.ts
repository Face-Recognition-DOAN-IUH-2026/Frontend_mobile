import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import { AppTheme } from './types';
import { baseColors } from './BaseColors';

export { AppTheme, CustomColors } from './types';

const fontConfig = {
  fontFamily: 'BeVietnamPro_400Regular',
};

export const DarkTheme: AppTheme = {
  ...MD3DarkTheme,
  dark: true,
  roundness: 10,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary:          baseColors.primary,
    primaryContainer: baseColors.surfaceVariant,
    secondary:        baseColors.secondary,
    tertiary:         baseColors.secondaryLight,    // Amber lighter
    background:       baseColors.background,
    surface:          baseColors.surface,
    surfaceVariant:   baseColors.surfaceVariant,
    error:            baseColors.error,
    errorContainer:   baseColors.errorDark,
    onPrimary:        '#FFFFFF',
    onSecondary:      '#FFFFFF',
    onTertiary:       '#1C1917',
    onBackground:     baseColors.text,
    onSurface:        baseColors.text,
    onSurfaceVariant: baseColors.textSecondary,
    onError:          '#FFFFFF',
    outline:          baseColors.border,
    outlineVariant:   baseColors.divider,
    inverseSurface:   baseColors.surfaceVariant,
    inverseOnSurface: baseColors.text,
    inversePrimary:   '#5BA8D4',
    shadow:           baseColors.border,
    surfaceTint:      baseColors.primaryLight,
    elevation: {
      level0: 'transparent',
      level1: baseColors.surface,
      level2: baseColors.surfaceVariant,
      level3: '#1E3A52',
      level4: '#22405A',
      level5: '#264662',
    },
    custom: {
      textDisabled: baseColors.textDisabled,
      success:      baseColors.success,
      warning:      baseColors.warning,
    },
    divider: baseColors.divider,
  },
};