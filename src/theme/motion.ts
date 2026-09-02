import { AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * 60fps.design Mobile Motion Tokens
 * Standardized spring physics, timings, and haptic feedback profiles for React Native.
 */

// 1. Spring Physics Configuration for Animated / Reanimated
export const SPRING_CONFIGS = {
  // Snappy response for buttons, toggles, chips
  tap: {
    damping: 18,
    stiffness: 380,
    mass: 0.8,
    useNativeDriver: true,
  },

  // Smooth & natural for cards, modals, sheets
  gentle: {
    damping: 24,
    stiffness: 260,
    mass: 1,
    useNativeDriver: true,
  },

  // Playful spring for badges, success indicators, like buttons
  bouncy: {
    damping: 12,
    stiffness: 320,
    mass: 0.7,
    useNativeDriver: true,
  },
};

// 2. Timing Presets (ms)
export const MOTION_TIMINGS = {
  instant: 100,
  fast: 180,
  normal: 280,
  smooth: 380,
};

// 3. Unified Haptic Feedback Helpers
export const MotionHaptics = {
  // Light impact on tap/press
  tap: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },

  // Medium impact on toggle / selection change
  selection: () => {
    Haptics.selectionAsync().catch(() => {});
  },

  // Heavy impact on delete / warning action
  impactHeavy: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },

  // Success vibration on successful scan or action
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },

  // Error vibration
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};

// 4. Accessibility Helper
export async function isReducedMotionActive(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}
