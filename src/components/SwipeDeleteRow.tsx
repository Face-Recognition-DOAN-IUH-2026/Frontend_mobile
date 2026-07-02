import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppTheme } from '../theme/DarkTheme';

const SWIPE_THRESHOLD = -80;

interface SwipeDeleteRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
  deleteLabel?: string;
}

export default function SwipeDeleteRow({ children, onDelete, disabled, deleteLabel = 'Xóa' }: SwipeDeleteRowProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => !disabled && gs.dx < 0 && Math.abs(gs.dx) > 10,
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(Math.max(gs.dx, -120));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, { toValue: -100, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const handleDelete = () => {
    Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    onDelete();
  };

  return (
    <View style={s.wrapper}>
      <View style={[s.deleteAction, { backgroundColor: c.error }]}>
        <TouchableOpacity onPress={handleDelete} style={s.deleteButton} activeOpacity={0.7}>
          <MaterialCommunityIcons name="delete-outline" size={22} color="#fff" />
          <Text style={s.deleteLabel}>{deleteLabel}</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  deleteLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
