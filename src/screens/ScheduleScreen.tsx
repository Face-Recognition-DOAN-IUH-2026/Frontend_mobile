import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Card, Chip, Divider, Snackbar, Text, useTheme } from 'react-native-paper';
import { scheduleApi } from '../api/schedule';
import { AppTheme } from '../theme/DarkTheme';
import { StaffScheduleAssignment } from '../types';

type AssignmentTimeState = 'now' | 'today' | 'upcoming' | 'past';
type TabFilter = 'all' | AssignmentTimeState;

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'now', label: 'Đang trực' },
  { key: 'today', label: 'Hôm nay' },
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'past', label: 'Đã qua' },
];

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function normalizeTime(value?: string) {
  return (value || '').slice(0, 5);
}

function getErrorMessage(err: any, fallback: string) {
  return err?.response?.data?.detail || err?.response?.data?.error || err?.message || fallback;
}

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

function DayColumn({
  item,
  onCheckIn,
  onCheckOut,
  actionLoadingId,
  styles,
  theme,
}: {
  item: StaffScheduleAssignment;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  actionLoadingId: string | null;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}) {
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
        styles.assignmentCard,
        isNow && { borderColor: theme.colors.primary, borderWidth: 1.5 },
        isPast && { opacity: 0.65 },
      ]}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View style={[styles.stateDot, { backgroundColor: stateColors[state] }]} />
          <Text style={[styles.stateText, { color: stateColors[state] }]}>
            {isNow ? 'Đang trực' : isPast ? 'Đã qua' : isToday ? 'Hôm nay' : 'Sắp tới'}
          </Text>
          {isNow && (
            <View style={[styles.liveBadge, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="access-point" size={10} color="#fff" />
            </View>
          )}
        </View>

        <Text variant="titleMedium" style={styles.shiftName}>
          {item.shift?.name || item.shiftId}
        </Text>
        <Text style={styles.timeRange}>
          {normalizeTime(item.shift?.startTime)} - {normalizeTime(item.shift?.endTime)}
        </Text>

        <Divider style={styles.divider} />

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.detailText}>{displayZoneName(item)}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.detailText}>{item.workDate}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="login-variant" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.detailText}>
            {item.attendance?.checkInAt
              ? `Vào lúc ${item.attendance.checkInAt.slice(11, 16)}`
              : 'Chưa check-in'}
          </Text>
        </View>
        {item.attendance?.checkOutAt && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="logout-variant" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.detailText}>Ra lúc {item.attendance.checkOutAt.slice(11, 16)}</Text>
          </View>
        )}

        {(canCheckIn || canCheckOut) && (
          <View style={styles.actionRow}>
            {canCheckIn ? (
              <Button
                mode="contained"
                icon="login"
                compact
                loading={actionLoadingId === `${item.id}:check-in`}
                onPress={() => onCheckIn(item.id)}
                style={styles.actionBtn}
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
                style={styles.actionBtn}
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

function DayHeader({
  dateStr,
  styles,
  theme,
}: {
  dateStr: string;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}) {
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
  const dayNum = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const today = toDateInput(new Date());
  const isToday = dateStr === today;

  return (
    <View style={[styles.dayHeader, isToday && { backgroundColor: theme.colors.primaryContainer }]}>
      <Text style={[styles.dayName, isToday && { color: theme.colors.primary }]}>{dayName}</Text>
      <Text style={[styles.dayNum, isToday && { color: theme.colors.primary }]}>{dayNum}</Text>
      <Text style={[styles.monthStr, isToday && { color: theme.colors.primary }]}>{monthStr}</Text>
    </View>
  );
}

export default function ScheduleScreen() {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [assignments, setAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const weekDays = useMemo(() => {
    const start = startOfWeek();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return toDateInput(d);
    });
  }, []);

  const weekRange = useMemo(() => ({
    from: weekDays[0],
    to: weekDays[6],
  }), [weekDays]);

  const loadSchedules = async () => {
    setError(null);
    try {
      const result = await scheduleApi.getMySchedules(weekRange.from, weekRange.to);
      setAssignments(result.items);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Không thể tải lịch trực'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [weekRange.from, weekRange.to]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedules();
    setRefreshing(false);
  };

  const runAttendanceAction = async (id: string, action: 'check-in' | 'check-out') => {
    setActionLoadingId(`${id}:${action}`);
    setError(null);
    try {
      if (action === 'check-in') {
        await scheduleApi.checkIn(id);
        setSnackbar('Đã check-in thành công');
      } else {
        await scheduleApi.checkOut(id);
        setSnackbar('Đã check-out thành công');
      }
      await loadSchedules();
    } catch (err: any) {
      setError(getErrorMessage(err, action === 'check-in' ? 'Check-in thất bại' : 'Check-out thất bại'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredAssignments = useMemo(() => {
    if (activeTab === 'all') return assignments;
    return assignments.filter((item) => {
      const state = getAssignmentTimeState(item);
      return state === activeTab;
    });
  }, [assignments, activeTab]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, StaffScheduleAssignment[]>();
    for (const day of weekDays) {
      map.set(day, []);
    }
    for (const item of filteredAssignments) {
      const list = map.get(item.workDate);
      if (list) list.push(item);
    }
    return map;
  }, [filteredAssignments, weekDays]);

  const counts = useMemo(() => {
    const c: Record<TabFilter, number> = { all: assignments.length, now: 0, today: 0, upcoming: 0, past: 0 };
    for (const item of assignments) {
      const state = getAssignmentTimeState(item);
      c[state]++;
    }
    return c;
  }, [assignments]);

  const renderDayColumn = ({ item: dateStr }: { item: string }) => {
    const dayAssignments = groupedByDate.get(dateStr) ?? [];
    return (
      <View style={styles.dayColumn}>
        <DayHeader dateStr={dateStr} styles={styles} theme={theme} />
        <ScrollView
          style={styles.dayAssignments}
          contentContainerStyle={styles.dayAssignmentsContent}
          showsVerticalScrollIndicator={false}
        >
          {dayAssignments.length === 0 ? (
            <View style={styles.emptyColumn}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={26} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyColumnText}>Không có ca</Text>
            </View>
          ) : (
            dayAssignments.map((item) => (
              <DayColumn
                key={item.id}
                item={item}
                onCheckIn={(id) => runAttendanceAction(id, 'check-in')}
                onCheckOut={(id) => runAttendanceAction(id, 'check-out')}
                actionLoadingId={actionLoadingId}
                styles={styles}
                theme={theme}
              />
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="calendar-clock" size={24} color={theme.colors.onPrimary} />
          <Text style={styles.headerTitle}>Lịch trực</Text>
        </View>
        <Text style={styles.headerRange}>{weekRange.from} - {weekRange.to}</Text>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
          {TABS.map((tab) => {
            const count = counts[tab.key];
            const isActive = activeTab === tab.key;
            return (
              <Chip
                key={tab.key}
                selected={isActive}
                onPress={() => setActiveTab(tab.key)}
                mode={isActive ? 'flat' : 'outlined'}
                style={[styles.tabChip, isActive && { backgroundColor: theme.colors.primaryContainer }]}
                textStyle={[styles.tabChipText, isActive && { color: theme.colors.primary }]}
                compact
              >
                {tab.label} {count > 0 ? `(${count})` : ''}
              </Chip>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <Card mode="outlined" style={styles.errorCard}>
          <Card.Content style={styles.errorContent}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={theme.colors.error} />
            <Text style={styles.errorText} selectable>{error}</Text>
          </Card.Content>
        </Card>
      ) : null}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={weekDays}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          renderItem={renderDayColumn}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.weekList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWeek}>
              <MaterialCommunityIcons name="calendar-remove-outline" size={48} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyWeekText}>Không có lịch trực trong tuần này.</Text>
            </View>
          }
        />
      )}

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbar}
      </Snackbar>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const DAY_COLUMN_WIDTH = Math.max(SCREEN_WIDTH * 0.62, 210);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerTitle: {
      color: theme.colors.onSurface,
      fontWeight: '900',
      fontSize: 18,
    },
    headerRange: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
    tabBar: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    tabContent: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    tabChip: {
      borderRadius: 20,
    },
    tabChipText: {
      fontSize: 13,
      fontWeight: '700',
    },
    errorCard: {
      margin: 16,
      backgroundColor: theme.colors.errorContainer,
      borderColor: theme.colors.error,
    },
    errorContent: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    errorText: {
      color: theme.colors.error,
      flex: 1,
    },
    loadingBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekList: {
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    dayColumn: {
      width: DAY_COLUMN_WIDTH,
      marginHorizontal: 6,
    },
    dayHeader: {
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: theme.colors.surfaceVariant,
    },
    dayName: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
      textTransform: 'uppercase',
    },
    dayNum: {
      fontSize: 22,
      fontWeight: '900',
      color: theme.colors.onSurface,
    },
    monthStr: {
      fontSize: 11,
      color: theme.colors.onSurfaceVariant,
    },
    dayAssignments: {
      flex: 1,
    },
    dayAssignmentsContent: {
      gap: 10,
      paddingBottom: 16,
    },
    emptyColumn: {
      alignItems: 'center',
      paddingVertical: 28,
      gap: 6,
    },
    emptyColumnText: {
      color: theme.colors.outlineVariant,
      fontSize: 12,
    },
    emptyWeek: {
      width: SCREEN_WIDTH - 32,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 12,
    },
    emptyWeekText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 15,
      textAlign: 'center',
    },
    assignmentCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderColor: theme.colors.outlineVariant,
    },
    cardContent: {
      gap: 6,
    },
    cardTopRow: {
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
      color: theme.colors.onSurface,
      fontWeight: '900',
    },
    timeRange: {
      color: theme.colors.onSurfaceVariant,
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
      color: theme.colors.onSurfaceVariant,
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
    snackbar: {
      top: 60,
    },
  });
}