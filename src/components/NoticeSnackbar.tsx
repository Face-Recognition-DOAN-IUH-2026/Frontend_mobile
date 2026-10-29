import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppTheme } from '../theme/DarkTheme';
import { triggerHaptic } from '../utils/haptics';

export type Severity = 'success' | 'error' | 'warning' | 'info';

const SEVERITY_ICONS: Record<Severity, string> = {
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert',
  info: 'information',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

const SEVERITY_BG: Record<Severity, string> = {
  success: 'rgba(16, 185, 129, 0.16)',
  error: 'rgba(239, 68, 68, 0.16)',
  warning: 'rgba(245, 158, 11, 0.16)',
  info: 'rgba(59, 130, 246, 0.16)',
};

export interface NoticeSnackbarProps {
  visible: boolean;
  message: string;
  severity?: Severity;
  onDismiss: () => void;
  duration?: number;
  topOffset?: number;
  bottomOffset?: number;
  wrapperStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function NoticeSnackbar({
  visible,
  message,
  severity = 'info',
  onDismiss,
  duration = 3500,
  topOffset = 0,
  wrapperStyle,
  testID = 'notice-snackbar',
}: NoticeSnackbarProps) {
  const theme = useTheme() as AppTheme;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const iconName = SEVERITY_ICONS[severity] || 'information';
  const accentColor = SEVERITY_COLORS[severity] || '#3B82F6';
  const badgeBg = SEVERITY_BG[severity] || 'rgba(59, 130, 246, 0.16)';

  const calculatedTop = Math.max((insets?.top || 0) + 10, 16) + topOffset;

  useEffect(() => {
    if (visible) {
      try {
        if (severity === 'error') {
          triggerHaptic.error();
        } else {
          triggerHaptic.light();
        }
      } catch {}

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 90,
          friction: 11,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, duration, onDismiss, severity, slideAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        nsStyles.container,
        {
          top: calculatedTop,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor: theme.dark ? '#1E293B' : '#0F172A',
        },
        wrapperStyle,
      ]}
    >
      <TouchableOpacity
        testID={testID}
        activeOpacity={0.85}
        onPress={onDismiss}
        style={nsStyles.touchable}
      >
        <View style={[nsStyles.iconBadge, { backgroundColor: badgeBg }]}>
          <MaterialCommunityIcons name={iconName as any} size={20} color={accentColor} />
        </View>
        <Text
          variant="bodyMedium"
          style={nsStyles.messageText}
          numberOfLines={3}
        >
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const nsStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    zIndex: 99999,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  messageText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
