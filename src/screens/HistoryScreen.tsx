import React, { useState, useCallback, useMemo } from 'react';
import { View, Image, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
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

interface HistoryScreenProps {
  navigation: any;
}

type FilterTab = 'all' | 'borrowed' | 'returned';

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'borrowed', label: 'Đang mượn' },
  { key: 'returned', label: 'Đã trả' },
];

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <View style={styles.header}>
          <View style={[styles.headerSpine, { backgroundColor: c.primary }]} />
          <Text style={[styles.headerTitle, { color: c.onSurface }]}>Lịch sử mượn sách</Text>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.7}
              onPress={() => setActiveFilter(f.key)}
            >
              <Surface style={[
                styles.filterChip,
                { backgroundColor: c.surface, borderColor: c.outline },
                activeFilter === f.key && { backgroundColor: c.primary, borderColor: c.primary },
              ]} elevation={0}>
                <Text style={[
                  styles.filterText,
                  { color: c.onSurfaceVariant },
                  activeFilter === f.key && { color: c.background },
                ]}>
                  {f.label}
                </Text>
              </Surface>
            </TouchableOpacity>
          ))}
        </View>

        {loadError ? (
          <Surface style={[styles.stateCard, { backgroundColor: c.surface, borderColor: c.outline }]} elevation={0}>
            <MaterialCommunityIcons name="cloud-off-outline" size={36} color={c.onSurfaceVariant} />
            <Text variant="bodyMedium" style={[styles.stateText, { color: c.onSurface }]}>
              {loadError}
            </Text>
            <Button mode="outlined" onPress={loadHistory} style={styles.stateButton} labelStyle={styles.stateButtonLabel} icon="refresh">
              Thử lại
            </Button>
          </Surface>
        ) : filtered.length === 0 ? (
          <Surface style={[styles.stateCard, { backgroundColor: c.surface, borderColor: c.outline }]} elevation={0}>
            <MaterialCommunityIcons name="bookshelf" size={36} color={c.onSurfaceVariant} />
            <Text variant="bodyMedium" style={[styles.stateText, { color: c.onSurface }]}>
              {activeFilter === 'all' ? 'Chưa có lịch sử mượn sách' :
               activeFilter === 'borrowed' ? 'Không có sách đang mượn' :
               'Không có sách đã trả'}
            </Text>
          </Surface>
        ) : (
          filtered.map((record) => {
            const isReturned = record.status === 'returned';
            const overdue = !isReturned && getDaysUntil(record.due_at) < 0;
            return (
              <Surface key={record.id} style={[styles.recordCard, { backgroundColor: c.surface, borderColor: c.outline }]} elevation={0}>
                <View style={[
                  styles.recordSpine,
                  isReturned ? { backgroundColor: c.custom.textDisabled } : overdue ? { backgroundColor: c.error } : { backgroundColor: c.primary },
                ]} />
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
                    <Text style={[styles.metaText, { color: c.custom.textDisabled }]}>
                      Mượn: {formatDate(record.borrow_at)}
                    </Text>
                    {isReturned ? (
                      <Text style={[styles.metaText, { color: c.custom.textDisabled }]}>
                        Trả: {formatDate(record.return_at!)}
                      </Text>
                    ) : (
                      <Text style={[styles.metaText, { color: c.custom.textDisabled }]}>
                        Hạn trả: {formatDate(record.due_at)}
                      </Text>
                    )}
                    {record.note ? (
                      <Text style={[styles.noteText, { color: c.primary }]}>
                        Tình trạng: {record.note}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[
                    styles.statusBadge,
                    isReturned ? { backgroundColor: c.custom.textDisabled } : overdue ? { backgroundColor: c.error } : { backgroundColor: c.custom.success },
                  ]}>
                    <Text style={[styles.statusText, { color: c.background }]}>
                      {isReturned ? 'Đã trả' : overdue ? 'Quá hạn' : 'Đang mượn'}
                    </Text>
                  </View>
                </View>
              </Surface>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 4,
      gap: 10,
    },
    headerSpine: { width: 3, height: 20, borderRadius: 2 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 0.5,
    },
    filterText: { fontSize: 13, fontWeight: '600' },
    stateCard: {
      marginHorizontal: 16,
      marginTop: 24,
      padding: 32,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 0.5,
    },
    stateText: { marginTop: 12, marginBottom: 16, textAlign: 'center' },
    stateButton: { borderRadius: 6 },
    stateButtonLabel: { fontSize: 14 },
    recordCard: {
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: 10,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: 0.5,
    },
    recordSpine: { width: 4 },
    bookCover: {
      width: 48,
      height: 66,
      borderRadius: 4,
      margin: 10,
      marginRight: 0,
    },
    bookCoverPlaceholder: {
      width: 48,
      height: 66,
      borderRadius: 4,
      margin: 10,
      marginRight: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordContent: { flex: 1, padding: 10 },
    bookTitle: { fontWeight: '600', fontSize: 14, lineHeight: 18 },
    bookAuthor: { fontSize: 12, marginTop: 1 },
    recordMeta: { marginTop: 6, gap: 1 },
    metaText: { fontSize: 11 },
    noteText: { fontSize: 11, marginTop: 1 },
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 6,
    },
    statusText: { fontSize: 11, fontWeight: '700' },
  });
}
