import React, { useState, useCallback, useMemo } from 'react';
import { View, Image, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, useTheme, Portal, Modal } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { borrowApi, joinWaitlist, leaveWaitlist } from '../../../api/borrow';
import { Book, BookWithStats } from '../../../types';
import { AppTheme } from '../../../theme/DarkTheme';
import { devError } from '../../../utils/logger';
import { useNetwork } from '../../../context/NetworkContext';
import {
  GradientHeader,
  SectionCard,
  FilterPill,
  EmptyState,
  GRADIENTS,
} from '../../../theme/MobileDesignSystem';
import { NoticeSnackbar } from '../../../components/NoticeSnackbar';
import { SearchField } from '../../../components/SearchField';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import SwipeReserveRow from '../../../components/SwipeReserveRow';
import { UndoBar } from '../../../components/UndoBar';
import { triggerHaptic } from '../../../utils/haptics';
import { BookCardSkeleton } from '../../../components/SkeletonLoader';

interface BookCatalogScreenProps {
  navigation: any;
}

const SPINE_COLORS = ['#1E6091', '#059669', '#D97706', '#2563EB', '#DC2626', '#154E78', '#2980B9', '#B45309'];

const CATEGORIES = [
  'Tất cả',
  'Công nghệ',
  'Kinh tế',
  'Kỹ thuật',
  'Ngoại ngữ',
  'Khoa học',
  'Văn học',
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [lastReservation, setLastReservation] = useState<{ id: string; title: string } | null>(null);
  const { isOnline } = useNetwork();

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailBook, setDetailBook] = useState<BookWithStats | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleOpenScanner = async () => {
    triggerHaptic.medium();
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền truy cập camera để quét mã vạch bìa sách.');
        return;
      }
    }
    setScannerVisible(true);
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (!data) return;
    triggerHaptic.success();
    setScannerVisible(false);
    setSearchQuery(data.trim());
  };

  const {
    data: books = [],
    error: booksError,
    isFetching,
    refetch,
  } = useQuery<Book[], Error>({
    queryKey: ['books'],
    queryFn: () => borrowApi.getBooks(0, 200),
    staleTime: 5 * 60 * 1000,
  });

  const loadError = booksError?.message || null;
  const refreshing = isFetching;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = async () => {
    await refetch();
  };

  const filtered = useMemo(() => {
    let result = books;
    if (selectedCategory && selectedCategory !== 'Tất cả') {
      const cat = selectedCategory.toLowerCase();
      result = result.filter(
        (b) =>
          b.category?.toLowerCase().includes(cat) ||
          b.title?.toLowerCase().includes(cat) ||
          b.description?.toLowerCase().includes(cat)
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q) ||
          b.isbn?.includes(q) ||
          b.category?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [books, selectedCategory, searchQuery]);

  const openDetail = async (book: Book) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const detail = await borrowApi.getBook(book.isbn);
      setDetailBook(detail);
    } catch {
      setDetailBook(null);
      setSnackMsg('Không thể tải thông tin sách');
      setSnackVisible(true);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReserve = async (bookId: string, title: string) => {
    if (!isOnline) {
      Alert.alert('Yêu cầu mạng', 'Bạn cần kết nối internet để đăng ký nhận thông báo.');
      return;
    }

    setReservingId(bookId);
    try {
      const result = await joinWaitlist(bookId);
      setLastReservation({ id: result.id, title });
      setDetailVisible(false);
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || 'Không thể đăng ký nhận thông báo';
      
      if (detail.includes('Already on waitlist')) {
        setSnackMsg('Bạn đã đăng ký nhận thông báo cho sách này rồi');
      } else {
        setSnackMsg(detail);
      }
      setSnackVisible(true);
    } finally {
      setReservingId(null);
    }
  };

  const handleSwipeReserve = async (bookId: string, title: string) => {
    if (!isOnline) {
      Alert.alert('Yêu cầu mạng', 'Bạn cần kết nối internet để đăng ký nhận thông báo.');
      return;
    }

    setReservingId(bookId);
    try {
      const result = await joinWaitlist(bookId);
      setLastReservation({ id: result.id, title });
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || 'Không thể đăng ký nhận thông báo';
      
      if (detail.includes('Already on waitlist')) {
        setSnackMsg('Bạn đã đăng ký nhận thông báo cho sách này rồi');
      } else {
        setSnackMsg(detail);
      }
      setSnackVisible(true);
    } finally {
      setReservingId(null);
    }
  };

  const handleUndoReserve = async () => {
    if (!lastReservation) return;
    try {
      await leaveWaitlist(lastReservation.id);
      setSnackMsg(`Đã hủy nhận thông báo "${lastReservation.title}"`);
      setSnackVisible(true);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || 'Không thể hủy nhận thông báo';
      setSnackMsg(msg);
      setSnackVisible(true);
    } finally {
      setLastReservation(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={[]}>
      <ScrollView
        style={styles.flex}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <GradientHeader
          title="Danh sách sách"
          subtitle={`${filtered.length} cuốn sách có sẵn`}
          icon="book-open-page-variant"
        />

        <View style={styles.searchRowWrap}>
          <View style={{ flex: 1 }}>
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Tên, tác giả, ISBN..."
              onClear={() => setSearchQuery('')}
            />
          </View>
          <TouchableOpacity
            style={[styles.barcodeScanBtn, { backgroundColor: c.primary }]}
            onPress={handleOpenScanner}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="barcode-scan" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map((cat) => (
            <FilterPill
              key={cat}
              label={cat}
              active={selectedCategory === cat}
              onPress={() => {
                triggerHaptic.selection();
                setSelectedCategory(cat);
              }}
            />
          ))}
        </ScrollView>

        {refreshing && books.length === 0 ? (
          <View style={styles.skeletonWrap}>
            <BookCardSkeleton />
            <BookCardSkeleton />
            <BookCardSkeleton />
            <BookCardSkeleton />
          </View>
        ) : loadError ? (
          <View style={styles.stateWrap}>
            <EmptyState icon="cloud-off-outline" message={loadError} />
            <Button mode="outlined" onPress={() => refetch()} style={styles.stateButton} labelStyle={styles.stateButtonLabel} icon="refresh">
              Thử lại
            </Button>
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="book-search"
            message={searchQuery || selectedCategory !== 'Tất cả' ? 'Không tìm thấy sách phù hợp' : 'Thư viện chưa có sách nào'}
          />
        ) : (
          filtered.map((book) => {
            const spineColor = getSpineColor(book.id);
            const canReserve = (book.available_copies ?? 0) === 0;
            const card = (
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
                    mode={canReserve ? 'outlined' : 'contained'}
                    onPress={() => openDetail(book)}
                    style={canReserve ? styles.reserveButton : styles.borrowButton}
                    labelStyle={styles.buttonLabel}
                    compact
                    disabled={reservingId === book.id}
                    loading={reservingId === book.id}
                  >
                    {canReserve ? 'Báo khi có sách' : 'Có sẵn tại thư viện'}
                  </Button>
                </View>
              </SectionCard>
            );

            return canReserve ? (
              <SwipeReserveRow
                key={book.id}
                onReserve={() => handleSwipeReserve(book.id, book.title)}
                disabled={reservingId === book.id}
              >
                {card}
              </SwipeReserveRow>
            ) : (
              card
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
                    Có sẵn tại thư viện
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    onPress={() => handleReserve(detailBook.id, detailBook.title)}
                    style={styles.detailReserveButton}
                    loading={reservingId === detailBook.id}
                    disabled={reservingId === detailBook.id}
                  >
                    Báo khi có sách
                  </Button>
                )}

                <Button
                  mode="outlined"
                  icon="robot"
                  onPress={() => {
                    setDetailVisible(false);
                    navigation.navigate('AIChat', {
                      initialPrompt: `Hãy tóm tắt nội dung chính và đánh giá cuốn sách "${detailBook.title}" (Tác giả: ${detailBook.author || 'Nhiều tác giả'}).`,
                    });
                  }}
                  style={styles.detailAiButton}
                  textColor={c.primary}
                >
                  Hỏi trợ lý AI về sách này
                </Button>
              </View>
            </ScrollView>
          ) : (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: c.onSurfaceVariant }}>Không thể tải thông tin sách</Text>
            </View>
          )}
        </Modal>

        {/* Camera Barcode Scanner Modal */}
        <Modal
          visible={scannerVisible}
          onDismiss={() => setScannerVisible(false)}
          contentContainerStyle={styles.scannerModal}
        >
          <View style={styles.scannerContainer}>
            <View style={styles.scannerHeader}>
              <Text variant="titleMedium" style={styles.scannerTitle}>
                Quét Mã Vạch / ISBN Sách
              </Text>
              <TouchableOpacity onPress={() => setScannerVisible(false)} style={styles.scannerCloseBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraBox}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
                }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <View style={styles.scanReticle}>
                <View style={[styles.reticleCorner, styles.tl]} />
                <View style={[styles.reticleCorner, styles.tr]} />
                <View style={[styles.reticleCorner, styles.bl]} />
                <View style={[styles.reticleCorner, styles.br]} />
              </View>
            </View>

            <Text style={styles.scannerInstruction}>
              Hướng camera vào mã vạch sau bìa sách hoặc mã ISBN
            </Text>
          </View>
        </Modal>
      </Portal>

      <NoticeSnackbar
        visible={snackVisible}
        message={snackMsg}
        severity={snackMsg.includes('thành công') ? 'success' : 'error'}
        onDismiss={() => setSnackVisible(false)}
      />

      <UndoBar
        visible={!!lastReservation}
        message={`Đã đăng ký "${lastReservation?.title ?? ''}"`}
        onUndo={handleUndoReserve}
        onDismiss={() => setLastReservation(null)}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    searchRowWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingHorizontal: 16,
      gap: 8,
    },
    barcodeScanBtn: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    skeletonWrap: {
      paddingHorizontal: 16,
      marginTop: 10,
    },
    categoryScroll: { marginTop: 10, maxHeight: 44 },
    categoryContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
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
    detailAiButton: { borderRadius: 10, borderColor: c.primary },
    scannerModal: {
      margin: 16,
      borderRadius: 20,
      backgroundColor: '#0F172A',
      overflow: 'hidden',
    },
    scannerContainer: {
      padding: 16,
      alignItems: 'center',
    },
    scannerHeader: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    scannerTitle: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    scannerCloseBtn: {
      padding: 4,
    },
    cameraBox: {
      width: '100%',
      height: 280,
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#000000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanReticle: {
      width: 220,
      height: 140,
      position: 'relative',
    },
    reticleCorner: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderColor: '#38BDF8',
    },
    tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
    tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
    br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
    scannerInstruction: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 12,
      marginTop: 12,
      textAlign: 'center',
    },
  });
}
