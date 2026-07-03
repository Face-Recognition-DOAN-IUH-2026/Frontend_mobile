import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Avatar, Surface, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppTheme } from './DarkTheme';

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
      <View style={[dhStyles.circle, { top: -30, right: -30, width: 120, height: 120, backgroundColor: 'rgba(255,255,255,0.08)' }]} />
      <View style={[dhStyles.circle, { bottom: -40, left: 80, width: 160, height: 160, backgroundColor: 'rgba(255,255,255,0.05)' }]} />

      <View style={dhStyles.headerRow}>
        <Avatar.Icon size={44} icon={icon} style={dhStyles.headerAvatar} color={c.onPrimary} />
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={dhStyles.headerTitle}>{title}</Text>
          {subtitle ? <Text variant="bodySmall" style={dhStyles.headerSubtitle}>{subtitle}</Text> : null}
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
    <View
      style={[
        dhStyles.pill,
        {
          backgroundColor: active ? c.primary : 'transparent',
          borderColor: active ? c.primary : c.outline,
        },
      ]}
      onTouchEnd={onPress}
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

/* ─── Gradient presets ─── */
export const GRADIENTS = {
  indigo: ['#6366f1', '#4338ca'],
  emerald: ['#10b981', '#059669'],
  amber: ['#f59e0b', '#d97706'],
  blue: ['#3b82f6', '#1d4ed8'],
  red: ['#ef4444', '#dc2626'],
  violet: ['#8b5cf6', '#6d28d9'],
  cyan: ['#06b6d4', '#0891b2'],
  rose: ['#f43f5e', '#e11d48'],
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
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  statCard: {
    borderRadius: 14,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 0.5,
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
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.5,
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

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
});
