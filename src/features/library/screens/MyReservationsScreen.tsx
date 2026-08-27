import React, { useState, useCallback, useMemo } from 'react';
import { View, Image, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Button, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyWaitlist, joinWaitlist, leaveWaitlist, WaitlistEntry } from '../../../api/borrow';
import { AppTheme } from '../../../theme/DarkTheme';
import { GradientHeader, SectionCard, EmptyState, GRADIENTS } from '../../../theme/MobileDesignSystem';
import { NoticeSnackbar } from '../../../components/NoticeSnackbar';
import { UndoBar } from '../../../components/UndoBar';
import SwipeReserveRow from '../../../components/SwipeReserveRow';
import { useUndo } from '../../../lib/useUndo';
import { devError } from '../../../utils/logger';
import { useNetwork } from '../../../context/NetworkContext';

interface MyReservationsScreenProps {
  navigation: any;
}

export default function MyReservationsScreen({ navigation }: MyReservationsScreenProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);
  const { hiddenIds, confirmingId, undo, cancelUndo, markConfirmed } = useUndo({ duration: 5000 });
  const { isOnline } = useNetwork();
  const qc = useQueryClient();

  const {
    data: waitlistData,
    error: waitlistError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['myReservations'],
    queryFn: () => getMyWaitlist(),
    staleTime: 5 * 60 * 1000,
  });

  const entries: WaitlistEntry[] = waitlistData?.items || [];
  const loadError = waitlistError ? (waitlistError as any)?.response?.data?.detail || (waitlistError as Error)?.message || 'Không thể tải danh sách nhận thông báo' : null;
  const refreshing = isFetching;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleCancel = useCallback((entry: WaitlistEntry) => {
    if (!isOnline) {
      Alert.alert('Yêu cầu mạng', 'Bạn cần kết nối internet để hủy nhận thông báo.');
      return;
    }

    undo(entry.id);
  }, [isOnline, undo]);

  const handleUndoCancel = useCallback(async () => {
    if (!confirmingId || !isOnline) return;
    try {
      const entry = entries.find(e => e.id === confirmingId);
      if (entry) {
        await joinWaitlist(entry.book_id);
        setSnackMsg(`Đã khôi phục nhận thông báo "${entry.book?.title || 'sách này'}"`);
        setSnackVisible(true);
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || 'Không thể khôi phục nhận thông báo';
      setSnackMsg(detail);
      setSnackVisible(true);
    } finally {
      cancelUndo(confirmingId);
    }
  }, [confirmingId, isOnline, entries, joinWaitlist, cancelUndo]);

  const commitCancellation = useCallback(async () => {
    if (!confirmingId) return;
    const title = entries.find(e => e.id === confirmingId)?.book?.title || 'sách này';
    try {
      await leaveWaitlist(confirmingId);
      // Invalidate query to refetch fresh data from server
      qc.invalidateQueries({ queryKey: ['myReservations'] });
      setSnackMsg(`Đã hủy nhận thông báo "${title}"`);
      setSnackVisible(true);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || 'Không thể hủy nhận thông báo';
      setSnackMsg(msg);
      setSnackVisible(true);
      cancelUndo(confirmingId);
    } finally {
      markConfirmed(confirmingId);
    }
  }, [confirmingId, entries, leaveWaitlist, qc, cancelUndo, markConfirmed]);

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'waiting': return 'Đang chờ';
      case 'notified': return 'Đã thông báo';
      case 'fulfilled': return 'Đã mượn';
      case 'expired': return 'Đã hết hạn';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => refetch()} tintColor={c.primary} />
        }
      >
        <GradientHeader
          title="Sách chờ nhận thông báo"
          subtitle={entries.length > 0 ? `${entries.length} đang chờ` : 'Ch chưa có sách nào'}
          icon="bell-ring-outline"
        />

        {loadError ? (
          <EmptyState
            icon="cloud-off-outline"
            title={loadError}
            action={<Button mode="outlined" onPress={() => refetch()} icon="refresh">Thử lại</Button>}
          />
        ) : entries.length === 0 ? (
          <EmptyState icon="bell-off-outline" title="Bạn chưa đăng ký nhận thông báo nào" />
        ) : (
          <SectionCard title="Sách đang chờ" icon="bell-check-outline" accentColor={GRADIENTS.indigo[0]}>
            {entries
              .filter((entry) => !hiddenIds.includes(entry.id))
              .map((entry) => {
            const isNotified = entry.status === 'notified';
            return (
              <SwipeReserveRow
                key={entry.id}
                variant="cancel"
                onCancel={() => handleCancel(entry)}
              >
                <Surface
                  style={[styles.resCard, { backgroundColor: c.surface, borderColor: c.outline }]}
                  elevation={0}
                >
                  <View style={[styles.resCardSpine, { backgroundColor: isNotified ? c.custom.success : c.primary }]} />
                  {entry.book?.cover_url ? (
                    <Image source={{ uri: entry.book.cover_url }} style={styles.bookCover} />
                  ) : (
                    <View style={[styles.bookCoverPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                      <MaterialCommunityIcons name="book-variant" size={24} color={c.onSurfaceVariant} />
                    </View>
                  )}
                  <View style={styles.resContent}>
                    <Text style={[styles.bookTitle, { color: c.onSurface }]} numberOfLines={2}>
                      {entry.book?.title || entry.book_id}
                    </Text>
                    {entry.book?.author ? (
                      <Text style={[styles.bookAuthor, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                        {entry.book.author}
                      </Text>
                    ) : null}
                    <View style={styles.resMeta}>
                      <Surface
                        style={[
                          styles.statusBadge,
                          { backgroundColor: isNotified ? c.custom.success : c.primary },
                        ]}
                        elevation={0}
                      >
                        <Text style={[styles.statusBadgeText, { color: '#FFFFFF' }]}>
                          {getStatusLabel(entry.status)}
                        </Text>
                      </Surface>
                    </View>
                  </View>
                </Surface>
              </SwipeReserveRow>
            );
            })}
          </SectionCard>
        )}
      </ScrollView>

      <NoticeSnackbar
        visible={snackVisible}
        message={snackMsg}
        severity={snackMsg.includes('hủy') ? 'success' : 'error'}
        onDismiss={() => setSnackVisible(false)}
      />

      <UndoBar
        visible={!!confirmingId}
        message={`Đã hủy nhận thông báo "${entries.find(e => e.id === confirmingId)?.book?.title ?? ''}"`}
        onUndo={handleUndoCancel}
        onDismiss={commitCancellation}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    resCard: {
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: 10,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: 0.5,
      alignItems: 'center',
    },
    resCardSpine: { width: 4, alignSelf: 'stretch' },
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
    resContent: { flex: 1, padding: 10, gap: 4 },
    bookTitle: { fontWeight: '600', fontSize: 14, lineHeight: 18 },
    bookAuthor: { fontSize: 12 },
    resMeta: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '700' },
  });
}
