import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Snackbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppTheme } from '../theme/DarkTheme';

interface UndoBarProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  undoLabel?: string;
  duration?: number;
  bottomOffset?: number;
  wrapperStyle?: StyleProp<ViewStyle>;
}

export function UndoBar({
  visible,
  message,
  onUndo,
  onDismiss,
  undoLabel = 'Hoàn tác',
  duration = 5000,
  bottomOffset = 0,
  wrapperStyle,
}: UndoBarProps) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  const calculatedBottom = bottomOffset + (insets.bottom || 0);

  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={duration}
      style={[s.snackbar, { backgroundColor: c.inverseSurface }]}
      wrapperStyle={[
        s.wrapper,
        { bottom: calculatedBottom },
        wrapperStyle,
      ]}
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
  wrapper: {
    zIndex: 10000,
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
