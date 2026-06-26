import React, { useState, useCallback, useMemo } from 'react';
import { View, Image, StyleSheet, ScrollView, RefreshControl, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Button, useTheme, TextInput, Snackbar, Portal, Modal } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { borrowApi, reserveBook } from '../api/borrow';
import { Book, BookWithStats } from '../types';
import { AppTheme } from '../theme/DarkTheme';
import { devError } from '../utils/logger';
import CacheManager from '../utils/cache/CacheManager';
import { CACHE_KEYS, CACHE_TTL } from '../utils/cache/CacheKeys';
import { useNetwork } from '../context/NetworkContext';

interface BookCatalogScreenProps {
  navigation: any;
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
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color={c.onSurfaceVariant} />
        <TextInput
          placeholder="Tìm sách theo tên, tác giả, ISBN..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          mode="flat"
          contentStyle={styles.searchContent}
        />
        {searchQuery.length > 0 && (
          <Button compact onPress={() => setSearchQuery('')} textColor={c.onSurfaceVariant} mode="text">
            Xóa
          </Button>
        )}
      </View>

      <ScrollView
        style={styles.flex}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {loadError ? (
          <Surface style={[styles.stateCard, { backgroundColor: c.surface, borderColor: c.outline }]} elevation={0}>
            <MaterialCommunityIcons name="cloud-off-outline" size={36} color={c.onSurfaceVariant} />
            <Text variant="bodyMedium" style={[styles.stateText, { color: c.onSurface }]}>{loadError}</Text>
            <Button mode="outlined" onPress={loadBooks} style={styles.stateButton} labelStyle={styles.stateButtonLabel} icon="refresh">
              Thử lại
            </Button>
          </Surface>
        ) : filtered.length === 0 ? (
          <Surface style={[styles.stateCard, { backgroundColor: c.surface, borderColor: c.outline }]} elevation={0}>
            <MaterialCommunityIcons name="book-search" size={36} color={c.onSurfaceVariant} />
            <Text variant="bodyMedium" style={[styles.stateText, { color: c.onSurface }]}>
              {searchQuery ? 'Không tìm thấy sách phù hợp' : 'Thư viện chưa có sách nào'}
            </Text>
          </Surface>
        ) : (
          filtered.map((book) => (
            <Surface
              key={book.id}
              style={[styles.bookCard, { backgroundColor: c.surface, borderColor: c.outline }]}
              elevation={0}
            >
              <View style={[styles.bookCardSpine, { backgroundColor: book.is_available ? c.primary : c.onSurfaceVariant }]} />
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
                {book.author && (
                  <Text style={[styles.bookAuthor, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                    {book.author}
                  </Text>
                )}
                {book.isbn && (
                  <Text style={[styles.isbnText, { color: c.custom.textDisabled }]}>ISBN: {book.isbn}</Text>
                )}
              </View>
              <Button
                mode={book.is_available ? 'contained' : 'outlined'}
                onPress={() => openDetail(book)}
                style={book.is_available ? styles.borrowButton : styles.reserveButton}
                labelStyle={styles.buttonLabel}
                compact
                disabled={reservingId === book.id}
                loading={reservingId === book.id}
              >
                {book.is_available ? 'Mượn' : 'Đặt chỗ'}
              </Button>
            </Surface>
          ))
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={detailVisible}
          onDismiss={() => setDetailVisible(false)}
          contentContainerStyle={[styles.detailModal, { backgroundColor: c.surface }]}
        >
          {detailLoading ? (
            <View style={styles.detailLoading}>
              <MaterialCommunityIcons name="loading" size={36} color={c.primary} />
              <Text style={{ color: c.onSurfaceVariant, marginTop: 8 }}>Đang tải...</Text>
            </View>
          ) : detailBook ? (
            <ScrollView>
              <View style={styles.detailHeader}>
                {detailBook.cover_url && (
                  <Image source={{ uri: detailBook.cover_url }} style={styles.detailCover} />
                )}
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailTitle, { color: c.onSurface }]}>{detailBook.title}</Text>
                  {detailBook.author && (
                    <Text style={[styles.detailAuthor, { color: c.onSurfaceVariant }]}>{detailBook.author}</Text>
                  )}
                  {detailBook.publisher && (
                    <Text style={[styles.detailMeta, { color: c.custom.textDisabled }]}>{detailBook.publisher}</Text>
                  )}
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

              {detailBook.description && (
                <Text style={[styles.detailDescription, { color: c.onSurfaceVariant }]} numberOfLines={6}>
                  {detailBook.description}
                </Text>
              )}

              <View style={styles.detailActions}>
                {detailBook.available_copies > 0 ? (
                  <Button mode="contained" onPress={() => {}} style={styles.detailBorrowButton} disabled>
                    Mượn tại thư viện
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
            <View style={styles.detailLoading}>
              <Text style={{ color: c.onSurfaceVariant }}>Không thể tải thông tin sách</Text>
            </View>
          )}
        </Modal>
      </Portal>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={3000}
        style={{ backgroundColor: c.inverseSurface }}
        action={{ label: 'OK', onPress: () => setSnackVisible(false) }}
      >
        <Text style={{ color: c.inverseOnSurface }}>{snackMsg}</Text>
      </Snackbar>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      backgroundColor: c.surfaceVariant,
      borderRadius: 10,
      paddingHorizontal: 12,
      gap: 6,
    },
    searchInput: { flex: 1, backgroundColor: 'transparent', height: 44 },
    searchContent: { height: 44, paddingHorizontal: 0 },
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
    bookCard: {
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 10,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: 0.5,
      alignItems: 'center',
    },
    bookCardSpine: { width: 4, alignSelf: 'stretch' },
    bookCover: { width: 48, height: 66, borderRadius: 4, margin: 10, marginRight: 0 },
    bookCoverPlaceholder: {
      width: 48,
      height: 66,
      borderRadius: 4,
      margin: 10,
      marginRight: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookContent: { flex: 1, padding: 10, gap: 2 },
    bookTitle: { fontWeight: '600', fontSize: 14, lineHeight: 18 },
    bookAuthor: { fontSize: 12 },
    isbnText: { fontSize: 10, marginTop: 2 },
    borrowButton: { margin: 10, borderRadius: 6 },
    reserveButton: { margin: 10, borderRadius: 6, borderColor: c.primary },
    buttonLabel: { fontSize: 12 },
    detailModal: { margin: 16, borderRadius: 12, padding: 16, maxHeight: '80%' },
    detailLoading: { padding: 32, alignItems: 'center' },
    detailHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    detailCover: { width: 80, height: 110, borderRadius: 6 },
    detailInfo: { flex: 1, gap: 4 },
    detailTitle: { fontWeight: '700', fontSize: 16, lineHeight: 20 },
    detailAuthor: { fontSize: 13 },
    detailMeta: { fontSize: 11 },
    detailAvailability: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    detailAvailabilityText: { fontSize: 13, fontWeight: '600' },
    detailDescription: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
    detailActions: { gap: 8 },
    detailBorrowButton: { borderRadius: 8 },
    detailReserveButton: { borderRadius: 8 },
  });
}