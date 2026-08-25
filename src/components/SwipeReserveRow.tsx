import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppTheme } from '../theme/DarkTheme';

const SWIPE_THRESHOLD = -80;

interface SwipeReserveRowProps {
  children: React.ReactNode;
  onReserve?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  variant?: 'reserve' | 'cancel';
  reserveLabel?: string;
  cancelLabel?: string;
}

export default function SwipeReserveRow({
  children,
  onReserve,
  onCancel,
  disabled,
  variant = 'reserve',
  reserveLabel = 'Báo khi có sách',
  cancelLabel = 'Hủy nhận',
}: SwipeReserveRowProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const translateX = useRef(new Animated.Value(0)).current;
  const isCancel = variant === 'cancel';

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

  const handleAction = () => {
    Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    if (isCancel) {
      onCancel?.();
    } else {
      onReserve?.();
    }
  };

  return (
    <View style={s.wrapper}>
      <View style={[s.reserveAction, { backgroundColor: isCancel ? c.error : c.primary }]}>
        <TouchableOpacity testID="swipe-action" onPress={handleAction} style={s.reserveButton} activeOpacity={0.7}>
          <MaterialCommunityIcons name={isCancel ? 'close-circle-outline' : 'bookmark-check-outline'} size={22} color="#fff" />
          <Text style={s.reserveLabel}>{isCancel ? cancelLabel : reserveLabel}</Text>
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
  reserveAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  reserveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  reserveLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
