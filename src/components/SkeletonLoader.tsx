import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '../theme/DarkTheme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const theme = useTheme<AppTheme>();
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [animatedValue]);

  const baseColor = theme.dark ? '#334155' : '#E2E8F0';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          opacity: animatedValue,
        },
        style,
      ]}
    />
  );
}

export function BookCardSkeleton() {
  const theme = useTheme<AppTheme>();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <SkeletonBox width={80} height={110} borderRadius={10} />
      <View style={styles.cardContent}>
        <SkeletonBox width="85%" height={18} borderRadius={6} style={{ marginBottom: 8 }} />
        <SkeletonBox width="60%" height={14} borderRadius={4} style={{ marginBottom: 12 }} />
        <View style={styles.cardFooter}>
          <SkeletonBox width={70} height={22} borderRadius={12} />
          <SkeletonBox width={90} height={32} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

export function NotificationSkeleton() {
  const theme = useTheme<AppTheme>();
  return (
    <View style={[styles.notifCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <SkeletonBox width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="70%" height={16} borderRadius={4} />
        <SkeletonBox width="95%" height={13} borderRadius={4} />
        <SkeletonBox width="40%" height={11} borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    gap: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 12,
    alignItems: 'center',
  },
});
