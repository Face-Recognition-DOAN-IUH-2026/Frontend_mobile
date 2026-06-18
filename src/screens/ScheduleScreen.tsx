import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, PanResponder, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Card, Chip, Snackbar, Text, useTheme } from 'react-native-paper';
import { scheduleApi } from '../api/schedule';
import AssignmentCard from '../components/AssignmentCard';
import { AppTheme } from '../theme/DarkTheme';
import { StaffScheduleAssignment } from '../types';
import { DAY_LABELS, formatViDate, getWeekDays, getWeekRange, toDateInput } from '../utils/dateUtils';

type AssignmentTimeState = 'now' | 'today' | 'upcoming' | 'past';
type TabFilter = 'all' | AssignmentTimeState;

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'now', label: 'Đang trực' },
  { key: 'today', label: 'Hôm nay' },
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'past', label: 'Đã qua' },
];

function getErrorMessage(err: any, fallback: string) {
  return err?.response?.data?.detail || err?.response?.data?.error || err?.message || fallback;
}

function getAssignmentTimeState(item: StaffScheduleAssignment): AssignmentTimeState {
  const now = new Date();
  const today = toDateInput(now);
  if (item.workDate < today) return 'past';
  if (item.workDate > today) return 'upcoming';
  const startTime = (item.shift?.startTime || '').slice(0, 5);
  const endTime = (item.shift?.endTime || '').slice(0, 5);
  if (startTime && endTime) {
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (currentTime >= startTime && currentTime <= endTime) return 'now';
  }
  return 'today';
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ScheduleScreen() {
  const theme = useTheme() as AppTheme;
  const [assignments, setAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const weekDays = useMemo(() => getWeekDays(), []);
  const weekRange = useMemo(() => getWeekRange(weekDays), [weekDays]);

  const todayStr = useMemo(() => toDateInput(new Date()), []);
  const todayIndex = useMemo(() => weekDays.indexOf(todayStr), [weekDays, todayStr]);
  const [currentIndex, setCurrentIndex] = useState<number>(todayIndex >= 0 ? todayIndex : 0);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentDate = weekDays[currentIndex];

  const groupedByDate = useMemo(() => {
    const map = new Map<string, StaffScheduleAssignment[]>();
    for (const day of weekDays) map.set(day, []);
    for (const item of assignments) {
      const list = map.get(item.workDate);
      if (list) list.push(item);
    }
    return map;
  }, [assignments, weekDays]);

  const filterByState = useCallback((items: StaffScheduleAssignment[]) => {
    if (activeTab === 'all') return items;
    return items.filter((item) => getAssignmentTimeState(item) === activeTab);
  }, [activeTab]);

  const currentAssignments = useMemo(
    () => filterByState(groupedByDate.get(currentDate) ?? []),
    [currentDate, groupedByDate, filterByState],
  );

  const counts = useMemo(() => {
    const c: Record<TabFilter, number> = { all: assignments.length, now: 0, today: 0, upcoming: 0, past: 0 };
    for (const item of assignments) {
      const state = getAssignmentTimeState(item);
      c[state]++;
    }
    return c;
  }, [assignments]);

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

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const goToDay = useCallback((index: number) => {
    if (index < 0 || index > 6) return;
    if (index === currentIndexRef.current) return;
    const direction = index > currentIndexRef.current ? 1 : -1;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: direction, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      setCurrentIndex(index);
      slideAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
    });
  }, [fadeAnim, slideAnim]);

  const navRef = useRef({ goPrev: () => {}, goNext: () => {} });
  navRef.current = {
    goPrev: () => goToDay(currentIndexRef.current - 1),
    goNext: () => goToDay(currentIndexRef.current + 1),
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 60) navRef.current.goPrev();
        else if (gs.dx < -60) navRef.current.goNext();
      },
    }),
  ).current;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={s.headerLeft}>
          <MaterialCommunityIcons name="calendar-clock" size={24} color={theme.colors.onPrimary} />
          <Text style={[s.headerTitle, { color: theme.colors.onSurface }]}>Lịch trực</Text>
        </View>
        <Text style={[s.headerRange, { color: theme.colors.onSurfaceVariant }]}>{weekRange.from} - {weekRange.to}</Text>
      </View>

      {/* Tab Bar */}
      <View style={[s.tabBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabContent}
          data={TABS}
          keyExtractor={(tab) => tab.key}
          renderItem={({ item: tab }) => {
            const count = counts[tab.key];
            const isActive = activeTab === tab.key;
            return (
              <Chip
                key={tab.key}
                selected={isActive}
                onPress={() => setActiveTab(tab.key)}
                mode={isActive ? 'flat' : 'outlined'}
                style={[s.tabChip, isActive && { backgroundColor: theme.colors.primaryContainer }]}
                textStyle={[s.tabChipText, isActive && { color: theme.colors.primary }]}
                compact
              >
                {tab.label} {count > 0 ? `(${count})` : ''}
              </Chip>
            );
          }}
        />
      </View>

      {/* Date Header */}
      <View style={[s.dateNav, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        <TouchableOpacity onPress={() => navRef.current.goPrev()} disabled={currentIndex <= 0} style={s.navBtn}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={26}
            color={currentIndex <= 0 ? theme.colors.outlineVariant : theme.colors.onSurface}
          />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={s.dateCenter}>
          <Text style={[s.dateLabel, { color: theme.colors.onSurface }]}>{formatViDate(currentDate)}</Text>
          <Text style={[s.dateSub, { color: theme.colors.onSurfaceVariant }]}>
            {currentDate === todayStr ? 'Hôm nay' : currentDate}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navRef.current.goNext()} disabled={currentIndex >= 6} style={s.navBtn}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={26}
            color={currentIndex >= 6 ? theme.colors.outlineVariant : theme.colors.onSurface}
          />
        </TouchableOpacity>
      </View>

      {/* Week Indicator */}
      <View style={[s.weekDots, { backgroundColor: theme.colors.surface }]}>
        {weekDays.map((date, idx) => {
          const isActive = idx === currentIndex;
          const isToday = date === todayStr;
          return (
            <TouchableOpacity key={date} onPress={() => goToDay(idx)} activeOpacity={0.7} style={s.dotTouch}>
              <View
                style={[
                  s.dot,
                  {
                    backgroundColor: isActive
                      ? theme.colors.primary
                      : isToday
                        ? theme.colors.primaryContainer
                        : theme.colors.surfaceVariant,
                    width: isActive ? 28 : 10,
                    height: isActive ? 8 : 8,
                    borderRadius: isActive ? 4 : 4,
                  },
                ]}
              />
              <Text style={[s.dotLabel, { color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                {DAY_LABELS[idx]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error */}
      {error ? (
        <Card mode="outlined" style={[s.errorCard, { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error }]}>
          <Card.Content style={s.errorContent}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={theme.colors.error} />
            <Text style={[s.errorText, { color: theme.colors.error }]} selectable>{error}</Text>
          </Card.Content>
        </Card>
      ) : null}

      {/* Day Content */}
      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <Animated.View
          style={[s.dayContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [SCREEN_WIDTH * 0.3, 0, -SCREEN_WIDTH * 0.3] }) }] }]}
          {...panResponder.panHandlers}
        >
          <FlatList
            data={currentAssignments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AssignmentCard
                item={item}
                onCheckIn={(id) => runAttendanceAction(id, 'check-in')}
                onCheckOut={(id) => runAttendanceAction(id, 'check-out')}
                actionLoadingId={actionLoadingId}
              />
            )}
            contentContainerStyle={s.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={s.emptyBox}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={theme.colors.outlineVariant} />
                <Text style={[s.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                  {activeTab === 'all' ? 'Ngày này không có ca trực.' : `Không có ca "${TABS.find((t) => t.key === activeTab)?.label}".`}
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
          />
        </Animated.View>
      )}

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}
        style={s.snackbar}
      >
        {snackbar}
      </Snackbar>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontWeight: '900',
    fontSize: 18,
  },
  headerRange: {
    fontSize: 12,
  },
  tabBar: {
    borderBottomWidth: 1,
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
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  dateCenter: {
    alignItems: 'center',
    flex: 1,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '900',
  },
  dateSub: {
    fontSize: 11,
    marginTop: 2,
  },
  weekDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dotTouch: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    minWidth: 36,
  },
  dot: {
    borderRadius: 4,
  },
  dotLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  errorCard: {
    margin: 16,
  },
  errorContent: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  errorText: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  snackbar: {
    top: 60,
  },
});
