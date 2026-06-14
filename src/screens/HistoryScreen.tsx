import React, { useState, useCallback } from 'react';
import { View, Image, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { borrowApi } from '../api/borrow';
import { BorrowRecord } from '../types';
import { colors } from '../theme/colors';
import { formatDate, getDaysUntil } from '../utils/dateUtils';

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
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoadError(null);
      const data = await borrowApi.getHistory();
      setRecords(data);
    } catch (error: any) {
      console.error('Failed to load history:', error);
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View style={styles.headerSpine} />
          <Text style={styles.headerTitle}>Lịch sử mượn sách</Text>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.7}
              onPress={() => setActiveFilter(f.key)}
            >
              <Surface style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]} elevation={0}>
                <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </Surface>
            </TouchableOpacity>
          ))}
        </View>

        {loadError ? (
          <Surface style={styles.stateCard} elevation={0}>
            <MaterialCommunityIcons name="cloud-off-outline" size={36} color={colors.textSecondary} />
            <Text variant="bodyMedium" style={styles.stateText}>
              {loadError}
            </Text>
            <Button mode="outlined" onPress={loadHistory} style={styles.stateButton} labelStyle={styles.stateButtonLabel} icon="refresh">
              Thử lại
            </Button>
          </Surface>
        ) : filtered.length === 0 ? (
          <Surface style={styles.stateCard} elevation={0}>
            <MaterialCommunityIcons name="bookshelf" size={36} color={colors.textSecondary} />
            <Text variant="bodyMedium" style={styles.stateText}>
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
              <Surface key={record.id} style={styles.recordCard} elevation={0}>
                <View style={[styles.recordSpine, isReturned ? styles.recordSpineReturned : overdue ? styles.recordSpineOverdue : styles.recordSpineActive]} />
                {record.book?.cover_url ? (
                  <Image source={{ uri: record.book.cover_url }} style={styles.bookCover} />
                ) : (
                  <View style={styles.bookCoverPlaceholder}>
                    <MaterialCommunityIcons name="book-variant" size={24} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.recordContent}>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {record.book?.title || record.book_id}
                  </Text>
                  {record.book?.author ? (
                    <Text style={styles.bookAuthor} numberOfLines={1}>
                      {record.book.author}
                    </Text>
                  ) : null}
                  <View style={styles.recordMeta}>
                    <Text style={styles.metaText}>
                      Mượn: {formatDate(record.borrow_at)}
                    </Text>
                    {isReturned ? (
                      <Text style={styles.metaText}>
                        Trả: {formatDate(record.return_at!)}
                      </Text>
                    ) : (
                      <Text style={styles.metaText}>
                        Hạn trả: {formatDate(record.due_at)}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, isReturned ? styles.statusReturned : overdue ? styles.statusOverdue : styles.statusActive]}>
                    <Text style={styles.statusText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
    gap: 10,
  },
  headerSpine: {
    width: 3,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },

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
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.background,
  },

  stateCard: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 32,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  stateText: {
    color: colors.text,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  stateButton: {
    borderRadius: 6,
  },
  stateButtonLabel: {
    fontSize: 14,
  },

  recordCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  recordSpine: {
    width: 4,
  },
  recordSpineActive: {
    backgroundColor: colors.primary,
  },
  recordSpineOverdue: {
    backgroundColor: colors.error,
  },
  recordSpineReturned: {
    backgroundColor: colors.textDisabled,
  },
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
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordContent: {
    flex: 1,
    padding: 10,
  },
  bookTitle: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
  },
  bookAuthor: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  recordMeta: {
    marginTop: 6,
    gap: 1,
  },
  metaText: {
    color: colors.textDisabled,
    fontSize: 11,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  statusActive: {
    backgroundColor: colors.success,
  },
  statusOverdue: {
    backgroundColor: colors.error,
  },
  statusReturned: {
    backgroundColor: colors.textDisabled,
  },
  statusText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '700',
  },
});
