import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Card, Surface, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { scheduleApi } from '../api/schedule';
import { StaffScheduleAssignment } from '../types';
import { colors } from '../theme/colors';

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

export default function ScheduleScreen() {
  const [assignments, setAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekRange = useMemo(() => {
    const start = startOfWeek();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toDateInput(start), to: toDateInput(end) };
  }, []);

  const todayAssignments = assignments.filter((item) => item.workDate === toDateInput(new Date()));

  const loadSchedules = async () => {
    setError(null);
    try {
      const result = await scheduleApi.getMySchedules(weekRange.from, weekRange.to);
      setAssignments(result.items);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Khong the tai lich truc'));
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

  const renderAssignment = (item: StaffScheduleAssignment) => (
    <Card key={item.id} style={styles.assignmentCard}>
      <Card.Content>
        <View style={styles.assignmentHeader}>
          <View style={styles.assignmentTitleWrap}>
            <Text variant="titleSmall" style={styles.assignmentTitle}>
              {item.shift?.name || item.shiftId}
            </Text>
            <Text style={styles.assignmentMeta}>
              {item.workDate} · {normalizeTime(item.shift?.startTime)}-{normalizeTime(item.shift?.endTime)}
            </Text>
            <Text style={styles.assignmentMeta}>
              {item.zone?.zoneName || item.zoneId} · Tang {item.zone?.floor ?? '-'}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Surface style={styles.header} elevation={0}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="calendar-clock" size={28} color={colors.background} />
          </View>
          <View style={styles.headerText}>
            <Text variant="titleLarge" style={styles.headerTitle}>Lich truc</Text>
            <Text style={styles.headerSubtitle}>{weekRange.from} - {weekRange.to}</Text>
          </View>
        </Surface>

        {error ? (
          <Surface style={styles.errorCard} elevation={0}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </Surface>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="clock-check-outline" size={19} color={colors.primary} />
                <Text style={styles.sectionTitle}>Ca hom nay</Text>
              </View>
              {todayAssignments.length ? todayAssignments.map(renderAssignment) : (
                <Surface style={styles.emptyCard} elevation={0}>
                  <Text style={styles.emptyText}>Hom nay ban khong co ca truc.</Text>
                </Surface>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="calendar-week" size={19} color={colors.primary} />
                <Text style={styles.sectionTitle}>Lich tuan</Text>
              </View>
              {assignments.length ? assignments.map(renderAssignment) : (
                <Surface style={styles.emptyCard} elevation={0}>
                  <Text style={styles.emptyText}>Chua co lich trong tuan nay.</Text>
                </Surface>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    margin: 16,
    padding: 18,
    borderRadius: 12,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primary,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  errorCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 78, 78, 0.12)',
    flexDirection: 'row',
    gap: 10,
  },
  errorText: {
    color: colors.error,
    flex: 1,
  },
  loadingBox: {
    padding: 40,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  assignmentCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assignmentHeader: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  assignmentTitleWrap: {
    flex: 1,
  },
  assignmentTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  assignmentMeta: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyCard: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
