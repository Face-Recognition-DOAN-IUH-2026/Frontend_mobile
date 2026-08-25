import React from 'react';
import { StyleSheet } from 'react-native';
import { FAB, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAIWidgetStore } from './useAIWidgetStore';

export default function AIWidgetTrigger() {
  const theme = useTheme();
  const { isMinimized, toggle, isOpen } = useAIWidgetStore();

  if (isMinimized) return null;

  return (
    <FAB
      testID="ai-widget-fab"
      icon={() => <MaterialCommunityIcons name="robot" size={24} color="#fff" />}
      onPress={toggle}
      style={[styles.fab, { backgroundColor: theme.colors.primary }]}
      visible={!isOpen}
      animated={false}
    />
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    zIndex: 9999,
  },
});
