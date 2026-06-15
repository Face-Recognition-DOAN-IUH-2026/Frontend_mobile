import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System',
};

export const LightTheme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#A87214',
    primaryContainer: '#FFF0D1',
    secondary: '#2F6F60',
    secondaryContainer: '#D7F0E9',
    tertiary: '#9A6A00',
    background: '#F6F8FB',
    surface: '#FFFFFF',
    surfaceVariant: '#EEF2F7',
    error: '#B42318',
    errorContainer: '#FEE4E2',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onTertiary: '#FFFFFF',
    onBackground: '#101828',
    onSurface: '#101828',
    onSurfaceVariant: '#475467',
    onError: '#FFFFFF',
    outline: '#D0D5DD',
    outlineVariant: '#EAECF0',
    inverseSurface: '#1D2939',
    inverseOnSurface: '#F9FAFB',
    inversePrimary: '#F2C66D',
    shadow: '#101828',
    surfaceTint: '#A87214',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F9FAFB',
      level3: '#F2F4F7',
      level4: '#EAECF0',
      level5: '#D0D5DD',
    },
    custom: {
      bookmark: '#A87214',
      glow: 'rgba(168, 114, 20, 0.1)',
      textDisabled: '#98A2B3',
      success: '#067647',
      warning: '#B54708',
    },
  },
  roundness: 8,
  fonts: configureFonts({ config: fontConfig }),
};

export type LightAppTheme = typeof LightTheme;
