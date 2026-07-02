import React, { useState, useCallback, useMemo } from 'react';
import { View, Image, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, useTheme, Portal, Modal } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { borrowApi, reserveBook } from '../../../api/borrow';
import { Book, BookWithStats } from '../../../types';
import { AppTheme } from '../../../theme/DarkTheme';
import { devError } from '../../../utils/logger';
import CacheManager from '../../../utils/cache/CacheManager';
import { CACHE_KEYS, CACHE_TTL } from '../../../utils/cache/CacheKeys';
import { useNetwork } from '../../../context/NetworkContext';
import {
  GradientHeader,
  SectionCard,
  EmptyState,
  GRADIENTS,
} from '../../../theme/MobileDesignSystem';
import { NoticeSnackbar } from '../../../components/NoticeSnackbar';
import { SearchField } from '../../../components/SearchField';
import { LoadingOverlay } from '../../../components/LoadingOverlay';

interface BookCatalogScreenProps {
  navigation: any;
}

const SPINE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e'];

function getSpineColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SPINE_COLORS[Math.abs(hash) % SPINE_COLORS.length];
}

export default function BookCatalogScreen({ navigation }: BookCatalogScreenProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [books, setBooks] = useState<Book[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const { isOnline } = useNetwork();

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailBook, setDetailBook] = useState<BookWithStats | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadBooks = useCallback(async () => {
    try {
      setLoadError(null);

      const cache = CacheManager.getInstance();
      const cached = await cache.get<Book[]>(CACHE_KEYS.BOOKS);
      if (cached) {
        setBooks(cached);
      }

      try {
        const data = await borrowApi.getBooks(0, 200);
        setBooks(data);
        await cache.set(CACHE_KEYS.BOOKS, data, CACHE_TTL.BOOKS);
      } catch (error: any) {
        if (!cached) {
          devError('Failed to load books:', error);
          setLoadError(error?.response?.data?.detail || error?.message || 'Không thể tải danh sách sách');
        }
      }
    } catch (error: any) {
      devError('Failed to load books:', error);
      setLoadError(error?.response?.data?.detail || error?.message || 'Không thể tải danh sách sách');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [loadBooks])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const q = searchQuery.toLowerCase();
    return books.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.isbn?.includes(q)
    );
  }, [books, searchQuery]);

  const openDetail = async (book: Book) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const detail = await borrowApi.getBook(book.isbn);
      setDetailBook(detail);
    } catch {
      setDetailBook(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReserve = async (bookId: string, title: string) => {
    if (!isOnline) {
      Alert.alert('Requires Network', 'Reserving books requires an internet connection.');
      return;
    }

    Alert.alert(
      'Đặt chỗ',
      `Bạn muốn đặt chỗ "${title}"?`,
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: 'Đặt chỗ',
          onPress: async () => {
            setReservingId(bookId);
            try {
              const result = await reserveBook(bookId);
              setSnackMsg(result.message || 'Đặt chỗ thành công!');
              setSnackVisible(true);
              setDetailVisible(false);
            } catch (error: any) {
              const msg = error?.response?.data?.detail || error?.message || 'Không thể đặt chỗ';
              setSnackMsg(msg);
              setSnackVisible(true);
            } finally {
              setReservingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <GradientHeader
          title="Danh sách sách"
          subtitle={`${filtered.length} cuốn sách có sẵn`}
          icon="book-open-page-variant"
        />

        <View style={styles.searchWrap}>
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tên, tác giả, ISBN..."
            onClear={() => setSearchQuery('')}
          />
        </View>

        {loadError ? (
          <View style={styles.stateWrap}>
            <EmptyState icon="cloud-off-outline" message={loadError} />
            <Button mode="outlined" onPress={loadBooks} style={styles.stateButton} labelStyle={styles.stateButtonLabel} icon="refresh">
              Thử lại
            </Button>
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="book-search"
            message={searchQuery ? 'Không tìm thấy sách phù hợp' : 'Thư viện chưa có sách nào'}
          />
        ) : (
          filtered.map((book) => {
            const spineColor = getSpineColor(book.id);
            return (
              <SectionCard key={book.id} accentColor={spineColor} style={styles.bookCard}>
                <View style={styles.bookRow}>
                  {book.cover_url ? (
                    <Image source={{ uri: book.cover_url }} style={styles.bookCover} />
                  ) : (
                    <View style={[styles.bookCoverPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                      <MaterialCommunityIcons name="book-variant" size={24} color={c.onSurfaceVariant} />
                    </View>
                  )}
                  <View style={styles.bookContent}>
                    <Text style={[styles.bookTitle, { color: c.onSurface }]} numberOfLines={2}>
                      {book.title}
                    </Text>
                    {book.author ? (
                      <Text style={[styles.bookAuthor, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                        {book.author}
                      </Text>
                    ) : null}
                    {book.isbn ? (
                      <Text style={[styles.isbnText, { color: c.custom.textDisabled }]}>ISBN: {book.isbn}</Text>
                    ) : null}
                  </View>
                  <Button
                    mode={(book.available_copies ?? 0) > 0 ? 'contained' : 'outlined'}
                    onPress={() => openDetail(book)}
                    style={(book.available_copies ?? 0) > 0 ? styles.borrowButton : styles.reserveButton}
                    labelStyle={styles.buttonLabel}
                    compact
                    disabled={reservingId === book.id}
                    loading={reservingId === book.id}
                  >
                    {(book.available_copies ?? 0) > 0 ? 'Đặt sách' : 'Đặt chỗ'}
                  </Button>
                </View>
              </SectionCard>
            );
          })
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={detailVisible}
          onDismiss={() => setDetailVisible(false)}
          contentContainerStyle={[styles.detailModal, { backgroundColor: c.surface }]}
        >
          {detailLoading ? (
            <LoadingOverlay loading message="Đang tải..." />
          ) : detailBook ? (
            <ScrollView>
              <View style={styles.detailHeader}>
                {detailBook.cover_url ? (
                  <Image source={{ uri: detailBook.cover_url }} style={styles.detailCover} />
                ) : (
                  <View style={[styles.detailCoverPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                    <MaterialCommunityIcons name="book-variant" size={32} color={c.onSurfaceVariant} />
                  </View>
                )}
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailTitle, { color: c.onSurface }]}>{detailBook.title}</Text>
                  {detailBook.author ? (
                    <Text style={[styles.detailAuthor, { color: c.onSurfaceVariant }]}>{detailBook.author}</Text>
                  ) : null}
                  {detailBook.publisher ? (
                    <Text style={[styles.detailMeta, { color: c.custom.textDisabled }]}>{detailBook.publisher}</Text>
                  ) : null}
                  <View style={styles.detailAvailability}>
                    <MaterialCommunityIcons
                      name={detailBook.available_copies > 0 ? 'check-circle' : 'close-circle'}
                      size={16}
                      color={detailBook.available_copies > 0 ? c.custom.success : c.error}
                    />
                    <Text
                      style={[
                        styles.detailAvailabilityText,
                        { color: detailBook.available_copies > 0 ? c.custom.success : c.error },
                      ]}
                    >
                      {detailBook.available_copies > 0
                        ? `Còn ${detailBook.available_copies} bản`
                        : 'Hết bản'}
                    </Text>
                  </View>
                </View>
              </View>

              {detailBook.description ? (
                <SectionCard title="Mô tả" icon="text-box-outline" accentColor={GRADIENTS.indigo[0]} style={styles.detailDescCard}>
                  <Text style={[styles.detailDescription, { color: c.onSurfaceVariant }]} numberOfLines={6}>
                    {detailBook.description}
                  </Text>
                </SectionCard>
              ) : null}

              <View style={styles.detailActions}>
                {detailBook.available_copies > 0 ? (
                  <Button mode="contained" onPress={() => {}} style={styles.detailBorrowButton} disabled>
                    Sách có sẵn tại thư viện
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    onPress={() => handleReserve(detailBook.id, detailBook.title)}
                    style={styles.detailReserveButton}
                    loading={reservingId === detailBook.id}
                    disabled={reservingId === detailBook.id}
                  >
                    Đặt chỗ
                  </Button>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: c.onSurfaceVariant }}>Không thể tải thông tin sách</Text>
            </View>
          )}
        </Modal>
      </Portal>

      <NoticeSnackbar
        visible={snackVisible}
        message={snackMsg}
        severity={snackMsg.includes('thành công') ? 'success' : 'error'}
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
    searchWrap: { marginTop: 12, paddingHorizontal: 16 },
    stateWrap: { alignItems: 'center', marginTop: 32 },
    stateButton: { borderRadius: 8, marginTop: 12 },
    stateButtonLabel: { fontSize: 14 },
    bookCard: {
      marginHorizontal: 16,
      marginTop: 10,
      backgroundColor: c.surface,
    },
    bookRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
    bookContent: { flex: 1, paddingHorizontal: 10, gap: 2 },
    bookTitle: { fontWeight: '600', fontSize: 14, lineHeight: 18 },
    bookAuthor: { fontSize: 12 },
    isbnText: { fontSize: 10, marginTop: 2 },
    borrowButton: { borderRadius: 8 },
    reserveButton: { borderRadius: 8, borderColor: c.primary },
    buttonLabel: { fontSize: 12 },
    detailModal: { margin: 16, borderRadius: 14, padding: 16, maxHeight: '80%' },
    detailHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    detailCover: { width: 80, height: 110, borderRadius: 8 },
    detailCoverPlaceholder: {
      width: 80,
      height: 110,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailInfo: { flex: 1, gap: 4 },
    detailTitle: { fontWeight: '700', fontSize: 16, lineHeight: 20 },
    detailAuthor: { fontSize: 13 },
    detailMeta: { fontSize: 11 },
    detailAvailability: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    detailAvailabilityText: { fontSize: 13, fontWeight: '600' },
    detailDescCard: { marginBottom: 12 },
    detailDescription: { fontSize: 12, lineHeight: 18, paddingHorizontal: 12, paddingBottom: 12 },
    detailActions: { gap: 8 },
    detailBorrowButton: { borderRadius: 10 },
    detailReserveButton: { borderRadius: 10 },
  });
}
