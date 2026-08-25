import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal } from 'react-native-paper';
import { useAuth } from '../../../../context/AuthContext';
import AIWidgetTrigger from './AIWidgetTrigger';
import AIWidgetPanel from './AIWidgetPanel';

export default function AIWidget() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated || !user) return null;

  const role = user.role || 'staff';

  return (
    <Portal>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <AIWidgetTrigger />
        <AIWidgetPanel role={role} />
      </View>
    </Portal>
  );
}
