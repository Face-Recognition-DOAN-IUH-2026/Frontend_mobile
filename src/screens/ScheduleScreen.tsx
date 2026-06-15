import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Card, Chip, Surface, Text, TextInput } from 'react-native-paper';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(toDateInput(new Date()));
  const [dateTo, setDateTo] = useState(toDateInput(new Date()));
  const [reason, setReason] = useState('');

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

  const runAction = async (id: string, action: 'confirm' | 'check-in' | 'check-out') => {
    setSaving(true);
    setError(null);
    try {
      if (action === 'confirm') await scheduleApi.confirmAssignment(id);
      if (action === 'check-in') await scheduleApi.checkIn(id);
      if (action === 'check-out') await scheduleApi.checkOut(id);
      await loadSchedules();
    } catch (err: any) {
      Alert.alert('Khong the cap nhat', getErrorMessage(err, 'Thao tac that bai'));
    } finally {
      setSaving(false);
    }
  };

  const submitAvailability = async () => {
    if (!dateFrom || !dateTo) {
      Alert.alert('Thieu ngay', 'Vui long nhap khoang ngay nghi');
      return;
    }
    setSaving(true);
    try {
      await scheduleApi.requestAvailability(dateFrom, dateTo, reason);
      setReason('');
      Alert.alert('Da gui yeu cau', 'Quan tri vien se duyet lich nghi cua ban');
    } catch (err: any) {
      Alert.alert('Khong the gui', getErrorMessage(err, 'Gui yeu cau that bai'));
    } finally {
      setSaving(false);
    }
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
          <Chip compact style={styles.statusChip} textStyle={styles.statusChipText}>
            {item.status}
          </Chip>
        </View>
        <View style={styles.actionRow}>
          <Button
            mode="outlined"
            compact
            disabled={saving}
            onPress={() => runAction(item.id, 'confirm')}
            textColor={colors.text}
            style={styles.outlineButton}
          >
            Xac nhan
          </Button>
          <Button
            mode="contained"
            compact
            disabled={saving}
            onPress={() => runAction(item.id, 'check-in')}
            buttonColor={colors.success}
          >
            Check-in
          </Button>
          <Button
            mode="contained"
            compact
            disabled={saving}
            onPress={() => runAction(item.id, 'check-out')}
            buttonColor={colors.warning}
            textColor={colors.background}
          >
            Check-out
          </Button>
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

            <Surface style={styles.availabilityCard} elevation={0}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="calendar-remove-outline" size={19} color={colors.primary} />
                <Text style={styles.sectionTitle}>Dang ky ngay nghi</Text>
              </View>
              <TextInput
                label="Tu ngay (YYYY-MM-DD)"
                value={dateFrom}
                onChangeText={setDateFrom}
                mode="outlined"
                style={styles.input}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              <TextInput
                label="Den ngay (YYYY-MM-DD)"
                value={dateTo}
                onChangeText={setDateTo}
                mode="outlined"
                style={styles.input}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              <TextInput
                label="Ly do"
                value={reason}
                onChangeText={setReason}
                mode="outlined"
                multiline
                style={styles.input}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              <Button mode="contained" onPress={submitAvailability} loading={saving} disabled={saving} buttonColor={colors.primary} textColor={colors.background}>
                Gui yeu cau
              </Button>
            </Surface>
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
  statusChip: {
    backgroundColor: colors.surfaceVariant,
  },
  statusChipText: {
    color: colors.primary,
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  outlineButton: {
    borderColor: colors.border,
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
  availabilityCard: {
    marginHorizontal: 16,
    marginBottom: 28,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
});
