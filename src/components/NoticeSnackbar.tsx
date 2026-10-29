import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Snackbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppTheme } from '../theme/DarkTheme';

type Severity = 'success' | 'error' | 'warning' | 'info';

const SEVERITY_ICONS: Record<Severity, string> = {
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert',
  info: 'information',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  success: '#4A8C5C',
  error: '#C44E4E',
  warning: '#C49A3C',
  info: '#1A73E8',
};

interface NoticeSnackbarProps {
  visible: boolean;
  message: string;
  severity?: Severity;
  onDismiss: () => void;
  bottomOffset?: number;
  wrapperStyle?: StyleProp<ViewStyle>;
}

export function NoticeSnackbar({
  visible,
  message,
  severity = 'info',
  onDismiss,
  bottomOffset = 0,
  wrapperStyle,
}: NoticeSnackbarProps) {
  const theme = useTheme() as AppTheme;
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  const iconName = SEVERITY_ICONS[severity];
  const accentColor = SEVERITY_COLORS[severity];

  const calculatedBottom = bottomOffset + (insets.bottom || 0);

  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={3000}
      style={[nsStyles.snackbar, { backgroundColor: c.inverseSurface }]}
      wrapperStyle={[
        nsStyles.wrapper,
        { bottom: calculatedBottom },
        wrapperStyle,
      ]}
      action={{ label: 'OK', onPress: onDismiss }}
    >
      <View style={nsStyles.content}>
        <MaterialCommunityIcons name={iconName as any} size={18} color={accentColor} />
        <Text variant="bodyMedium" style={{ color: c.inverseOnSurface, marginLeft: 8 }}>{message}</Text>
      </View>
    </Snackbar>
  );
}

const nsStyles = StyleSheet.create({
  wrapper: {
    zIndex: 9999,
    elevation: 10,
  },
  snackbar: {
    borderRadius: 8,
    marginHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
