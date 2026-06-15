import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Card, Snackbar, Text, useTheme } from 'react-native-paper';
import { scheduleApi } from '../api/schedule';
import { AppTheme } from '../theme/DarkTheme';
import { StaffScheduleAssignment } from '../types';

type AssignmentTimeState = 'now' | 'today' | 'upcoming' | 'past';

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

function getStateLabel(state: AssignmentTimeState) {
  return {
    now: 'Đang trực',
    today: 'Hôm nay',
    upcoming: 'Sắp tới',
    past: 'Đã qua',
  }[state];
}

function displayZoneName(item: StaffScheduleAssignment) {
  if (!item.zone) return item.zoneId;
  const zoneName = item.zone.zoneName || '';
  const compact = zoneName.match(/^(Tang|Tầng)\s*(\d+)/i);
  return compact ? `Tầng ${compact[2]}` : zoneName || `Tầng ${item.zone.floor ?? '-'}`;
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

  const weekRange = useMemo(() => {
    const start = startOfWeek();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toDateInput(start), to: toDateInput(end) };
  }, []);

  const today = toDateInput(new Date());
  const todayAssignments = assignments.filter((item) => item.workDate === today);

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

  const runAttendanceAction = async (item: StaffScheduleAssignment, action: 'check-in' | 'check-out') => {
    setActionLoadingId(`${item.id}:${action}`);
    setError(null);
    try {
      if (action === 'check-in') {
        await scheduleApi.checkIn(item.id);
        setSnackbar('Đã check-in ca trực');
      } else {
        await scheduleApi.checkOut(item.id);
        setSnackbar('Đã check-out ca trực');
      }
      await loadSchedules();
    } catch (err: any) {
      setError(getErrorMessage(err, action === 'check-in' ? 'Không thể check-in' : 'Không thể check-out'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderAssignment = (item: StaffScheduleAssignment) => {
    const state = getAssignmentTimeState(item);
    const canCheckIn = item.workDate === today && !item.attendance?.checkInAt;
    const canCheckOut = item.workDate === today && !!item.attendance?.checkInAt && !item.attendance?.checkOutAt;

    return (
      <Card key={item.id} mode="outlined" style={styles.assignmentCard}>
        <Card.Content style={styles.assignmentContent}>
          <View style={styles.assignmentHeader}>
            <View style={styles.assignmentIcon}>
              <MaterialCommunityIcons name="calendar-clock" size={22} color={theme.colors.onPrimary} />
            </View>
            <View style={styles.assignmentTitleWrap}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {item.shift?.name || item.shiftId}
              </Text>
              <Text style={styles.mutedText}>
                {normalizeTime(item.shift?.startTime)}-{normalizeTime(item.shift?.endTime)} - {displayZoneName(item)}
              </Text>
            </View>
            <Text style={styles.stateLabel}>{getStateLabel(state)}</Text>
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Ngày</Text>
              <Text style={styles.detailValue}>{item.workDate}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Tầng</Text>
              <Text style={styles.detailValue}>{item.zone?.floor ?? '-'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Check-in</Text>
              <Text style={styles.detailValue}>{item.attendance?.checkInAt ? 'Đã ghi nhận' : 'Chưa có'}</Text>
            </View>
          </View>

          {(canCheckIn || canCheckOut) ? (
            <View style={styles.actionRow}>
              {canCheckIn ? (
                <Button
                  mode="contained"
                  icon="login"
                  loading={actionLoadingId === `${item.id}:check-in`}
                  onPress={() => runAttendanceAction(item, 'check-in')}
                  style={styles.actionButton}
                >
                  Check-in
                </Button>
              ) : null}
              {canCheckOut ? (
                <Button
                  mode="outlined"
                  icon="logout"
                  loading={actionLoadingId === `${item.id}:check-out`}
                  onPress={() => runAttendanceAction(item, 'check-out')}
                  style={styles.actionButton}
                >
                  Check-out
                </Button>
              ) : null}
            </View>
          ) : null}
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <Card mode="contained" style={styles.header}>
          <Card.Content style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="calendar-clock" size={28} color={theme.colors.onPrimary} />
            </View>
            <View style={styles.headerText}>
              <Text variant="headlineSmall" style={styles.headerTitle}>Lịch trực</Text>
              <Text style={styles.mutedText}>{weekRange.from} - {weekRange.to}</Text>
            </View>
          </Card.Content>
        </Card>

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
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="clock-check-outline" size={19} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Ca hôm nay</Text>
              </View>
              {todayAssignments.length ? todayAssignments.map(renderAssignment) : (
                <Card mode="outlined" style={styles.emptyCard}>
                  <Card.Content style={styles.emptyContent}>
                    <MaterialCommunityIcons name="calendar-blank" size={34} color={theme.colors.onSurfaceVariant} />
                    <Text style={styles.mutedCenterText}>Hôm nay bạn không có ca trực.</Text>
                  </Card.Content>
                </Card>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="calendar-week" size={19} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Lịch tuần</Text>
              </View>
              {assignments.length ? assignments.map(renderAssignment) : (
                <Card mode="outlined" style={styles.emptyCard}>
                  <Card.Content style={styles.emptyContent}>
                    <MaterialCommunityIcons name="calendar-remove" size={34} color={theme.colors.onSurfaceVariant} />
                    <Text style={styles.mutedCenterText}>Chưa có lịch trong tuần này.</Text>
                  </Card.Content>
                </Card>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 28,
      gap: 16,
    },
    header: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    headerIcon: {
      width: 54,
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      color: theme.colors.onSurface,
      fontWeight: '800',
    },
    mutedText: {
      color: theme.colors.onSurfaceVariant,
    },
    mutedCenterText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    errorCard: {
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
      padding: 40,
    },
    section: {
      gap: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      color: theme.colors.onBackground,
      fontSize: 17,
      fontWeight: '800',
    },
    assignmentCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderColor: theme.colors.outlineVariant,
    },
    assignmentContent: {
      gap: 12,
    },
    assignmentHeader: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    assignmentIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    assignmentTitleWrap: {
      flex: 1,
    },
    cardTitle: {
      color: theme.colors.onSurface,
      fontWeight: '800',
    },
    stateLabel: {
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 12,
    },
    detailGrid: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    detailItem: {
      flexGrow: 1,
      flexBasis: '30%',
      padding: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceVariant,
    },
    detailLabel: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    detailValue: {
      color: theme.colors.onSurface,
      marginTop: 3,
      fontWeight: '700',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      borderRadius: 8,
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 14,
    },
    emptyContent: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 18,
    },
  });
}
