import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Modal, PanResponder, RefreshControl, ScrollView, SectionList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import * as Location from 'expo-location';
import { scheduleApi } from '../api/schedule';
import AssignmentCard from '../components/AssignmentCard';
import { StaffScheduleAssignment } from '../types';
import { DAY_LABELS, startOfWeek, toDateInput } from '../utils/dateUtils';
import { AppTheme } from '../theme/DarkTheme';
import { devError } from '../utils/logger';
import CacheManager from '../utils/cache/CacheManager';
import { CACHE_KEYS, CACHE_TTL } from '../utils/cache/CacheKeys';
import { getAssignmentTimeState, AssignmentTimeState } from '../utils/assignmentUtils';
import { GradientHeader, EmptyState, GRADIENTS } from '../theme/MobileDesignSystem';
import { NoticeSnackbar } from '../components/NoticeSnackbar';
import { LoadingOverlay } from '../components/LoadingOverlay';

function getErrorMessage(err: any, fallback: string) {
  return err?.response?.data?.detail || err?.response?.data?.error || err?.message || fallback;
}

function zoneLabel(item: StaffScheduleAssignment) {
  if (!item.zone) return item.zoneId;
  const zoneName = item.zone.zoneName || '';
  const compact = zoneName.match(/^(Tang|Tầng)\s*(\d+)/i);
  return compact ? `Tầng ${compact[2]}` : zoneName || `Tầng ${item.zone.floor ?? '-'}`;
}

interface ShiftSection {
  title: string;
  state: AssignmentTimeState;
  statusLabel: string;
  data: StaffScheduleAssignment[];
}

interface DaySection {
  title: string;
  date: string;
  state: AssignmentTimeState;
  statusLabel: string;
  data: ShiftSection[];
}

function getWeekDaysFromRef(dateStr: string): string[] {
  const start = startOfWeek(new Date(dateStr + 'T00:00:00'));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toDateInput(d);
  });
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const grid: (number | null)[] = [];
  const prevCount = startDow === 0 ? 6 : startDow - 1;

  for (let i = prevCount - 1; i >= 0; i--) grid.push(-(daysInPrev - i));
  for (let i = 1; i <= daysInMonth; i++) grid.push(i);
  while (grid.length % 7 !== 0) grid.push(null);

  return grid;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const VI_MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const VI_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VIEW_MODES = ['Ngày', 'Tuần', 'Tháng'] as const;

export default function ScheduleScreen() {
  const { colors: c } = useTheme<AppTheme>();
  const navigation = useNavigation<any>();

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1 },
    contentFlex: { flex: 1 },
    scrollFlex: { flexGrow: 1 },
    emptyContentStyle: { flexGrow: 1, justifyContent: 'center', padding: 16 },
    segmentedWrap: { paddingHorizontal: 16, paddingVertical: 10 },
    segmentedBg: { flexDirection: 'row', borderRadius: 10, padding: 3 },
    segmentedBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    segmentedText: { fontSize: 14, fontWeight: '600' },
    dateRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
    dateDropdown: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { fontSize: 16, fontWeight: '700' },
    errorBox: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 16 },
    errorText: { flex: 1, fontSize: 14 },
    listContent: { padding: 16, paddingBottom: 80 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4, marginBottom: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '900', flex: 1 },
    sectionStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionDot: { width: 8, height: 8, borderRadius: 4 },
    sectionStatusText: { fontSize: 12, fontWeight: '700' },
    pillStrip: { borderBottomWidth: 1, paddingVertical: 10 },
    pillContent: { flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
    pill: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, minWidth: 52, gap: 2 },
    pillLabel: { fontSize: 11, fontWeight: '700' },
    pillDate: { fontSize: 15, fontWeight: '700' },
    pillBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    pillBadgeText: { fontSize: 10, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: SCREEN_WIDTH - 48, borderRadius: 16, padding: 20, paddingBottom: 12 },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, marginBottom: 12 },
    monthNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
    monthNavTitle: { fontSize: 16, fontWeight: '800' },
    calendarWrap: { marginBottom: 16, gap: 4 },
    calendarGrid: { gap: 4 },
    calRow: { flexDirection: 'row' },
    calCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, minHeight: 40 },
    calDayHeader: { fontSize: 12, fontWeight: '700' },
    calDayNum: { fontSize: 14, fontWeight: '600' },
    calDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
    todayBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
    todayBtnText: { fontSize: 14, fontWeight: '700' },
    daySection: { marginBottom: 4 },
    daySectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 6 },
    daySectionTitle: { fontSize: 15, fontWeight: '900', flex: 1 },
    shiftSection: { marginBottom: 4 },
    shiftSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 8, marginBottom: 4 },
    shiftSectionTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  }), [c]);

  const [assignments, setAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const [viewMode, setViewMode] = useState<(typeof VIEW_MODES)[number]>('Ngày');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  const todayStr = useMemo(() => toDateInput(new Date()), []);
  const [referenceDate, setReferenceDate] = useState(todayStr);

  const weekDays = useMemo(() => getWeekDaysFromRef(referenceDate), [referenceDate]);
  const weekRange = useMemo(() => ({ from: weekDays[0], to: weekDays[6] }), [weekDays]);
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

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of assignments) {
      counts[item.workDate] = (counts[item.workDate] || 0) + 1;
    }
    return counts;
  }, [assignments]);

  const shiftSections = useMemo((): ShiftSection[] => {
    const dayItems = groupedByDate.get(currentDate) ?? [];
    const groups = new Map<string, StaffScheduleAssignment[]>();
    for (const item of dayItems) {
      const key = item.shift?.name || item.shiftId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    const sections: ShiftSection[] = [];
    for (const [shiftName, items] of groups) {
      const shift = items[0].shift;
      const timeRange = shift ? `${(shift.startTime || '').slice(0, 5)}-${(shift.endTime || '').slice(0, 5)}` : '';
      const states = items.map(getAssignmentTimeState);
      const sectionState: AssignmentTimeState = states.includes('now')
        ? 'now' : states.includes('today') ? 'today' : states.includes('upcoming') ? 'upcoming' : 'past';
      items.sort((a, b) => (a.zone?.zoneName || '').localeCompare(b.zone?.zoneName || ''));
      sections.push({
        title: timeRange ? `${shiftName} · ${timeRange}` : shiftName,
        state: sectionState,
        statusLabel: sectionState === 'now' ? 'Đang trực' : sectionState === 'today' ? 'Hôm nay' : sectionState === 'upcoming' ? 'Sắp tới' : 'Đã qua',
        data: items,
      });
    }
    const order = { now: 0, today: 1, upcoming: 2, past: 3 };
    sections.sort((a, b) => order[a.state] - order[b.state]);
    return sections;
  }, [currentDate, groupedByDate]);

  // Week view: all 7 days with day headers, assignments grouped by shift within each day
  const weekAllSections = useMemo((): DaySection[] => {
    const order = { now: 0, today: 1, upcoming: 2, past: 3 };
    return weekDays.map((date) => {
      const dayItems = groupedByDate.get(date) ?? [];
      const groups = new Map<string, StaffScheduleAssignment[]>();
      for (const item of dayItems) {
        const key = item.shift?.name || item.shiftId;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }
      const shiftSections: ShiftSection[] = [];
      for (const [shiftName, items] of groups) {
        const shift = items[0].shift;
        const timeRange = shift ? `${(shift.startTime || '').slice(0, 5)}-${(shift.endTime || '').slice(0, 5)}` : '';
        const states = items.map(getAssignmentTimeState);
        const sectionState: AssignmentTimeState = states.includes('now') ? 'now' : states.includes('today') ? 'today' : states.includes('upcoming') ? 'upcoming' : 'past';
        items.sort((a, b) => (a.zone?.zoneName || '').localeCompare(b.zone?.zoneName || ''));
        shiftSections.push({
          title: timeRange ? `${shiftName} · ${timeRange}` : shiftName,
          state: sectionState,
          statusLabel: sectionState === 'now' ? 'Đang trực' : sectionState === 'today' ? 'Hôm nay' : sectionState === 'upcoming' ? 'Sắp tới' : 'Đã qua',
          data: items,
        });
      }
      shiftSections.sort((a, b) => order[a.state] - order[b.state]);

      const dayState: AssignmentTimeState = shiftSections.length === 0 ? 'past'
        : shiftSections.some(s => s.state === 'now') ? 'now'
        : shiftSections.some(s => s.state === 'today') ? 'today'
        : shiftSections.some(s => s.state === 'upcoming') ? 'upcoming'
        : 'past';

      const d = new Date(date + 'T00:00:00');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');

      return {
        title: `${DAY_LABELS[d.getDay()]}, ${dayNum}/${monthNum}`,
        date,
        state: dayState,
        statusLabel: dayState === 'now' ? 'Đang trực' : dayState === 'today' ? 'Hôm nay' : dayState === 'upcoming' ? 'Sắp tới' : 'Đã qua',
        data: shiftSections,
      };
    });
  }, [weekDays, groupedByDate]);

  // Month view: days in month that have assignments
  const monthSections = useMemo((): DaySection[] => {
    const sections: DaySection[] = [];
    const order = { now: 0, today: 1, upcoming: 2, past: 3 };

    // First pass: collect raw items by date
    const itemsByDate = new Map<string, StaffScheduleAssignment[]>();
    for (const item of assignments) {
      const d = new Date(item.workDate + 'T00:00:00');
      if (d.getMonth() === pickerMonth && d.getFullYear() === pickerYear) {
        const dateStr = item.workDate;
        if (!itemsByDate.has(dateStr)) itemsByDate.set(dateStr, []);
        itemsByDate.get(dateStr)!.push(item);
      }
    }

    // Second pass: build DaySections with grouped shifts
    for (const [dateStr, items] of itemsByDate) {
      const d = new Date(dateStr + 'T00:00:00');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');

      const groups = new Map<string, StaffScheduleAssignment[]>();
      for (const item of items) {
        const key = item.shift?.name || item.shiftId;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }

      const shiftSecs: ShiftSection[] = [];
      for (const [shiftName, shiftItems] of groups) {
        const shift = shiftItems[0].shift;
        const timeRange = shift ? `${(shift.startTime || '').slice(0, 5)}-${(shift.endTime || '').slice(0, 5)}` : '';
        const states = shiftItems.map(getAssignmentTimeState);
        const sectionState: AssignmentTimeState = states.includes('now') ? 'now' : states.includes('today') ? 'today' : states.includes('upcoming') ? 'upcoming' : 'past';
        shiftItems.sort((a, b) => (a.zone?.zoneName || '').localeCompare(b.zone?.zoneName || ''));
        shiftSecs.push({
          title: timeRange ? `${shiftName} · ${timeRange}` : shiftName,
          state: sectionState,
          statusLabel: sectionState === 'now' ? 'Đang trực' : sectionState === 'today' ? 'Hôm nay' : sectionState === 'upcoming' ? 'Sắp tới' : 'Đã qua',
          data: shiftItems,
        });
      }
      shiftSecs.sort((a, b) => order[a.state] - order[b.state]);

      const dayState: AssignmentTimeState = shiftSecs.length === 0 ? 'past'
        : shiftSecs.some(s => s.state === 'now') ? 'now'
        : shiftSecs.some(s => s.state === 'today') ? 'today'
        : shiftSecs.some(s => s.state === 'upcoming') ? 'upcoming'
        : 'past';

      sections.push({
        title: `${DAY_LABELS[d.getDay()]}, ${dayNum}/${monthNum}`,
        date: dateStr,
        state: dayState,
        statusLabel: dayState === 'now' ? 'Đang trực' : dayState === 'today' ? 'Hôm nay' : dayState === 'upcoming' ? 'Sắp tới' : 'Đã qua',
        data: shiftSecs,
      });
    }
    return sections;
  }, [assignments, pickerMonth, pickerYear]);

  const loadSchedules = useCallback(async (isRefresh?: boolean) => {
    if (!isRefresh) { setLoading(true); }
    setError(null);
    
    const cache = CacheManager.getInstance();
    const cacheKey = `${CACHE_KEYS.SCHEDULE}_${weekRange.from}_${weekRange.to}`;
    
    try {
      const cached = await cache.get<{ items: StaffScheduleAssignment[] }>(cacheKey);
      if (cached) {
        setAssignments(cached.items);
        setLoading(false);
      }

      try {
        const result = await scheduleApi.getMySchedules(weekRange.from, weekRange.to);
        setAssignments(result.items);
        await cache.set(cacheKey, result, CACHE_TTL.SCHEDULE);
      } catch (err: any) {
        if (!cached) {
          const msg = getErrorMessage(err, 'Không thể tải lịch trực');
          devError('[Schedule] loadSchedules error:', msg, err?.response?.status, err?.message);
          setError(msg);
        }
      } finally {
        if (!isRefresh) { setLoading(false); }
      }
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Không thể tải lịch trực');
      devError('[Schedule] loadSchedules error:', msg, err?.response?.status, err?.message);
      setError(msg);
    } finally {
      if (!isRefresh) { setLoading(false); }
    }
  }, [weekRange.from, weekRange.to]);

  useFocusEffect(useCallback(() => { loadSchedules(); }, [loadSchedules]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedules(true);
    setRefreshing(false);
  };

  const runAttendanceAction = async (id: string, action: 'check-in' | 'check-out') => {
    setActionLoadingId(`${id}:${action}`);
    setError(null);
    try {
      if (action === 'check-in') {
        let lat: number | undefined;
        let lng: number | undefined;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          }
        } catch (locErr) {
          devError('[ScheduleScreen] Location error:', locErr);
        }
        await scheduleApi.checkIn(id, lat, lng);
        setSnackbar('Đã check-in thành công');
      } else {
        await scheduleApi.checkOut(id);
        setSnackbar('Đã check-out thành công');
      }
      await loadSchedules();
    } catch (err: any) {
      setError(getErrorMessage(err, action === 'check-in' ? 'Check-in thất bại' : 'Check-out thất bại'));
    } finally { setActionLoadingId(null); }
  };

  const handleRequestManualCheckIn = async (assignmentId: string) => {
    setActionLoadingId(`${assignmentId}:manual-checkin`);
    setError(null);
    try {
      await scheduleApi.requestManualCheckIn(assignmentId);
      setSnackbar('Đã gửi yêu cầu check-in thủ công');
      await loadSchedules();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Gửi yêu cầu check-in thủ công thất bại'));
    } finally { setActionLoadingId(null); }
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

  const currentDateFormatted = useMemo(() => {
    const d = new Date(currentDate + 'T00:00:00');
    const dayLabel = DAY_LABELS[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `Th ${dayLabel}, ${day}/${month}/${year}`;
  }, [currentDate]);

  const handleViewModeChange = (mode: (typeof VIEW_MODES)[number]) => {
    setViewMode(mode);
    if (mode === 'Tháng') {
      const d = new Date(currentDate + 'T00:00:00');
      setPickerMonth(d.getMonth());
      setPickerYear(d.getFullYear());
    }
  };

  const handleDatePicked = (dateStr: string) => {
    const idx = weekDays.indexOf(dateStr);
    if (idx >= 0) {
      setCurrentIndex(idx);
      setViewMode('Ngày');
      setShowDatePicker(false);
    } else {
      const newWeekDays = getWeekDaysFromRef(dateStr);
      const newIdx = newWeekDays.indexOf(dateStr);
      setCurrentIndex(newIdx >= 0 ? newIdx : 0);
      setReferenceDate(dateStr);
      setViewMode('Ngày');
      setShowDatePicker(false);
    }
  };

  // Month calendar data
  const monthGrid = useMemo(() => getMonthGrid(pickerYear, pickerMonth), [pickerYear, pickerMonth]);

  const monthAssignmentMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    for (const item of assignments) {
      const d = new Date(item.workDate + 'T00:00:00');
      if (d.getMonth() === pickerMonth && d.getFullYear() === pickerYear) {
        map[d.getDate()] = true;
      }
    }
    return map;
  }, [assignments, pickerMonth, pickerYear]);

  // Helpers
  function renderEmptyState(message?: string) {
    return (
      <EmptyState
        icon="folder-open-outline"
        title="Không có dữ liệu"
        description={message || 'Ngày này không có lịch trực'}
      />
    );
  }

  function renderMainList() {
    const listSections = shiftSections;

    const flatItems = listSections
      .flatMap(sec => sec.data.map(item => ({ ...item, _shiftName: sec.title.split(' · ')[0], _shiftTime: sec.title.split(' · ')[1] || '' })))
      .sort((a, b) => {
        const aStart = a.shift?.startTime || '';
        const bStart = b.shift?.startTime || '';
        return aStart.localeCompare(bStart);
      });

    if (flatItems.length === 0) {
      return (
        <ScrollView contentContainerStyle={s.emptyContentStyle} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
          {renderEmptyState()}
        </ScrollView>
      );
    }

    const d = new Date(currentDate + 'T00:00:00');
    const dayLabel = `${VI_DAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    return (
      <FlatList
        data={flatItems}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={[s.daySectionHeader, { backgroundColor: c.surfaceVariant, marginBottom: 12 }]}>
            <Text style={[s.daySectionTitle, { color: c.primary }]}>{dayLabel}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <AssignmentCard
            item={item}
            onCheckIn={(id) => runAttendanceAction(id, 'check-in')}
            onCheckOut={(id) => runAttendanceAction(id, 'check-out')}
            onRequestManualCheckIn={handleRequestManualCheckIn}
            actionLoadingId={actionLoadingId}
            shiftLabel={item._shiftName}
            shiftTime={item._shiftTime}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      />
    );
  }

  // Render day section with nested shift grouping (for week/month views)
  function renderDaySection(section: DaySection, sectionIdx: number) {
    if (section.data.length === 0) return null;

    const d = new Date(section.date + 'T00:00:00');
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const order = { now: 0, today: 1, upcoming: 2, past: 3 };

    const flatItems = section.data
      .flatMap(dayShift => dayShift.data.map(item => ({ ...item, _shiftName: dayShift.title.split(' · ')[0], _shiftTime: dayShift.title.split(' · ')[1] || '' })))
      .sort((a, b) => {
        const aStart = a.shift?.startTime || '';
        const bStart = b.shift?.startTime || '';
        return aStart.localeCompare(bStart);
      });

    return (
      <View key={section.date} style={s.daySection}>
        <View style={[s.daySectionHeader, { backgroundColor: c.surfaceVariant }]}>
          <Text style={[s.daySectionTitle, { color: c.primary }]}>{section.title}</Text>
        </View>
        {flatItems.map((item) => (
          <AssignmentCard
            key={item.id}
            item={item}
            onCheckIn={(id) => runAttendanceAction(id, 'check-in')}
            onCheckOut={(id) => runAttendanceAction(id, 'check-out')}
            onRequestManualCheckIn={handleRequestManualCheckIn}
            actionLoadingId={actionLoadingId}
            shiftLabel={item._shiftName}
            shiftTime={item._shiftTime}
          />
        ))}
      </View>
    );
  }

  function renderWeekList() {
    const daysWithData = weekAllSections.filter(d => d.data.length > 0);
    if (daysWithData.length === 0) {
      return (
        <ScrollView contentContainerStyle={s.scrollFlex} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
          {renderEmptyState()}
        </ScrollView>
      );
    }
    return (
      <FlatList
        data={weekAllSections}
        keyExtractor={(item) => item.date}
        renderItem={({ item, index }) => renderDaySection(item, index)}
        ListHeaderComponent={
          <View style={[s.pillStrip, { backgroundColor: c.surface, borderBottomColor: c.divider }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillContent}>
              {weekDays.map((date, idx) => {
                const isSelected = idx === currentIndex;
                const isTodayDate = date === todayStr;
                const count = dayCounts[date] || 0;
                return (
                  <TouchableOpacity
                    key={date}
                    onPress={() => { setCurrentIndex(idx); }}
                    activeOpacity={0.7}
                    style={[s.pill, { backgroundColor: isSelected ? c.primary : c.surfaceVariant, borderColor: isTodayDate && !isSelected ? c.primary : 'transparent' }]}
                  >
                    <Text style={[s.pillLabel, { color: isSelected ? c.onPrimary : c.primary }]}>{DAY_LABELS[idx]}</Text>
                    <Text style={[s.pillDate, { color: isSelected ? c.onPrimary : c.primary }, isTodayDate && !isSelected && { fontWeight: '900' }]}>{date.slice(8, 10)}</Text>
                    {count > 0 ? (
                      <View style={[s.pillBadge, { backgroundColor: isSelected ? c.onPrimary : c.primary }]}>
                        <Text style={[s.pillBadgeText, { color: isSelected ? c.primary : c.onPrimary }]}>{count}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      />
    );
  }

  function renderMonthList() {
    const monthHasAssignments = new Set(monthSections.map(s => s.date));

    function renderCalendarGrid() {
      return (
        <View style={[s.calendarWrap, { backgroundColor: c.surface }]}>
          <View style={s.calRow}>
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
              <View key={d} style={s.calCell}><Text style={[s.calDayHeader, { color: c.primary }]}>{d}</Text></View>
            ))}
          </View>
          {Array.from({ length: Math.ceil(monthGrid.length / 7) }, (_, rowIdx) => (
            <View key={rowIdx} style={s.calRow}>
              {monthGrid.slice(rowIdx * 7, (rowIdx + 1) * 7).map((day, colIdx) => {
                if (day === null) return <View key={`e-${colIdx}`} style={s.calCell} />;
                const isCurrentMonth = day > 0;
                const dateStr = isCurrentMonth
                  ? `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  : '';
                const isToday = dateStr === todayStr;
                const hasAssignments = monthHasAssignments.has(dateStr);
                return (
                  <TouchableOpacity
                    key={`d-${day}`}
                    style={[s.calCell, isToday && { borderWidth: 1.5, borderColor: c.primary, borderRadius: 8 }]}
                    onPress={() => { if (dateStr && hasAssignments) handleDatePicked(dateStr); }}
                    disabled={!isCurrentMonth || !hasAssignments}
                  >
                    <Text style={[s.calDayNum, {
                      color: isCurrentMonth ? (hasAssignments ? c.primary : c.onSurface) : c.outline,
                      fontWeight: isToday ? '900' : hasAssignments ? '700' : '400',
                    }]}>
                      {isCurrentMonth ? day : Math.abs(day)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      );
    }

    if (monthSections.length === 0) {
      return (
        <ScrollView contentContainerStyle={s.scrollFlex} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
          {renderCalendarGrid()}
          {renderEmptyState('Tháng này không có ca trực')}
        </ScrollView>
      );
    }
    return (
      <FlatList
        data={monthSections}
        keyExtractor={(item) => item.date}
        renderItem={({ item, index }) => renderDaySection(item, index)}
        ListHeaderComponent={
          <View>
            <View style={[s.monthNav, { backgroundColor: c.surface, borderBottomColor: c.divider }]}>
              <TouchableOpacity onPress={() => { if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(py => py - 1); } else setPickerMonth(pm => pm - 1); }} style={s.monthNavBtn}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={c.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowDatePicker(true); }}>
                <Text style={[s.monthNavTitle, { color: c.onSurface }]}>{VI_MONTHS[pickerMonth]} {pickerYear}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { if (pickerMonth === 11) { setPickerMonth(0); setPickerYear(py => py + 1); } else setPickerMonth(pm => pm + 1); }} style={s.monthNavBtn}>
                <MaterialCommunityIcons name="chevron-right" size={22} color={c.onSurface} />
              </TouchableOpacity>
            </View>
            {renderCalendarGrid()}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      />
    );
  }

  function renderWeekStrip(activeIdx: number, onSelect: (idx: number) => void) {
    return (
      <View style={[s.pillStrip, { backgroundColor: c.surface, borderBottomColor: c.divider }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillContent}>
          {weekDays.map((date, idx) => {
            const isSelected = idx === activeIdx;
            const isTodayDate = date === todayStr;
            const count = dayCounts[date] || 0;
            return (
              <TouchableOpacity
                key={date}
                onPress={() => onSelect(idx)}
                activeOpacity={0.7}
                style={[
                  s.pill,
                  {
                    backgroundColor: isSelected ? c.primary : c.surfaceVariant,
                    borderColor: isTodayDate && !isSelected ? c.primary : 'transparent',
                  },
                ]}
              >
                <Text style={[s.pillLabel, { color: isSelected ? c.onPrimary : c.onSurfaceVariant }]}>
                  {DAY_LABELS[idx]}
                </Text>
                <Text style={[s.pillDate, { color: isSelected ? c.onPrimary : c.onSurface }, isTodayDate && !isSelected && { color: c.primary, fontWeight: '900' }]}>
                  {date.slice(8, 10)}
                </Text>
                {count > 0 ? (
                  <View style={[s.pillBadge, { backgroundColor: isSelected ? c.onPrimary : c.primary }]}>
                    <Text style={[s.pillBadgeText, { color: isSelected ? c.primary : c.onPrimary }]}>{count}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <GradientHeader
        title="Lịch trực"
        subtitle={assignments.length > 0 ? `${assignments.length} ca trực` : 'Không có ca trực'}
        icon="calendar-clock"
      />

      {/* Segmented Control */}
      <View style={[s.segmentedWrap, { backgroundColor: c.surface }]}>
        <View style={[s.segmentedBg, { backgroundColor: c.surfaceVariant }]}>
          {VIEW_MODES.map((mode) => {
            const active = viewMode === mode;
            return (
              <TouchableOpacity key={mode} onPress={() => handleViewModeChange(mode)} style={[s.segmentedBtn, active && { backgroundColor: c.primary }]}>
                <Text style={[s.segmentedText, { color: active ? c.onPrimary : c.onSurfaceVariant }, active && { fontWeight: '700' }]}>{mode}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Date Dropdown */}
      {viewMode !== 'Tháng' ? (
        <View style={[s.dateRow, { backgroundColor: c.surface, borderBottomColor: c.divider }]}>
          <TouchableOpacity style={s.dateDropdown} onPress={() => { setShowDatePicker(true); const d = new Date(currentDate + 'T00:00:00'); setPickerMonth(d.getMonth()); setPickerYear(d.getFullYear()); }}>
            <Text style={[s.dateText, { color: c.onSurface }]}>{currentDateFormatted}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={c.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.surface }}>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.primary + '15', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: c.primary + '30' }}
          onPress={() => navigation.navigate('Availability')}
        >
          <MaterialCommunityIcons name="calendar-remove" size={16} color={c.primary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: c.primary }}>Xin nghỉ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f59e0b15', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f59e0b30' }}
          onPress={() => navigation.navigate('OpenShifts')}
        >
          <MaterialCommunityIcons name="clock-outline" size={16} color="#f59e0b" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#f59e0b' }}>Ca trống</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#8b5cf615', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#8b5cf630' }}
          onPress={() => navigation.navigate('MySwaps')}
        >
          <MaterialCommunityIcons name="swap-horizontal" size={16} color="#8b5cf6" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#8b5cf6' }}>Đổi ca</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <LoadingOverlay loading message="Đang tải lịch trực..." />
      ) : error ? (
        <View style={s.errorBox}><MaterialCommunityIcons name="alert-circle-outline" size={22} color={c.error} /><Text style={[s.errorText, { color: c.error }]} selectable>{error}</Text></View>
      ) : viewMode === 'Ngày' ? (
        <Animated.View style={[s.contentFlex, { opacity: fadeAnim, transform: [{ translateX: slideAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [SCREEN_WIDTH * 0.3, 0, -SCREEN_WIDTH * 0.3] }) }] }]} {...panResponder.panHandlers}>
          {renderMainList()}
        </Animated.View>
      ) : viewMode === 'Tuần' ? (
        renderWeekList()
      ) : (
        /* Tháng view */
        renderMonthList()
      )}

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <View style={[s.modalContent, { backgroundColor: c.surface }]}>
            <View style={[s.monthNav, { borderBottomColor: c.divider }]}>
              <TouchableOpacity onPress={() => { if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(py => py - 1); } else setPickerMonth(pm => pm - 1); }} style={s.monthNavBtn}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={c.onSurface} />
              </TouchableOpacity>
              <Text style={[s.monthNavTitle, { color: c.onSurface }]}>{VI_MONTHS[pickerMonth]} {pickerYear}</Text>
              <TouchableOpacity onPress={() => { if (pickerMonth === 11) { setPickerMonth(0); setPickerYear(py => py + 1); } else setPickerMonth(pm => pm + 1); }} style={s.monthNavBtn}>
                <MaterialCommunityIcons name="chevron-right" size={22} color={c.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={s.calendarGrid}>
              <View style={s.calRow}>
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                  <View key={d} style={s.calCell}><Text style={[s.calDayHeader, { color: c.onSurfaceVariant }]}>{d}</Text></View>
                ))}
              </View>
              {Array.from({ length: Math.ceil(monthGrid.length / 7) }, (_, rowIdx) => (
                <View key={rowIdx} style={s.calRow}>
                  {monthGrid.slice(rowIdx * 7, (rowIdx + 1) * 7).map((day, colIdx) => {
                    if (day === null) return <View key={`e-${colIdx}`} style={s.calCell} />;
                    const isCurrentMonth = day > 0;
                    const dateStr = isCurrentMonth
                      ? `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      : '';
                    const isToday = dateStr === todayStr;
                    return (
                      <TouchableOpacity
                        key={`d-${day}`}
                        style={[s.calCell, isToday && { borderWidth: 1, borderColor: c.primary, borderRadius: 8 }]}
                        onPress={() => { if (dateStr) handleDatePicked(dateStr); }}
                        disabled={!isCurrentMonth}
                      >
                        <Text style={[s.calDayNum, { color: isCurrentMonth ? c.onSurface : c.outline }, isToday && { color: c.primary, fontWeight: '900' }]}>
                          {isCurrentMonth ? day : Math.abs(day)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
            <TouchableOpacity style={[s.todayBtn, { borderColor: c.primary }]} onPress={() => handleDatePicked(todayStr)}>
              <Text style={[s.todayBtnText, { color: c.primary }]}>Hôm nay</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <NoticeSnackbar
        visible={!!snackbar}
        message={snackbar}
        severity="success"
        onDismiss={() => setSnackbar('')}
      />
    </SafeAreaView>
  );
}


