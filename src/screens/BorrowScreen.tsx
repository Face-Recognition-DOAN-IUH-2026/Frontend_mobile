import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Surface, TextInput, ActivityIndicator, Card, Divider } from 'react-native-paper';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { borrowApi } from '../api/borrow';
import { openLibraryApi } from '../api/openlibrary';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Book, OpenLibraryBook } from '../types';
import { colors } from '../theme/colors';
import { devError, devLog } from '../utils/logger';

export default function BorrowScreen() {
  const { patron } = useAuth();
  const [scanned, setScanned] = useState(false);
  const [isbn, setIsbn] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [book, setBook] = useState<OpenLibraryBook | null>(null);
  const [localBook, setLocalBook] = useState<Book | null>(null);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [activeCount, setActiveCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);
  const [borrowStep, setBorrowStep] = useState<'confirm' | 'scan'>('confirm');

  const MAX_BORROW_BOOKS = 3;
  const remaining = MAX_BORROW_BOOKS - activeCount;
  const canBorrow = remaining > 0 && overdueCount === 0;

  const loadPatronQuota = async () => {
    if (!patron?.student_code) return;
    setIsLoadingQuota(true);
    try {
      const data = await borrowApi.getActiveBorrowsByStudentCode(patron.student_code);
      setActiveCount(data.total ?? 0);
      setOverdueCount(data.overdue_count ?? 0);
    } catch {
      // silently fail
    } finally {
      setIsLoadingQuota(false);
    }
  };

  useEffect(() => {
    if (patron) {
      loadPatronQuota();
    }
  }, [patron]);

  useEffect(() => {
    if (!scanned && patron) {
      loadPatronQuota();
    }
  }, [scanned]);

  const searchBook = async (isbnToSearch: string) => {
    if (!isbnToSearch.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      try {
        const localBookData = await borrowApi.getBook(isbnToSearch.trim());
        setLocalBook(localBookData);
      } catch {
        // local not found, try OpenLibrary
      }

      const openLibraryBook = await openLibraryApi.getBookByIsbn(isbnToSearch.trim());
      if (openLibraryBook) {
        setBook(openLibraryBook);
      } else if (!localBook) {
        setSearchError('Không tìm thấy sách với ISBN này');
      }
    } catch (error) {
      devError('[Borrow] Search error:', error);
      setSearchError('Không thể tìm kiếm sách');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || !result.data) return;
    setScanned(true);
    setIsbn(result.data);
    searchBook(result.data);
  };

  const handleBorrow = async () => {
    if (!isbn.trim()) return;
    if (!canBorrow) {
      Alert.alert('Không thể mượn', overdueCount > 0
        ? 'Bạn có sách quá hạn, không thể mượn thêm'
        : 'Bạn đã mượn đủ 3 cuốn, không thể mượn thêm');
      return;
    }
    setIsBorrowing(true);
    try {
      const patronData = await authApi.getCurrentPatron();
      const status = patronData.current_status || patronData.currentStatus;
      if (status !== 'inside') {
        Alert.alert('Không thể mượn', 'Bạn phải đi qua cổng vào thư viện trước khi mượn sách');
        setIsBorrowing(false);
        return;
      }

      const result = await borrowApi.borrowBook(isbn.trim());
      if (result.status === 'success') {
        Alert.alert('Thành công', result.message, [
          { text: 'OK', onPress: () => resetState() },
        ]);
      }
    } catch (error: any) {
      let msg = 'Mượn sách thất bại';
      if (!error.response) msg = 'Không thể kết nối server. Vui lòng kiểm tra mạng.';
      else if (error.response?.status === 401) msg = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
      else if (error.response?.data?.detail) msg = error.response.data.detail;
      Alert.alert('Lỗi', msg);
    } finally {
      setIsBorrowing(false);
    }
  };

  const resetState = () => {
    setScanned(false);
    setIsbn('');
    setBook(null);
    setLocalBook(null);
    setSearchError(null);
    loadPatronQuota();
  };

  const searchAgain = () => {
    setScanned(false);
    setBook(null);
    setLocalBook(null);
    setSearchError(null);
  };

  const displayBook = book || (localBook ? {
    title: localBook.title,
    author: localBook.author,
    cover: localBook.cover_url ? { medium: localBook.cover_url } : undefined,
    authors: localBook.author ? [{ name: localBook.author }] : undefined,
    publish_date: localBook.publish_year?.toString(),
    number_of_pages: localBook.pages,
    publishers: localBook.publisher ? [localBook.publisher] : undefined,
  } : null);

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['bottom']}>
        <Text style={styles.permissionText}>Cần quyền camera để quét mã vạch</Text>
        <Button mode="contained" onPress={requestPermission} style={styles.permissionButton}>
          Cấp quyền
        </Button>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.orText}>hoặc nhập ISBN thủ công</Text>
          <View style={styles.dividerLine} />
        </View>
        <TextInput
          label="ISBN"
          value={isbn}
          onChangeText={setIsbn}
          mode="outlined"
          style={styles.isbnInput}
          outlineStyle={styles.inputOutline}
          activeOutlineColor={colors.primary}
          right={<TextInput.Icon icon="magnify" onPress={() => searchBook(isbn)} color={colors.primary} testID="search-button-permission" />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {borrowStep === 'confirm' ? (
        <View style={styles.confirmContainer}>
          <View style={styles.confirmHeader}>
            <Text variant="labelMedium" style={styles.confirmKicker}>Xác nhận thông tin</Text>
            <Text variant="headlineSmall" style={styles.confirmTitle}>Mượn sách tại quầy</Text>
          </View>

          <Card style={styles.patronCard}>
            <Card.Content style={styles.patronCardContent}>
              <View style={styles.patronAvatar}>
                <Text style={styles.patronAvatarText}>
                  {(patron?.full_name || patron?.student_code || '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.patronInfo}>
                <Text variant="titleMedium" style={styles.patronName} numberOfLines={1}>
                  {patron?.full_name || 'Không rõ tên'}
                </Text>
                <Text variant="bodySmall" style={styles.patronMssv}>
                  MSSV: {patron?.student_code || '—'}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {isLoadingQuota ? (
            <ActivityIndicator color={colors.primary} style={styles.quotaLoader} />
          ) : (
            <View style={[styles.quotaBanner, !canBorrow && overdueCount > 0 ? styles.quotaBannerError : !canBorrow ? styles.quotaBannerWarning : styles.quotaBannerOk]}>
              <MaterialCommunityIcons
                name={canBorrow ? 'check-circle' : 'alert-circle'}
                size={18}
                color={canBorrow ? colors.success : colors.error}
              />
              <Text style={[styles.quotaText, !canBorrow && styles.quotaTextError]}>
                {overdueCount > 0
                  ? `Có ${overdueCount} sách quá hạn - không thể mượn thêm`
                  : remaining > 0
                    ? `Còn có thể mượn ${remaining} cuốn`
                    : 'Đã mượn đủ 3 cuốn - không thể mượn thêm'}
              </Text>
            </View>
          )}

          <View style={styles.confirmActions}>
            <Button
              mode="contained"
              onPress={() => setBorrowStep('scan')}
              disabled={!canBorrow || isLoadingQuota}
              style={styles.confirmButton}
              contentStyle={styles.confirmButtonContent}
              icon="book-plus"
            >
              {!canBorrow ? 'Không thể mượn thêm' : 'Bắt đầu quét sách'}
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.scanStepContainer}>
          <View style={styles.scanTopBar}>
            <Button mode="text" compact onPress={() => { setBorrowStep('confirm'); searchAgain(); }} icon="arrow-left">
              Đổi patron
            </Button>
            <View style={styles.scanQuotaSmall}>
              <MaterialCommunityIcons
                name={canBorrow ? 'check-circle' : 'alert-circle'}
                size={14}
                color={canBorrow ? colors.success : colors.error}
              />
              <Text style={[styles.scanQuotaText, !canBorrow && styles.scanQuotaTextError]}>
                {remaining > 0 ? `Còn ${remaining} cuốn` : 'Đã đủ'}
              </Text>
            </View>
          </View>

          {!scanned ? (
            <View style={styles.scannerContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
                }}
                onBarcodeScanned={handleBarCodeScanned}
              />
              <View style={styles.overlay}>
                <View style={styles.scanArea}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Text style={styles.scanText}>Đặt mã vạch trong khung hình</Text>
              </View>

              <Surface style={styles.manualInput} elevation={0}>
                <View style={styles.manualAccent} />
                <Text variant="bodyMedium" style={styles.manualLabel}>Hoặc nhập ISBN thủ công:</Text>
                <TextInput
                  label="ISBN"
                  value={isbn}
                  onChangeText={setIsbn}
                  mode="outlined"
                  style={styles.isbnInputFull}
                  outlineStyle={styles.inputOutline}
                  activeOutlineColor={colors.primary}
                  right={<TextInput.Icon icon="magnify" onPress={() => searchBook(isbn)} disabled={isSearching} color={colors.primary} testID="search-button" />}
                />
              </Surface>
            </View>
          ) : (
            <ScrollView style={styles.resultContainer} contentContainerStyle={styles.resultContent}>
              {isSearching ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : searchError ? (
                <Card style={styles.errorCard}>
                  <View style={styles.errorIconContainer}>
                    <MaterialCommunityIcons name="book-search-outline" size={64} color={colors.textSecondary} />
                  </View>
                  <Text variant="titleMedium" style={styles.errorTitle}>Không tìm thấy sách</Text>
                  <Text variant="bodyMedium" style={styles.errorMessage}>{searchError}</Text>
                  {isbn ? <Text variant="bodySmall" style={styles.errorIsbn}>ISBN: {isbn}</Text> : null}
                  <Button mode="contained" onPress={searchAgain} style={styles.retryButton} icon="barcode-scan">
                    Quét lại
                  </Button>
                </Card>
              ) : displayBook ? (
                <Card style={styles.bookCard}>
                  <View style={styles.cardAccent} />
                  {displayBook.cover?.medium ? (
                    <Card.Cover source={{ uri: displayBook.cover.medium }} style={styles.cover} />
                  ) : (
                    <View style={styles.coverPlaceholder}>
                      <MaterialCommunityIcons name="book-open-variant" size={48} color={colors.textSecondary} />
                      <Text style={styles.coverPlaceholderText}>Không có ảnh</Text>
                    </View>
                  )}
                  <Card.Content>
                    <Text variant="titleLarge" style={styles.bookTitle}>{displayBook.title}</Text>
                    {'authors' in displayBook && displayBook.authors && displayBook.authors.length > 0 ? (
                      <Text variant="bodyMedium" style={styles.bookAuthor}>{displayBook.authors.map(a => a.name).join(', ')}</Text>
                    ) : 'author' in displayBook && displayBook.author ? (
                      <Text variant="bodyMedium" style={styles.bookAuthor}>{displayBook.author}</Text>
                    ) : null}

                    <View style={styles.metaRow}>
                      {'publish_date' in displayBook && displayBook.publish_date ? (
                        <View style={styles.metaItem}>
                          <MaterialCommunityIcons name="calendar" size={14} color={colors.textSecondary} />
                          <Text style={styles.metaText}>{displayBook.publish_date}</Text>
                        </View>
                      ) : null}
                      {'number_of_pages' in displayBook && displayBook.number_of_pages ? (
                        <View style={styles.metaItem}>
                          <MaterialCommunityIcons name="book-open-page-variant" size={14} color={colors.textSecondary} />
                          <Text style={styles.metaText}>{displayBook.number_of_pages} trang</Text>
                        </View>
                      ) : null}
                    </View>

                    {localBook?.shelf_location && (
                      <Text variant="bodySmall" style={styles.locationLabel}>
                        <MaterialCommunityIcons name="map-marker" size={13} color={colors.primary} /> Vị trí: {localBook.shelf_location}
                      </Text>
                    )}

                    {!canBorrow && (
                      <View style={styles.quotaWarningBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
                        <Text style={styles.quotaWarningText}>
                          {overdueCount > 0
                            ? 'Bạn có sách quá hạn, không thể mượn thêm'
                            : 'Bạn đã mượn đủ 3 cuốn, không thể mượn thêm'}
                        </Text>
                      </View>
                    )}
                  </Card.Content>
                  <Card.Actions style={styles.cardActions}>
                    <Button mode="outlined" onPress={searchAgain} style={styles.cardActionButton} labelStyle={styles.cardActionButtonLabel}>
                      Quét lại
                    </Button>
                    <Button mode="contained" onPress={handleBorrow} loading={isBorrowing} disabled={isBorrowing || !canBorrow} style={styles.cardActionButton} labelStyle={styles.cardActionButtonLabel}>
                      Xác nhận mượn
                    </Button>
                  </Card.Actions>
                </Card>
              ) : null}
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  permissionText: { color: colors.text, fontSize: 16, marginBottom: 16, textAlign: 'center' },
  permissionButton: { borderRadius: 6 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, paddingHorizontal: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  orText: { color: colors.textSecondary, marginHorizontal: 12, fontSize: 12 },
  isbnInput: { width: '80%', marginTop: 4, backgroundColor: 'transparent' },
  inputOutline: { borderRadius: 6, borderColor: colors.border },
  scannerContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scanArea: { width: 280, height: 150, borderRadius: 8, position: 'relative' },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: colors.primary, borderWidth: 2 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanText: { color: colors.text, marginTop: 20, fontSize: 16, textAlign: 'center', fontWeight: '500' },
  manualInput: { padding: 16, backgroundColor: colors.surface, position: 'relative', overflow: 'hidden', borderTopWidth: 0.5, borderTopColor: colors.border },
  manualAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.primary },
  manualLabel: { color: colors.textSecondary, marginBottom: 8, fontSize: 13 },
  isbnInputFull: { marginTop: 4, backgroundColor: 'transparent' },
  resultContainer: { flex: 1, padding: 16 },
  resultContent: { flexGrow: 1, justifyContent: 'center' },
  loader: { alignSelf: 'center' },
  bookCard: { backgroundColor: colors.surface, borderRadius: 8, overflow: 'hidden', position: 'relative', borderWidth: 0.5, borderColor: colors.border },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.primary, zIndex: 1 },
  cover: { height: 280, resizeMode: 'contain', backgroundColor: colors.surfaceVariant },
  coverPlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceVariant },
  coverPlaceholderText: { color: colors.textSecondary, marginTop: 8, fontSize: 13 },
  bookTitle: { color: colors.text, marginTop: 12, fontWeight: '700', fontSize: 20 },
  bookAuthor: { color: colors.textSecondary, marginTop: 4, fontSize: 14 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.textSecondary, fontSize: 13 },
  locationLabel: { color: colors.primary, marginTop: 4, fontSize: 13, fontWeight: '600' },
  cardActions: { padding: 12, gap: 8 },
  cardActionButton: { borderRadius: 6 },
  cardActionButtonLabel: { fontSize: 13, fontWeight: '600' },
  errorCard: { backgroundColor: colors.surface, borderRadius: 8, padding: 32, alignItems: 'center', borderWidth: 0.5, borderColor: colors.border },
  errorIconContainer: { marginBottom: 16 },
  errorTitle: { color: colors.text, fontWeight: '700', marginBottom: 8 },
  errorMessage: { color: colors.textSecondary, textAlign: 'center', marginBottom: 4 },
  errorIsbn: { color: colors.textSecondary, marginTop: 8, marginBottom: 20, fontSize: 12 },
  retryButton: { borderRadius: 6, marginTop: 12 },
  quotaLoading: { paddingVertical: 8, alignItems: 'center' },
  quotaBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  quotaBannerOk: { backgroundColor: colors.surfaceVariant },
  quotaBannerWarning: { backgroundColor: 'rgba(196, 154, 60, 0.15)' },
  quotaBannerError: { backgroundColor: 'rgba(196, 78, 78, 0.15)' },
  quotaText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  quotaTextError: { color: colors.error },
  quotaWarningBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, borderRadius: 6, backgroundColor: 'rgba(196, 78, 78, 0.12)', borderWidth: 1, borderColor: 'rgba(196, 78, 78, 0.3)' },
  quotaWarningText: { color: colors.error, fontSize: 13, flex: 1 },
  quotaLoader: { alignSelf: 'center', marginVertical: 16 },
  confirmContainer: { flex: 1, padding: 20, justifyContent: 'center', gap: 20 },
  confirmHeader: { alignItems: 'center', gap: 4 },
  confirmKicker: { color: colors.primary, fontWeight: '800', textTransform: 'uppercase', fontSize: 12 },
  confirmTitle: { color: colors.text, fontWeight: '800', fontSize: 22 },
  patronCard: { backgroundColor: colors.surface, borderRadius: 12, borderColor: colors.border },
  patronCardContent: { padding: 16 },
  patronAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  patronAvatarText: { color: colors.background, fontWeight: '900', fontSize: 28 },
  patronInfo: { alignItems: 'center', gap: 4 },
  patronName: { color: colors.text, fontWeight: '700', fontSize: 18 },
  patronMssv: { color: colors.textSecondary, fontSize: 13 },
  confirmActions: { marginTop: 8 },
  confirmButton: { borderRadius: 8 },
  confirmButtonContent: { minHeight: 52 },
  scanStepContainer: { flex: 1 },
  scanTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  scanQuotaSmall: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: colors.surfaceVariant },
  scanQuotaText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  scanQuotaTextError: { color: colors.error },
});
