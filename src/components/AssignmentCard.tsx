import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { AppTheme } from '../theme/DarkTheme';
import { StaffScheduleAssignment } from '../types';
import { normalizeTime } from '../utils/dateUtils';
import { getAssignmentTimeState, AssignmentTimeState } from '../utils/assignmentUtils';

function zoneLabel(item: StaffScheduleAssignment) {
  if (!item.zone) return item.zoneId;
  const zoneName = item.zone.zoneName || '';
  const compact = zoneName.match(/^(Tang|Tầng)\s*(\d+)/i);
  return compact ? compact[2] : zoneName || `${item.zone.floor ?? '-'}`;
}

function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

interface AssignmentCardProps {
  item: StaffScheduleAssignment;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  actionLoadingId: string | null;
  shiftLabel?: string;
  shiftTime?: string;
}

export default function AssignmentCard({
  item,
  onCheckIn,
  onCheckOut,
  actionLoadingId,
  shiftLabel,
  shiftTime,
}: AssignmentCardProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const state = getAssignmentTimeState(item);
  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const isToday = item.workDate === today;

  const startTime = normalizeTime(item.shift?.startTime);
  const nowDate = new Date();
  const nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();
  const startMins = parseTimeToMinutes(startTime);

  // Backend chỉ chặn khi quá sớm: check-in mở 45 phút trước giờ bắt đầu ca (ScheduleService.checkIn),
  // không có giới hạn phía sau nên ca đang/đã diễn ra vẫn check-in được (sẽ bị đánh dấu đi muộn).
  const checkInOpenAt = startMins !== null ? startMins - 45 : null;
  const withinCheckInWindow = checkInOpenAt === null ? true : nowMins >= checkInOpenAt;

  const isPendingManual = item.attendance?.status === 'pending_manual';
  const isCancelled = item.status === 'cancelled';
  const isCompleted = item.status === 'completed' || !!item.attendance?.checkOutAt;

  const canCheckIn = isToday && !item.attendance?.checkInAt && !isPendingManual && !isCancelled && !isCompleted && withinCheckInWindow;
  const canCheckOut = isToday && !!item.attendance?.checkInAt && !item.attendance?.checkOutAt && !isCancelled;
  const checkInNotOpenYet = isToday && !item.attendance?.checkInAt && !isCancelled && !isCompleted && !isPendingManual && !withinCheckInWindow;
  const isPast = state === 'past';

  const checkInTime = item.attendance?.checkInAt ? item.attendance.checkInAt.slice(11, 16) : null;
  const checkOutTime = item.attendance?.checkOutAt ? item.attendance.checkOutAt.slice(11, 16) : null;

  const staffName = item.staff?.email || item.staffId;

  return (
    <Card
      mode="outlined"
      style={[
        s.card,
        {
          backgroundColor: c.surface,
          borderColor: c.outlineVariant,
        },
        isPast && { opacity: 0.75 },
      ]}
    >
      <View style={[s.accentBar, { backgroundColor: canCheckIn ? c.primary : isCompleted ? (c.custom?.success || '#10B981') : isCancelled ? c.error : c.outlineVariant }]} />
      <Card.Content style={s.content}>
        {(shiftLabel || shiftTime) && (
          <View style={s.headerRow}>
            <Text style={[s.shiftInfo, { color: c.onSurface }]}>
              {shiftLabel}{shiftTime ? ` · ${shiftTime}` : ''}
            </Text>
            {isCompleted ? (
              <View style={[s.chipBadge, { backgroundColor: (c.custom?.success || '#10B981') + '18' }]}>
                <MaterialCommunityIcons name="check-circle" size={12} color={c.custom?.success || '#10B981'} />
                <Text style={[s.chipBadgeText, { color: c.custom?.success || '#10B981' }]}>Hoàn thành</Text>
              </View>
            ) : isToday && canCheckIn ? (
              <View style={[s.chipBadge, { backgroundColor: c.primary + '18' }]}>
                <MaterialCommunityIcons name="clock-fast" size={12} color={c.primary} />
                <Text style={[s.chipBadgeText, { color: c.primary }]}>Đang mở check-in</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={s.infoGrid}>
          <Text style={s.fieldRow}>
            <Text style={[s.fieldLabel, { color: c.onSurfaceVariant }]}>Tầng / Khu vực: </Text>
            <Text style={[s.fieldValue, { color: c.onSurface }]}>{zoneLabel(item)}</Text>
          </Text>

          <Text style={s.fieldRow}>
            <Text style={[s.fieldLabel, { color: c.onSurfaceVariant }]}>Nhân viên: </Text>
            <Text style={[s.fieldValue, { color: c.onSurface }]} numberOfLines={1}>{staffName}</Text>
          </Text>

          <Text style={s.fieldRow}>
            <Text style={[s.fieldLabel, { color: c.onSurfaceVariant }]}>Vào: </Text>
            <Text style={[s.fieldValue, { color: checkInTime ? (c.custom?.success || '#10B981') : c.onSurfaceVariant }]}>{checkInTime ?? '--:--'}</Text>
            <Text style={[s.separator, { color: c.outlineVariant }]}>  ·  </Text>
            <Text style={[s.fieldLabel, { color: c.onSurfaceVariant }]}>Ra: </Text>
            <Text style={[s.fieldValue, { color: checkOutTime ? c.primary : c.onSurfaceVariant }]}>{checkOutTime ?? '--:--'}</Text>
          </Text>
        </View>

        {isPendingManual && (
          <View style={[s.statusBadge, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#eab308" />
            <Text style={[s.statusBadgeText, { color: '#eab308' }]}>Đang chờ duyệt check-in thủ công</Text>
          </View>
        )}

        {checkInNotOpenYet && (
          <View style={[s.statusBadge, { backgroundColor: 'rgba(234, 179, 8, 0.12)' }]}>
            <MaterialCommunityIcons name="clock-alert-outline" size={16} color="#eab308" />
            <Text style={[s.statusBadgeText, { color: '#eab308' }]}>
              Check-in mở từ 45 phút trước giờ bắt đầu ca
            </Text>
          </View>
        )}

        {(canCheckIn || canCheckOut) && (
          <View style={s.actionContainer}>
            {canCheckIn ? (
              <View style={s.actionRow}>
                <Button
                  mode="contained"
                  icon="map-marker-check"
                  compact
                  loading={actionLoadingId === `${item.id}:check-in`}
                  onPress={() => onCheckIn(item.id)}
                  style={[s.actionBtn, { backgroundColor: c.primary }]}
                  labelStyle={s.actionLabel}
                  textColor="#fff"
                >
                  Check-in khu vực
                </Button>
              </View>
            ) : null}

            {canCheckOut ? (
              <View style={s.actionRow}>
                <Button
                  mode="outlined"
                  icon="logout"
                  compact
                  loading={actionLoadingId === `${item.id}:check-out`}
                  onPress={() => onCheckOut(item.id)}
                  style={[s.actionBtn, { borderColor: c.error }]}
                  labelStyle={[s.actionLabel, { color: c.error }]}
                  textColor={c.error}
                >
                  Check-out
                </Button>
              </View>
            ) : null}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 1,
  },
  content: {
    paddingLeft: 18,
    paddingRight: 14,
    paddingVertical: 12,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  shiftInfo: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  chipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  infoGrid: {
    gap: 3,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  actionContainer: {
    marginTop: 8,
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
