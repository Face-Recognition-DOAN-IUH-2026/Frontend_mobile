import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { AppTheme } from '../theme/DarkTheme';

interface LoadingOverlayProps {
  loading?: boolean;
  message?: string;
  children?: React.ReactNode;
}

export function LoadingOverlay({ loading, message, children }: LoadingOverlayProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;

  if (!loading) return <>{children}</>;

  return (
    <View style={loStyles.container}>
      <ActivityIndicator size="large" color={c.primary} />
      {message ? (
        <Text variant="bodyMedium" style={{ color: c.onSurfaceVariant, marginTop: 12 }}>{message}</Text>
      ) : null}
    </View>
  );
}

const loStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
});
