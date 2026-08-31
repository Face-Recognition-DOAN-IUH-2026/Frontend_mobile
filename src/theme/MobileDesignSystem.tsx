import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Text, Avatar, Surface, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppTheme } from './DarkTheme';
import { MotionHaptics, SPRING_CONFIGS, MOTION_TIMINGS, isReducedMotionActive } from './motion';

/* ─── Gradient Header ─── */
export function GradientHeader({
  title,
  subtitle,
  icon,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;

  return (
    <Surface style={[dhStyles.header, { backgroundColor: c.primary }]} elevation={0}>
      {/* decorative circles */}
      <View style={[dhStyles.circle, { top: -30, right: -30, width: 120, height: 120, backgroundColor: `${c.onPrimary}14` }]} />
      <View style={[dhStyles.circle, { bottom: -40, left: 80, width: 160, height: 160, backgroundColor: `${c.onPrimary}0D` }]} />

      <View style={dhStyles.headerRow}>
        <Avatar.Icon size={44} icon={icon} style={[dhStyles.headerAvatar, { backgroundColor: `${c.onPrimary}33` }]} color={c.onPrimary} />
        <View style={{ flex: 1 }}>
          <Text variant="titleLarge" style={[dhStyles.headerTitle, { color: c.onPrimary }]}>{title}</Text>
          {subtitle ? <Text variant="bodySmall" style={[dhStyles.headerSubtitle, { color: `${c.onPrimary}B3` }]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </Surface>
  );
}

/* ─── Stat Card ─── */
export function StatCard({
  label,
  value,
  icon,
  gradient,
  pct,
}: {
  label: string;
  value: string | number;
  icon: string;
  gradient: string[];
  pct?: number;
}) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;

  return (
    <Surface style={[dhStyles.statCard, { borderColor: c.outline }]} elevation={0}>
      <View style={[dhStyles.statAccent, { backgroundColor: gradient[0] }]} />
      <View style={dhStyles.statRow}>
        <Avatar.Icon size={40} icon={icon} style={[dhStyles.statIcon, { backgroundColor: gradient[0] + '20' }]} color={gradient[0]} />
        <View style={{ flex: 1 }}>
          <Text variant="labelSmall" style={[dhStyles.statLabel, { color: c.onSurfaceVariant }]}>{label}</Text>
          <Text variant="headlineSmall" style={[dhStyles.statValue, { color: c.onSurface }]}>{value}</Text>
        </View>
      </View>
      {pct !== undefined && (
        <View style={[dhStyles.progressBg, { backgroundColor: c.outline }]}>
          <View style={[dhStyles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: gradient[0] }]} />
        </View>
      )}
    </Surface>
  );
}

/* ─── Section Card ─── */
export function SectionCard({
  title,
  icon,
  accentColor,
  right,
  children,
  style,
}: {
  title?: string;
  icon?: string;
  accentColor?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;

  return (
    <Surface style={[dhStyles.sectionCard, { borderColor: c.outline }, style]} elevation={0}>
      {accentColor && <View style={[dhStyles.sectionAccent, { backgroundColor: accentColor }]} />}
      {(title || right) ? (
        <View style={dhStyles.sectionHeader}>
          <View style={dhStyles.sectionHeaderLeft}>
            {icon ? <MaterialCommunityIcons name={icon as any} size={18} color={c.primary} /> : null}
            {title ? <Text variant="titleSmall" style={[dhStyles.sectionTitle, { color: c.onSurface }]}>{title}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </Surface>
  );
}

/* ─── Filter Pill ─── */
export function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;

  return (
    <Pressable
      onPress={() => {
        MotionHaptics.selection();
        onPress();
      }}
      style={({ pressed }) => [
        dhStyles.pill,
        {
          backgroundColor: active ? c.primary : 'transparent',
          borderColor: active ? c.primary : c.outline,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        variant="labelSmall"
        style={{
          color: active ? c.onPrimary : c.onSurfaceVariant,
          fontWeight: active ? '700' : '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ─── Quick Action Button (Hero shortcuts) ─── */
export function QuickActionButton({
  label,
  icon,
  color,
  badge,
  onPress,
}: {
  label: string;
  icon: string;
  color?: string;
  badge?: number | string;
  onPress: () => void;
}) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const btnColor = color || c.primary;

  return (
    <Pressable
      onPress={() => {
        MotionHaptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        dhStyles.quickActionWrap,
        {
          transform: [{ scale: pressed ? 0.92 : 1 }],
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[dhStyles.quickActionIconWrap, { backgroundColor: btnColor + '18', borderColor: btnColor + '30' }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={btnColor} />
        {badge !== undefined && badge !== 0 && (
          <View style={[dhStyles.quickActionBadge, { backgroundColor: c.error }]}>
            <Text style={dhStyles.quickActionBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text variant="labelSmall" style={[dhStyles.quickActionLabel, { color: c.onSurface }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ─── Status Badge ─── */
export function StatusBadge({
  label,
  type = 'primary',
}: {
  label: string;
  type?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
}) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;

  const colorMap = {
    primary: { bg: c.primary + '18', text: c.primary, dot: c.primary },
    success: { bg: c.custom.success + '18', text: c.custom.success, dot: c.custom.success },
    warning: { bg: c.custom.warning + '18', text: c.custom.warning, dot: c.custom.warning },
    error:   { bg: c.error + '18', text: c.error, dot: c.error },
    neutral: { bg: c.surfaceVariant, text: c.onSurfaceVariant, dot: c.onSurfaceVariant },
  };

  const style = colorMap[type] || colorMap.primary;

  return (
    <View style={[dhStyles.badgeWrap, { backgroundColor: style.bg }]}>
      <View style={[dhStyles.badgeDot, { backgroundColor: style.dot }]} />
      <Text style={[dhStyles.badgeText, { color: style.text }]}>{label}</Text>
    </View>
  );
}

/* ─── Empty State ─── */
export function EmptyState({
  icon,
  message,
  title,
  description,
  action,
}: {
  icon: string;
  message?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;

  const headline = title ?? message;

  return (
    <View style={dhStyles.empty}>
      <MaterialCommunityIcons name={icon as any} size={56} color={c.outline} />
      {headline ? (
        <Text variant="titleMedium" style={{ color: c.onSurface, marginTop: 12, fontWeight: '700', textAlign: 'center' }}>{headline}</Text>
      ) : null}
      {description ? (
        <Text variant="bodyMedium" style={{ color: c.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>{description}</Text>
      ) : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}

/* ─── Gradient presets (IUH Brand-aligned) ─── */
// Chỉ dùng các màu trong hệ brand — không scatter rainbow ngẫu nhiên
export const GRADIENTS = {
  // Primary actions — Navy Blue
  navy:   ['#1E6091', '#154E78'],
  navyLight: ['#2980B9', '#1E6091'],

  // Secondary / Accent — Warm Amber
  amber:  ['#D97706', '#B45309'],
  amberLight: ['#F59E0B', '#D97706'],

  // Success — Emerald (giữ nguyên vì semantic)
  emerald: ['#059669', '#047857'],

  // Info — Steel Blue (tương đồng với navy)
  steel:  ['#2563EB', '#1D4ED8'],

  // Warning / Alert
  orange: ['#EA580C', '#C2410C'],

  // Error
  red:    ['#DC2626', '#B91C1C'],

  // Neutral (cho cards không có semantic đặc biệt)
  slate:  ['#475569', '#334155'],

  // Legacy aliases (giữ để không break components cũ)
  indigo: ['#1E6091', '#154E78'],   // → navy
  blue:   ['#2563EB', '#1D4ED8'],   // → steel
  violet: ['#1E6091', '#154E78'],   // → navy
  cyan:   ['#0891B2', '#0E7490'],
  rose:   ['#E11D48', '#BE123C'],
};

const dhStyles = StyleSheet.create({
  header: {
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 1,
  },
  headerAvatar: {
  },
  headerTitle: {
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 2,
  },

  statCard: {
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 0,
  },
  statAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontWeight: '800',
    marginTop: 2,
  },
  progressBg: {
    height: 3,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0,
  },
  sectionAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },

  quickActionWrap: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  quickActionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  quickActionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
});

export { SPRING_CONFIGS, MOTION_TIMINGS, MotionHaptics, isReducedMotionActive } from './motion';

