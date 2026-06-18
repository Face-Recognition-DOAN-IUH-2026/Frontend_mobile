import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Divider, Text, useTheme } from 'react-native-paper';
import { AppTheme } from '../theme/DarkTheme';
import { StaffScheduleAssignment } from '../types';
import { toDateInput, normalizeTime } from '../utils/dateUtils';

type AssignmentTimeState = 'now' | 'today' | 'upcoming' | 'past';

function getAssignmentTimeState(item: StaffScheduleAssignment): AssignmentTimeState {
  const now = new Date();
  const today = toDateInput(now);
  if (item.workDate < today) return 'past';
  if (item.workDate > today) return 'upcoming';
  const startTime = normalizeTime(item.shift?.startTime);
  const endTime = normalizeTime(item.shift?.endTime);
  if (startTime && endTime) {
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (currentTime >= startTime && currentTime <= endTime) return 'now';
  }
  return 'today';
}

function displayZoneName(item: StaffScheduleAssignment) {
  if (!item.zone) return item.zoneId;
  const zoneName = item.zone.zoneName || '';
  const compact = zoneName.match(/^(Tang|Tầng)\s*(\d+)/i);
  return compact ? `Tầng ${compact[2]}` : zoneName || `Tầng ${item.zone.floor ?? '-'}`;
}

interface AssignmentCardProps {
  item: StaffScheduleAssignment;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  actionLoadingId: string | null;
}

export default function AssignmentCard({ item, onCheckIn, onCheckOut, actionLoadingId }: AssignmentCardProps) {
  const theme = useTheme() as AppTheme;
  const state = getAssignmentTimeState(item);
  const today = toDateInput(new Date());
  const isToday = item.workDate === today;
  const canCheckIn = isToday && !item.attendance?.checkInAt;
  const canCheckOut = isToday && !!item.attendance?.checkInAt && !item.attendance?.checkOutAt;
  const isNow = state === 'now';
  const isPast = state === 'past';

  const stateColors = {
    now: theme.colors.primary,
    today: theme.colors.tertiary,
    upcoming: theme.colors.secondary,
    past: theme.colors.outline,
  };

  return (
    <Card
      mode="outlined"
      style={[
        s.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
        isNow && { borderColor: theme.colors.primary, borderWidth: 1.5 },
        isPast && { opacity: 0.65 },
      ]}
    >
      <Card.Content style={s.content}>
        <View style={s.topRow}>
          <View style={[s.stateDot, { backgroundColor: stateColors[state] }]} />
          <Text style={[s.stateText, { color: stateColors[state] }]}>
            {isNow ? 'Đang trực' : isPast ? 'Đã qua' : isToday ? 'Hôm nay' : 'Sắp tới'}
          </Text>
          {isNow && (
            <View style={[s.liveBadge, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="access-point" size={10} color="#fff" />
            </View>
          )}
        </View>

        <Text variant="titleMedium" style={[s.shiftName, { color: theme.colors.onSurface }]}>
          {item.shift?.name || item.shiftId}
        </Text>
        <Text style={[s.timeRange, { color: theme.colors.onSurfaceVariant }]}>
          {normalizeTime(item.shift?.startTime)} - {normalizeTime(item.shift?.endTime)}
        </Text>

        <Divider style={s.divider} />

        <View style={s.detailRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={[s.detailText, { color: theme.colors.onSurfaceVariant }]}>{displayZoneName(item)}</Text>
        </View>
        <View style={s.detailRow}>
          <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={[s.detailText, { color: theme.colors.onSurfaceVariant }]}>{item.workDate}</Text>
        </View>
        <View style={s.detailRow}>
          <MaterialCommunityIcons name="login-variant" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={[s.detailText, { color: theme.colors.onSurfaceVariant }]}>
            {item.attendance?.checkInAt
              ? `Vào lúc ${item.attendance.checkInAt.slice(11, 16)}`
              : 'Chưa check-in'}
          </Text>
        </View>
        {item.attendance?.checkOutAt && (
          <View style={s.detailRow}>
            <MaterialCommunityIcons name="logout-variant" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={[s.detailText, { color: theme.colors.onSurfaceVariant }]}>Ra lúc {item.attendance.checkOutAt.slice(11, 16)}</Text>
          </View>
        )}

        {(canCheckIn || canCheckOut) && (
          <View style={s.actionRow}>
            {canCheckIn ? (
              <Button
                mode="contained"
                icon="login"
                compact
                loading={actionLoadingId === `${item.id}:check-in`}
                onPress={() => onCheckIn(item.id)}
                style={s.actionBtn}
              >
                Check-in
              </Button>
            ) : null}
            {canCheckOut ? (
              <Button
                mode="outlined"
                icon="logout"
                compact
                loading={actionLoadingId === `${item.id}:check-out`}
                onPress={() => onCheckOut(item.id)}
                style={s.actionBtn}
              >
                Check-out
              </Button>
            ) : null}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 14,
  },
  content: {
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stateText: {
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  liveBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftName: {
    fontWeight: '900',
  },
  timeRange: {
    fontSize: 13,
  },
  divider: {
    marginVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
  },
});
