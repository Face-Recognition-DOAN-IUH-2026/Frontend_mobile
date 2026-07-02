import React, { useState, useCallback, useMemo } from 'react';
import { View, Image, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Button, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { getMyReservations, cancelReservation, BookReservation } from '../../../api/borrow';
import { AppTheme } from '../../../theme/DarkTheme';
import { GradientHeader, SectionCard, EmptyState, GRADIENTS } from '../../../theme/MobileDesignSystem';
import { NoticeSnackbar } from '../../../components/NoticeSnackbar';
import { devError } from '../../../utils/logger';
import CacheManager from '../../../utils/cache/CacheManager';
import { CACHE_KEYS, CACHE_TTL } from '../../../utils/cache/CacheKeys';
import { useNetwork } from '../../../context/NetworkContext';

interface MyReservationsScreenProps {
  navigation: any;
}

export default function MyReservationsScreen({ navigation }: MyReservationsScreenProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [reservations, setReservations] = useState<BookReservation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { isOnline } = useNetwork();

  const loadReservations = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      setLoadError(null);
      
      const cache = CacheManager.getInstance();
      const cached = await cache.get<{ items: BookReservation[] }>(CACHE_KEYS.RESERVATIONS);
      if (cached) {
        setReservations(cached.items);
        setRefreshing(false);
      }

      try {
        const data = await getMyReservations();
        setReservations(data.items);
        await cache.set(CACHE_KEYS.RESERVATIONS, data, CACHE_TTL.RESERVATIONS);
      } catch (error: any) {
        if (!cached) {
          devError('Failed to load reservations:', error);
          setLoadError(error?.response?.data?.detail || error?.message || 'Không thể tải danh sách đặt chỗ');
        }
      } finally {
        setRefreshing(false);
      }
    } catch (error: any) {
      devError('Failed to load reservations:', error);
      setLoadError(error?.response?.data?.detail || error?.message || 'Không thể tải danh sách đặt chỗ');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReservations();
    }, [loadReservations])
  );

  const handleCancel = useCallback((reservation: BookReservation) => {
    if (!isOnline) {
      Alert.alert('Requires Network', 'Cancelling reservations requires an internet connection.');
      return;
    }
    
    Alert.alert(
      'Hủy đặt chỗ?',
      `Bạn có chắc muốn hủy đặt chỗ "${reservation.book?.title || 'sách này'}"?`,
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            setCancellingId(reservation.id);
            try {
              await cancelReservation(reservation.id);
              setReservations((prev) => prev.filter((r) => r.id !== reservation.id));
              setSnackMsg('Đã hủy đặt chỗ');
              setSnackVisible(true);
            } catch (error: any) {
              const msg = error?.response?.data?.detail || error?.message || 'Không thể hủy đặt chỗ';
              setSnackMsg(msg);
              setSnackVisible(true);
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  }, []);

  const getExpiryHours = (expiresAt: string): number => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
  };

  const getExpiryLabel = (expiresAt: string): string => {
    const hours = getExpiryHours(expiresAt);
    if (hours < 0) return 'Đã hết hạn';
    if (hours < 1) return 'Sắp hết hạn';
    if (hours < 24) return `Còn ${hours} giờ`;
    const days = Math.floor(hours / 24);
    return `Còn ${days} ngày`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadReservations(true)} tintColor={c.primary} />
        }
      >
        <GradientHeader
          title="Danh sách đặt chỗ"
          subtitle={reservations.length > 0 ? `${reservations.length} đặt chỗ` : 'Chưa có đặt chỗ'}
          icon="book-check"
        />

        {loadError ? (
          <EmptyState
            icon="cloud-off-outline"
            title={loadError}
            action={<Button mode="outlined" onPress={() => loadReservations()} icon="refresh">Thử lại</Button>}
          />
        ) : reservations.length === 0 ? (
          <EmptyState icon="bookshelf" title="Bạn chưa đặt chỗ sách nào" />
        ) : (
          <SectionCard title="Sách đã đặt chỗ" icon="book-clock-outline" accentColor={GRADIENTS.indigo[0]}>
            {reservations.map((reservation) => {
            const expiryHours = getExpiryHours(reservation.expires_at);
            const isUrgent = expiryHours < 2 && expiryHours >= 0;
            const isExpired = expiryHours < 0;
            return (
              <Surface
                key={reservation.id}
                style={[styles.resCard, { backgroundColor: c.surface, borderColor: c.outline }]}
                elevation={0}
              >
                <View style={[styles.resCardSpine, { backgroundColor: isExpired ? c.error : c.primary }]} />
                {reservation.book?.cover_url ? (
                  <Image source={{ uri: reservation.book.cover_url }} style={styles.bookCover} />
                ) : (
                  <View style={[styles.bookCoverPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                    <MaterialCommunityIcons name="book-variant" size={24} color={c.onSurfaceVariant} />
                  </View>
                )}
                <View style={styles.resContent}>
                  <Text style={[styles.bookTitle, { color: c.onSurface }]} numberOfLines={2}>
                    {reservation.book?.title || reservation.book_id}
                  </Text>
                  {reservation.book?.author ? (
                    <Text style={[styles.bookAuthor, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                      {reservation.book.author}
                    </Text>
                  ) : null}
                  <View style={styles.resMeta}>
                    <Surface style={[styles.statusBadge, { backgroundColor: c.custom.success }]} elevation={0}>
                      <Text style={[styles.statusBadgeText, { color: '#FFFFFF' }]}>Đang chờ</Text>
                    </Surface>
                    <Surface
                      style={[
                        styles.expiryBadge,
                        { backgroundColor: isExpired || isUrgent ? c.error : c.surfaceVariant },
                      ]}
                      elevation={0}
                    >
                      <Text
                        style={[
                          styles.expiryText,
                          { color: isExpired || isUrgent ? '#FFFFFF' : c.onSurfaceVariant },
                        ]}
                      >
                        {getExpiryLabel(reservation.expires_at)}
                      </Text>
                    </Surface>
                  </View>
                </View>
                <View style={styles.resActions}>
                  <Button
                    mode="outlined"
                    onPress={() => handleCancel(reservation)}
                    loading={cancellingId === reservation.id}
                    disabled={cancellingId === reservation.id}
                    style={styles.cancelButton}
                    labelStyle={styles.cancelButtonLabel}
                    textColor={c.error}
                    compact
                  >
                    Hủy
                  </Button>
                </View>
              </Surface>
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
    expiryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    expiryText: { fontSize: 11, fontWeight: '600' },
    resActions: {
      paddingRight: 10,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      borderRadius: 6,
      borderColor: c.error,
    },
    cancelButtonLabel: { fontSize: 12 },
  });
}