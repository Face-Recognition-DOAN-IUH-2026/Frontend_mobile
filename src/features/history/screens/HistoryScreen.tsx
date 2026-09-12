import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Image, StyleSheet, ScrollView, RefreshControl, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Button, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { borrowApi } from '../../../api/borrow';
import { BorrowRecord } from '../../../types';
import { AppTheme } from '../../../theme/DarkTheme';
import { formatDate, getDaysUntil } from '../../../utils/dateUtils';
import { devError } from '../../../utils/logger';
import { triggerHaptic } from '../../../utils/haptics';
import {
  GradientHeader,
  SectionCard,
  FilterPill,
  EmptyState,
  GRADIENTS,
} from '../../../theme/MobileDesignSystem';

import { useAuth } from '../../../context/AuthContext';

interface HistoryScreenProps {
  navigation: any;
}

type FilterTab = 'all' | 'borrowed' | 'returned';

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'borrowed', label: 'Đang mượn' },
  { key: 'returned', label: 'Đã trả' },
];

function useFadeInUp(delay: number) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return { opacity, translateY };
}

function AnimatedCard({ children, delay, style }: { children: React.ReactNode; delay: number; style?: any }) {
  const { opacity, translateY } = useFadeInUp(delay);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }], ...style }}>
      {children}
    </Animated.View>
  );
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isAuthenticated } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showHeader, setShowHeader] = useState(false);

  const {
    data: records,
    error: historyError,
    isFetching,
    refetch,
  } = useQuery<BorrowRecord[], Error>({
    queryKey: ['borrowHistory'],
    queryFn: () => borrowApi.getHistory(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const safeRecords: BorrowRecord[] = records || [];
  const loadError = historyError?.message || null;
  const refreshing = isFetching;

  useEffect(() => {
    if (records && records.length >= 0) setShowHeader(true);
  }, [records]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refetch();
      }
    }, [isAuthenticated, refetch]),
  );

  const onRefresh = async () => {
    await refetch();
  };

  const [renewingId, setRenewingId] = useState<string | null>(null);

  const handleRenew = (record: BorrowRecord) => {
    triggerHaptic.medium();
    Alert.alert(
      'Xác nhận gia hạn sách',
      `Bạn có muốn gia hạn cuốn sách "${record.book?.title || record.book_id}" thêm thời gian không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gia hạn ngay',
          onPress: async () => {
            try {
              setRenewingId(record.id);
              const res = await borrowApi.renewBorrow(record.id);
              triggerHaptic.success();
              Alert.alert('Thành công', res.message || 'Gia hạn sách thành công!');
              refetch();
            } catch (err: any) {
              triggerHaptic.error();
              const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Không thể gia hạn sách vào lúc này';
              Alert.alert('Gia hạn thất bại', msg);
            } finally {
              setRenewingId(null);
            }
          },
        },
      ],
    );
  };

  const filtered = safeRecords.filter((r: BorrowRecord) => {
    if (activeFilter === 'all') return true;
    return r.status === activeFilter;
  });

  const borrowedCount = safeRecords.filter((r: BorrowRecord) => r.status === 'borrowed').length;
  const returnedCount = safeRecords.filter((r: BorrowRecord) => r.status === 'returned').length;
  const overdueCount = safeRecords.filter((r: BorrowRecord) => r.status === 'borrowed' && getDaysUntil(r.due_at) < 0).length;

  const StatBadge = ({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) => (
    <Surface style={[styles.statBadge, { borderColor: c.outline }]} elevation={0}>
      <View style={styles.statBadgeRow}>
        <View style={[styles.statBadgeIcon, { backgroundColor: color + '18' }]}>
          <MaterialCommunityIcons name={icon as any} size={18} color={color} />
        </View>
        <View style={styles.statBadgeText}>
          <Text style={[styles.statBadgeLabel, { color: c.onSurfaceVariant }]}>{label}</Text>
          <Text style={[styles.statBadgeValue, { color: c.onSurface }]}>{value}</Text>
        </View>
      </View>
    </Surface>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <GradientHeader
          title="Lịch sử mượn sách"
          subtitle={`${safeRecords.length} bản ghi`}
          icon="history"
        />

        {showHeader && safeRecords.length > 0 ? (
          <AnimatedCard delay={50}>
            <View style={styles.statRow}>
              <StatBadge label="Tổng số" value={safeRecords.length} icon="book-open-variant" color={GRADIENTS.navy[0]} />
              <StatBadge label="Đang mượn" value={borrowedCount} icon="book-check" color={GRADIENTS.emerald[0]} />
              <StatBadge label="Quá hạn" value={overdueCount} icon="alert-circle" color={GRADIENTS.red[0]} />
              <StatBadge label="Đã trả" value={returnedCount} icon="book-check" color={GRADIENTS.amber[0]} />
            </View>
          </AnimatedCard>
        ) : null}

        <AnimatedCard delay={100}>
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
        </AnimatedCard>

        {loadError ? (
          <AnimatedCard delay={150}>
            <View style={styles.stateWrap}>
              <EmptyState icon="cloud-off-outline" message={loadError} />
              <Button mode="outlined" onPress={() => refetch()} style={styles.stateButton} labelStyle={styles.stateButtonLabel} icon="refresh">
                Thử lại
              </Button>
            </View>
          </AnimatedCard>
        ) : filtered.length === 0 ? (
          <AnimatedCard delay={150}>
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
          </AnimatedCard>
        ) : (
          filtered.map((record: BorrowRecord, idx: number) => {
            const isReturned = record.status === 'returned';
            const overdue = !isReturned && getDaysUntil(record.due_at) < 0;
            const spineColor = isReturned
              ? GRADIENTS.amber[0]
              : overdue
              ? GRADIENTS.red[0]
              : GRADIENTS.navy[0];

            return (
              <AnimatedCard key={record.id} delay={150 + idx * 40}>
                <Surface style={[styles.recordCard, { borderColor: c.outline }]} elevation={0}>
                  <View style={[styles.spine, { backgroundColor: spineColor }]} />
                  <View style={styles.recordRow}>
                    {record.book?.cover_url ? (
                      <Image source={{ uri: record.book.cover_url }} style={styles.bookCover} />
                    ) : (
                      <View style={[styles.bookCoverPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                        <MaterialCommunityIcons name="book-variant" size={22} color={c.onSurfaceVariant} />
                      </View>
                    )}
                    <View style={styles.recordContent}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.bookTitle, { color: c.onSurface }]} numberOfLines={2}>
                          {record.book?.title || record.book_id}
                        </Text>
                        <View style={[styles.statusDot, { backgroundColor: spineColor }]} />
                      </View>
                      {record.book?.author ? (
                        <Text style={[styles.bookAuthor, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                          {record.book.author}
                        </Text>
                      ) : null}

                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="calendar-arrow-right" size={11} color={c.custom.textDisabled} />
                        <Text style={[styles.metaText, { color: c.custom.textDisabled }]}>
                          Mượn: {formatDate(record.borrow_at)}
                        </Text>
                      </View>

                      {isReturned ? (
                        <View style={styles.metaRow}>
                          <MaterialCommunityIcons name="calendar-check" size={11} color={c.custom.success} />
                          <Text style={[styles.metaText, { color: c.custom.success }]}>
                            Trả: {formatDate(record.return_at!)}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.metaRow}>
                          <MaterialCommunityIcons
                            name="calendar-clock"
                            size={11}
                            color={overdue ? c.error : c.custom.textDisabled}
                          />
                          <Text style={[styles.metaText, { color: overdue ? c.error : c.custom.textDisabled }]}>
                            Hạn: {formatDate(record.due_at)}
                          </Text>
                        </View>
                      )}

                      <View style={[styles.badgeRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.statusBadge, { backgroundColor: spineColor + '18' }]}>
                            <MaterialCommunityIcons
                              name={isReturned ? 'check-circle' : overdue ? 'alert-circle' : 'clock-outline'}
                              size={10}
                              color={spineColor}
                            />
                            <Text style={[styles.statusText, { color: spineColor }]}>
                              {isReturned ? 'Đã trả' : overdue ? 'Quá hạn' : 'Đang mượn'}
                            </Text>
                          </View>
                          {record.note ? (
                            <Text style={[styles.noteText, { color: c.primary }]} numberOfLines={1}>
                              {record.note}
                            </Text>
                          ) : null}
                        </View>
                        {!isReturned && !overdue && (
                          <Button
                            mode="contained-tonal"
                            compact
                            loading={renewingId === record.id}
                            disabled={renewingId === record.id}
                            icon="calendar-refresh"
                            onPress={() => handleRenew(record)}
                            style={{ borderRadius: 8 }}
                            labelStyle={{ fontSize: 11 }}
                          >
                            Gia hạn
                          </Button>
                        )}
                      </View>
                    </View>
                  </View>
                </Surface>
              </AnimatedCard>
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
    statRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingTop: 14,
      gap: 6,
    },
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
      marginHorizontal: 14,
      marginTop: 10,
      borderRadius: 16,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: 0,
      backgroundColor: c.surface,
    },
    spine: { width: 3.5, alignSelf: 'stretch' },
    recordRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 10,
      paddingRight: 10,
    },
    bookCover: {
      width: 48,
      height: 66,
      borderRadius: 6,
      marginLeft: 10,
      marginRight: 0,
    },
    bookCoverPlaceholder: {
      width: 48,
      height: 66,
      borderRadius: 6,
      marginLeft: 10,
      marginRight: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordContent: { flex: 1, paddingHorizontal: 10, gap: 3 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    bookTitle: { fontWeight: '700', fontSize: 14, lineHeight: 18, flex: 1 },
    bookAuthor: { fontSize: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11 },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      alignSelf: 'flex-start',
    },
    statusText: { fontSize: 10, fontWeight: '700' },
    noteText: { fontSize: 10, fontWeight: '600', flex: 1 },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: 6,
      flexShrink: 0,
    },
    statBadge: {
      flex: 1,
      borderRadius: 16,
      padding: 10,
      borderWidth: 0,
      backgroundColor: c.surface,
    },
    statBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statBadgeIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statBadgeText: { flex: 1 },
    statBadgeLabel: {
      fontSize: 9,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    statBadgeValue: {
      fontSize: 18,
      fontWeight: '800',
      marginTop: 1,
    },
  });
}
