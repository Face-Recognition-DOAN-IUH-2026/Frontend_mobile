import React, { useRef } from 'react';
import {
  Pressable,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';
import { SPRING_CONFIGS, MotionHaptics } from '../theme/motion';

export interface SpringButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
  enableHaptics?: boolean;
}

/**
 * 60fps Spring Action Button
 * Runs spring transformations directly on the Native UI Thread using useNativeDriver: true.
 */
export function SpringButton({
  onPress,
  onLongPress,
  children,
  style,
  contentContainerStyle,
  disabled = false,
  scaleTo = 0.95,
  enableHaptics = true,
}: SpringButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    if (enableHaptics) {
      MotionHaptics.tap();
    }
    Animated.spring(scale, {
      toValue: scaleTo,
      damping: SPRING_CONFIGS.tap.damping,
      stiffness: SPRING_CONFIGS.tap.stiffness,
      mass: SPRING_CONFIGS.tap.mass,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      damping: SPRING_CONFIGS.tap.damping,
      stiffness: SPRING_CONFIGS.tap.stiffness,
      mass: SPRING_CONFIGS.tap.mass,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={style}
    >
      <Animated.View
        style={[
          styles.container,
          contentContainerStyle,
          {
            transform: [{ scale }],
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    // GPU composite layer properties
    alignItems: 'center',
    justifyContent: 'center',
  },
});
