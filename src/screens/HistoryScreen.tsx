import React, { useState, useCallback, useMemo } from 'react';
import { View, Image, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Button, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { borrowApi } from '../api/borrow';
import { BorrowRecord } from '../types';
import { AppTheme } from '../theme/DarkTheme';
import { formatDate, getDaysUntil } from '../utils/dateUtils';
import { devError } from '../utils/logger';
import CacheManager from '../utils/cache/CacheManager';
import { CACHE_KEYS, CACHE_TTL } from '../utils/cache/CacheKeys';
import {
  GradientHeader,
  SectionCard,
  FilterPill,
  EmptyState,
  StatCard,
  GRADIENTS,
} from '../theme/MobileDesignSystem';

interface HistoryScreenProps {
  navigation: any;
}

type FilterTab = 'all' | 'borrowed' | 'returned';

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'borrowed', label: 'Đang mượn' },
  { key: 'returned', label: 'Đã trả' },
];

const RECORD_SPINE_COLORS = {
  borrowed: GRADIENTS.indigo[0],
  overdue: GRADIENTS.red[0],
  returned: GRADIENTS.amber[0],
};

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoadError(null);

      const cache = CacheManager.getInstance();
      const cached = await cache.get<BorrowRecord[]>(CACHE_KEYS.BORROW_HISTORY);
      if (cached) {
        setRecords(cached);
      }

      try {
        const data = await borrowApi.getHistory();
        setRecords(data);
        await cache.set(CACHE_KEYS.BORROW_HISTORY, data, CACHE_TTL.BORROW_HISTORY);
      } catch (error: any) {
        if (!cached) {
          devError('Failed to load history:', error);
          setLoadError(error?.response?.data?.detail || error?.message || 'Không thể tải lịch sử');
        }
      }
    } catch (error: any) {
      devError('Failed to load history:', error);
      setLoadError(error?.response?.data?.detail || error?.message || 'Không thể tải lịch sử');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const filtered = records.filter((r) => {
    if (activeFilter === 'all') return true;
    return r.status === activeFilter;
  });

  const borrowedCount = records.filter((r) => r.status === 'borrowed').length;
  const returnedCount = records.filter((r) => r.status === 'returned').length;
  const overdueCount = records.filter((r) => r.status === 'borrowed' && getDaysUntil(r.due_at) < 0).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <GradientHeader
          title="Lịch sử mượn sách"
          subtitle={`${records.length} bản ghi`}
          icon="history"
        />

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <StatCard
              label="Tổng"
              value={records.length}
              icon="book-open-variant"
              gradient={GRADIENTS.indigo}
            />
          </View>
          <View style={styles.statCol}>
            <StatCard
              label="Đang mượn"
              value={borrowedCount}
              icon="book-check"
              gradient={GRADIENTS.emerald}
            />
          </View>
          <View style={styles.statCol}>
            <StatCard
              label="Quá hạn"
              value={overdueCount}
              icon="alert-circle"
              gradient={GRADIENTS.red}
            />
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              active={activeFilter === f.key}
              onPress={() => setActiveFilter(f.key)}
            />
          ))}
        </View>

        {loadError ? (
          <View style={styles.stateWrap}>
            <EmptyState icon="cloud-off-outline" message={loadError} />
            <Button mode="outlined" onPress={loadHistory} style={styles.stateButton} labelStyle={styles.stateButtonLabel} icon="refresh">
              Thử lại
            </Button>
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="bookshelf"
            message={
              activeFilter === 'all'
                ? 'Chưa có lịch sử mượn sách'
                : activeFilter === 'borrowed'
                ? 'Không có sách đang mượn'
                : 'Không có sách đã trả'
            }
          />
        ) : (
          filtered.map((record) => {
            const isReturned = record.status === 'returned';
            const overdue = !isReturned && getDaysUntil(record.due_at) < 0;
            const spineColor = isReturned
              ? RECORD_SPINE_COLORS.returned
              : overdue
              ? RECORD_SPINE_COLORS.overdue
              : RECORD_SPINE_COLORS.borrowed;

            return (
              <SectionCard key={record.id} accentColor={spineColor} style={styles.recordCard}>
                <View style={styles.recordRow}>
                  {record.book?.cover_url ? (
                    <Image source={{ uri: record.book.cover_url }} style={styles.bookCover} />
                  ) : (
                    <View style={[styles.bookCoverPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                      <MaterialCommunityIcons name="book-variant" size={24} color={c.onSurfaceVariant} />
                    </View>
                  )}
                  <View style={styles.recordContent}>
                    <Text style={[styles.bookTitle, { color: c.onSurface }]} numberOfLines={2}>
                      {record.book?.title || record.book_id}
                    </Text>
                    {record.book?.author ? (
                      <Text style={[styles.bookAuthor, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                        {record.book.author}
                      </Text>
                    ) : null}
                    <View style={styles.recordMeta}>
                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="calendar-arrow-right" size={12} color={c.custom.textDisabled} />
                        <Text style={[styles.metaText, { color: c.custom.textDisabled }]}>
                          {formatDate(record.borrow_at)}
                        </Text>
                      </View>
                      {isReturned ? (
                        <View style={styles.metaRow}>
                          <MaterialCommunityIcons name="calendar-check" size={12} color={c.custom.textDisabled} />
                          <Text style={[styles.metaText, { color: c.custom.textDisabled }]}>
                            {formatDate(record.return_at!)}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.metaRow}>
                          <MaterialCommunityIcons name="calendar-clock" size={12} color={overdue ? c.error : c.custom.textDisabled} />
                          <Text style={[styles.metaText, { color: overdue ? c.error : c.custom.textDisabled }]}>
                            {formatDate(record.due_at)}
                          </Text>
                        </View>
                      )}
                      {record.note ? (
                        <Text style={[styles.noteText, { color: c.primary }]}>
                          Tình trạng: {record.note}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: spineColor },
                    ]}>
                      <MaterialCommunityIcons
                        name={isReturned ? 'check-circle' : overdue ? 'alert-circle' : 'clock-outline'}
                        size={11}
                        color="#fff"
                      />
                      <Text style={[styles.statusText, { color: '#fff' }]}>
                        {isReturned ? 'Đã trả' : overdue ? 'Quá hạn' : 'Đang mượn'}
                      </Text>
                    </View>
                  </View>
                </View>
              </SectionCard>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 8,
    },
    statCol: { flex: 1 },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
      gap: 8,
    },
    stateWrap: { alignItems: 'center', marginTop: 32 },
    stateButton: { borderRadius: 8, marginTop: 12 },
    stateButtonLabel: { fontSize: 14 },
    recordCard: {
      marginHorizontal: 16,
      marginTop: 10,
      backgroundColor: c.surface,
    },
    recordRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 10,
      paddingRight: 10,
    },
    bookCover: {
      width: 52,
      height: 72,
      borderRadius: 6,
      marginLeft: 12,
      marginRight: 0,
    },
    bookCoverPlaceholder: {
      width: 52,
      height: 72,
      borderRadius: 6,
      marginLeft: 12,
      marginRight: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordContent: { flex: 1, paddingHorizontal: 10 },
    bookTitle: { fontWeight: '600', fontSize: 14, lineHeight: 18 },
    bookAuthor: { fontSize: 12, marginTop: 1 },
    recordMeta: { marginTop: 6, gap: 3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11 },
    noteText: { fontSize: 11, marginTop: 1 },
    statusBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      marginTop: 6,
    },
    statusText: { fontSize: 11, fontWeight: '700' },
  });
}
