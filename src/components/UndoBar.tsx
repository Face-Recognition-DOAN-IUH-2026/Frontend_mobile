import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Snackbar, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppTheme } from '../theme/DarkTheme';

interface UndoBarProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  undoLabel?: string;
  duration?: number;
}

export function UndoBar({ visible, message, onUndo, onDismiss, undoLabel = 'Hoàn tác', duration = 5000 }: UndoBarProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;

  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={duration}
      style={[s.snackbar, { backgroundColor: c.inverseSurface }]}
      action={{
        label: undoLabel,
        onPress: onUndo,
        textColor: c.primary,
      }}
    >
      <View style={s.content}>
        <MaterialCommunityIcons name="undo" size={18} color={c.inverseOnSurface} />
        <Text variant="bodyMedium" style={{ color: c.inverseOnSurface, marginLeft: 8 }}>{message}</Text>
      </View>
    </Snackbar>
  );
}

const s = StyleSheet.create({
  snackbar: {
    borderRadius: 8,
    marginHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
