export interface CustomColors {
  success: string;
  warning: string;
  textDisabled: string;
}

export interface AppThemeColors {
  primary: string;
  primaryContainer: string;
  secondary: string;
  tertiary: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  error: string;
  errorContainer: string;
  onPrimary: string;
  onSecondary: string;
  onTertiary: string;
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;
  onError: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  shadow: string;
  surfaceTint: string;
  elevation: Record<string, string>;
  custom: CustomColors;
  divider: string;
}

export type AppTheme = {
  dark: boolean;
  roundness: number;
  fonts: any;
  colors: AppThemeColors;
};