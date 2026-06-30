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

interface AssignmentCardProps {
  item: StaffScheduleAssignment;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onRequestManualCheckIn?: (assignmentId: string) => void;
  actionLoadingId: string | null;
  shiftLabel?: string;
  shiftTime?: string;
}

export default function AssignmentCard({ item, onCheckIn, onCheckOut, onRequestManualCheckIn, actionLoadingId, shiftLabel, shiftTime }: AssignmentCardProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const state = getAssignmentTimeState(item);
  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const isToday = item.workDate === today;

  const startTime = normalizeTime(item.shift?.startTime);
  const endTime = normalizeTime(item.shift?.endTime);
  const nowDate = new Date();
  const nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();
  const startMins = startTime ? startTime.split(':').map(Number).reduce((h, m, i) => i === 0 ? h * 60 + m : h * 60 + m, 0) : null;
  const endMins = endTime ? endTime.split(':').map(Number).reduce((h, m, i) => i === 0 ? h * 60 + m : h * 60 + m, 0) : null;
  const withinShift = startMins !== null && endMins !== null && nowMins >= startMins && nowMins <= endMins;

  const canCheckIn = isToday && !item.attendance?.checkInAt && withinShift;
  const canCheckOut = isToday && !!item.attendance?.checkInAt && !item.attendance?.checkOutAt;
  const isNow = state === 'now';
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
        isPast && { opacity: 0.6 },
      ]}
    >
      <Card.Content style={s.content}>
        {(shiftLabel || shiftTime) && (
          <Text style={[s.shiftInfo, { color: c.onSurface }]}>
            {shiftLabel}{shiftTime ? ` · ${shiftTime}` : ''}
          </Text>
        )}

        <Text style={s.fieldRow}>
          <Text style={[s.fieldLabel, { color: c.onSurface }]}>Tầng : </Text>
          <Text style={[s.fieldValue, { color: c.onSurface }]}>{zoneLabel(item)}</Text>
        </Text>

        <Text style={s.fieldRow}>
          <Text style={[s.fieldLabel, { color: c.onSurface }]}>Email : </Text>
          <Text style={[s.fieldValue, { color: c.onSurface }]}>{staffName}</Text>
        </Text>

        <Text style={s.fieldRow}>
          <Text style={[s.fieldLabel, { color: c.onSurface }]}>Vào : </Text>
          <Text style={[s.fieldValue, { color: c.onSurface }]}>{checkInTime ?? '--'}</Text>
          <Text style={[s.separator, { color: c.onSurface }]}>  -  </Text>
          <Text style={[s.fieldLabel, { color: c.onSurface }]}>Ra : </Text>
          <Text style={[s.fieldValue, { color: c.onSurface }]}>{checkOutTime ?? '--'}</Text>
        </Text>

        {(canCheckIn || canCheckOut) && (
          <View style={s.actionRow}>
            {canCheckIn ? (
              <Button
                mode="contained"
                icon="login"
                compact
                loading={actionLoadingId === `${item.id}:check-in`}
                onPress={() => onCheckIn(item.id)}
                style={[s.actionBtn, { backgroundColor: c.primary }]}
                labelStyle={s.actionLabel}
                textColor="#fff"
              >
                Check-in
              </Button>
            ) : null}
            {canCheckIn && onRequestManualCheckIn ? (
              <Button
                mode="outlined"
                icon="clipboard-text-outline"
                compact
                loading={actionLoadingId === `${item.id}:manual-checkin`}
                onPress={() => onRequestManualCheckIn(item.id)}
                style={[s.actionBtn, { borderColor: '#8b5cf6' }]}
                labelStyle={[s.actionLabel, { color: '#8b5cf6' }]}
                textColor="#8b5cf6"
              >
                Thủ công
              </Button>
            ) : null}
            {canCheckOut ? (
              <Button
                mode="outlined"
                icon="logout"
                compact
                loading={actionLoadingId === `${item.id}:check-out`}
                onPress={() => onCheckOut(item.id)}
                style={[s.actionBtn, { borderColor: c.outline }]}
                labelStyle={[s.actionLabel, { color: c.onSurface }]}
                textColor={c.onSurface}
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
    borderRadius: 12,
  },
  content: {
    gap: 4,
  },
  shiftInfo: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
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
    fontWeight: '400',
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '400',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
  },
  actionLabel: {
    fontSize: 13,
  },
});
