import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text, Button, Surface, TextInput, ActivityIndicator, Card, Divider, useTheme,
} from 'react-native-paper';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { borrowApi } from '../api/borrow';
import { openLibraryApi } from '../api/openlibrary';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Book, OpenLibraryBook } from '../types';
import { AppTheme } from '../theme/DarkTheme';
import { devError, devLog } from '../utils/logger';

export default function BorrowScreen() {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
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
    } finally {
      setIsLoadingQuota(false);
    }
  };

  useEffect(() => {
    if (patron) loadPatronQuota();
  }, [patron]);

  useEffect(() => {
    if (!scanned && patron) loadPatronQuota();
  }, [scanned]);

  const searchBook = async (isbnToSearch: string) => {
    if (!isbnToSearch.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      try {
        const localBookData = await borrowApi.getBook(isbnToSearch.trim());
        setLocalBook(localBookData);
      } catch {}
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
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.permissionContainer, { backgroundColor: c.background }]} edges={['bottom']}>
        <Text style={[styles.permissionText, { color: c.onSurface }]}>Cần quyền camera để quét mã vạch</Text>
        <Button mode="contained" onPress={requestPermission} style={styles.permissionButton}>
          Cấp quyền
        </Button>
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: c.outlineVariant }]} />
          <Text style={[styles.orText, { color: c.onSurfaceVariant }]}>hoặc nhập ISBN thủ công</Text>
          <View style={[styles.dividerLine, { backgroundColor: c.outlineVariant }]} />
        </View>
        <TextInput
          label="ISBN"
          value={isbn}
          onChangeText={setIsbn}
          mode="outlined"
          style={styles.isbnInput}
          outlineStyle={{ borderRadius: 6, borderColor: c.outlineVariant }}
          activeOutlineColor={c.primary}
          right={<TextInput.Icon icon="magnify" onPress={() => searchBook(isbn)} color={c.primary} testID="search-button-permission" />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <View style={[styles.scanTopBar, { backgroundColor: c.surface, borderBottomColor: c.outlineVariant }]}>
        <View>
          <Text style={[styles.topBarTitle, { color: c.onSurface }]} numberOfLines={1}>
            Mượn sách
          </Text>
          <Text style={[styles.topBarSub, { color: c.onSurfaceVariant }]} numberOfLines={1}>
            {patron?.full_name || patron?.student_code || ''}
          </Text>
        </View>
        {isLoadingQuota ? (
          <ActivityIndicator size={16} color={c.primary} />
        ) : (
          <View style={[
            styles.quotaPill,
            { backgroundColor: c.surfaceVariant },
            overdueCount > 0 && styles.quotaPillOverdue,
            !canBorrow && overdueCount === 0 && styles.quotaPillFull,
          ]}>
            <MaterialCommunityIcons
              name={overdueCount > 0 ? 'alert-circle' : remaining > 0 ? 'book-check' : 'book-off'}
              size={14}
              color={overdueCount > 0 ? c.error : remaining > 0 ? '#4A8C5C' : c.onSurfaceVariant}
            />
            <Text style={[
              styles.quotaPillText,
              { color: c.onSurface },
              overdueCount > 0 && { color: c.error },
            ]}>
              {overdueCount > 0
                ? `${overdueCount} quá hạn`
                : `Còn ${remaining}/${MAX_BORROW_BOOKS}`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.scannerContainer}>
        {!scanned ? (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.topLeft, { borderColor: c.primary }]} />
                <View style={[styles.corner, styles.topRight, { borderColor: c.primary }]} />
                <View style={[styles.corner, styles.bottomLeft, { borderColor: c.primary }]} />
                <View style={[styles.corner, styles.bottomRight, { borderColor: c.primary }]} />
              </View>
              <Text style={[styles.scanText, { color: c.onSurface }]}>Đặt mã vạch trong khung hình</Text>
            </View>

            {!canBorrow && (
              <View style={[styles.blockOverlay, { backgroundColor: theme.dark ? 'rgba(13,17,23,0.88)' : 'rgba(246,248,251,0.92)' }]}>
                <MaterialCommunityIcons
                  name={overdueCount > 0 ? 'calendar-remove' : 'book-off'}
                  size={40}
                  color={c.onSurfaceVariant}
                />
                <Text style={[styles.blockTitle, { color: c.onSurface }]}>
                  {overdueCount > 0 ? 'Có sách quá hạn' : 'Đã mượn đủ sách'}
                </Text>
                <Text style={[styles.blockSub, { color: c.onSurfaceVariant }]}>
                  {overdueCount > 0
                    ? `Bạn có ${overdueCount} sách quá hạn. Vui lòng trả trước khi mượn thêm.`
                    : `Bạn đã mượn tối đa ${MAX_BORROW_BOOKS} cuốn. Vui lòng trả sách trước khi mượn thêm.`}
                </Text>
              </View>
            )}

            <Surface style={[styles.manualInput, { backgroundColor: c.surface, borderTopColor: c.outlineVariant }]} elevation={0}>
              <View style={[styles.manualAccent, { backgroundColor: c.primary }]} />
              <Text style={[styles.manualLabel, { color: c.onSurfaceVariant }]}>Hoặc nhập ISBN thủ công:</Text>
              <TextInput
                label="ISBN"
                value={isbn}
                onChangeText={setIsbn}
                mode="outlined"
                style={styles.isbnInputFull}
                outlineStyle={{ borderRadius: 6, borderColor: c.outlineVariant }}
                activeOutlineColor={c.primary}
                right={<TextInput.Icon icon="magnify" onPress={() => searchBook(isbn)} disabled={isSearching || !canBorrow} color={c.primary} testID="search-button" />}
              />
            </Surface>
          </>
        ) : (
          <ScrollView style={styles.resultContainer} contentContainerStyle={styles.resultContent}>
            {isSearching ? (
              <ActivityIndicator size="large" color={c.primary} style={styles.loader} />
            ) : searchError ? (
              <Card style={[styles.errorCard, { backgroundColor: c.surface, borderColor: c.outlineVariant }]}>
                <View style={styles.errorIconContainer}>
                  <MaterialCommunityIcons name="book-search-outline" size={64} color={c.onSurfaceVariant} />
                </View>
                <Text variant="titleMedium" style={[styles.errorTitle, { color: c.onSurface }]}>Không tìm thấy sách</Text>
                <Text variant="bodyMedium" style={[styles.errorMessage, { color: c.onSurfaceVariant }]}>{searchError}</Text>
                {isbn ? <Text variant="bodySmall" style={[styles.errorIsbn, { color: c.onSurfaceVariant }]}>ISBN: {isbn}</Text> : null}
                <Button mode="contained" onPress={searchAgain} style={styles.retryButton} icon="barcode-scan">
                  Quét lại
                </Button>
              </Card>
            ) : displayBook ? (
              <Card style={[styles.bookCard, { backgroundColor: c.surface, borderColor: c.outlineVariant }]}>
                <View style={[styles.cardAccent, { backgroundColor: c.primary }]} />
                {displayBook.cover?.medium ? (
                  <Card.Cover source={{ uri: displayBook.cover.medium }} style={styles.cover} />
                ) : (
                  <View style={[styles.coverPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                    <MaterialCommunityIcons name="book-open-variant" size={48} color={c.onSurfaceVariant} />
                    <Text style={[styles.coverPlaceholderText, { color: c.onSurfaceVariant }]}>Không có ảnh</Text>
                  </View>
                )}
                <Card.Content>
                  <Text variant="titleLarge" style={[styles.bookTitle, { color: c.onSurface }]}>{displayBook.title}</Text>
                  {'authors' in displayBook && displayBook.authors && displayBook.authors.length > 0 ? (
                    <Text variant="bodyMedium" style={[styles.bookAuthor, { color: c.onSurfaceVariant }]}>{displayBook.authors.map(a => a.name).join(', ')}</Text>
                  ) : 'author' in displayBook && displayBook.author ? (
                    <Text variant="bodyMedium" style={[styles.bookAuthor, { color: c.onSurfaceVariant }]}>{displayBook.author}</Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    {'publish_date' in displayBook && displayBook.publish_date ? (
                      <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="calendar" size={14} color={c.onSurfaceVariant} />
                        <Text style={[styles.metaText, { color: c.onSurfaceVariant }]}>{displayBook.publish_date}</Text>
                      </View>
                    ) : null}
                    {'number_of_pages' in displayBook && displayBook.number_of_pages ? (
                      <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="book-open-page-variant" size={14} color={c.onSurfaceVariant} />
                        <Text style={[styles.metaText, { color: c.onSurfaceVariant }]}>{displayBook.number_of_pages} trang</Text>
                      </View>
                    ) : null}
                  </View>
                  {localBook?.shelf_location && (
                    <Text variant="bodySmall" style={[styles.locationLabel, { color: c.primary }]}>
                      <MaterialCommunityIcons name="map-marker" size={13} color={c.primary} /> Vị trí: {localBook.shelf_location}
                    </Text>
                  )}
                  {!canBorrow && (
                    <View style={[styles.quotaWarningBox, { backgroundColor: theme.dark ? 'rgba(196,78,78,0.12)' : 'rgba(196,78,78,0.08)', borderColor: theme.dark ? 'rgba(196,78,78,0.3)' : 'rgba(196,78,78,0.2)' }]}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={16} color={c.error} />
                      <Text style={[styles.quotaWarningText, { color: c.error }]}>
                        {overdueCount > 0
                          ? 'Bạn có sách quá hạn, không thể mượn thêm'
                          : 'Bạn đã mượn đủ 3 cuốn, không thể mượn thêm'}
                      </Text>
                    </View>
                  )}
                </Card.Content>
                <Card.Actions style={styles.cardActions}>
                  <Button mode="outlined" onPress={searchAgain} style={styles.cardActionButton} labelStyle={{ fontSize: 13, fontWeight: '600' }}>
                    Quét lại
                  </Button>
                  <Button mode="contained" onPress={handleBorrow} loading={isBorrowing} disabled={isBorrowing || !canBorrow} style={styles.cardActionButton} labelStyle={{ fontSize: 13, fontWeight: '600' }}>
                    Xác nhận mượn
                  </Button>
                </Card.Actions>
              </Card>
            ) : null}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1 },
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    permissionText: { fontSize: 16, marginBottom: 16, textAlign: 'center' },
    permissionButton: { borderRadius: 6 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, paddingHorizontal: 16 },
    dividerLine: { flex: 1, height: 1 },
    orText: { marginHorizontal: 12, fontSize: 12 },
    isbnInput: { width: '80%', marginTop: 4, backgroundColor: 'transparent' },
    scannerContainer: { flex: 1, position: 'relative' },
    camera: { flex: 1 },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    scanArea: { width: 280, height: 150, borderRadius: 8, position: 'relative' },
    corner: { position: 'absolute', width: 36, height: 36, borderWidth: 2 },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
    scanText: { marginTop: 20, fontSize: 16, textAlign: 'center', fontWeight: '500' },
    manualInput: { padding: 16, position: 'relative', overflow: 'hidden', borderTopWidth: 0.5 },
    manualAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
    manualLabel: { marginBottom: 8, fontSize: 13 },
    isbnInputFull: { marginTop: 4, backgroundColor: 'transparent' },
    resultContainer: { flex: 1, padding: 16 },
    resultContent: { flexGrow: 1, justifyContent: 'center' },
    loader: { alignSelf: 'center' },
    bookCard: { borderRadius: 8, overflow: 'hidden', position: 'relative', borderWidth: 0.5 },
    cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, zIndex: 1 },
    cover: { height: 280, resizeMode: 'contain' },
    coverPlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center' },
    coverPlaceholderText: { marginTop: 8, fontSize: 13 },
    bookTitle: { marginTop: 12, fontWeight: '700', fontSize: 20 },
    bookAuthor: { marginTop: 4, fontSize: 14 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 16 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 13 },
    locationLabel: { marginTop: 4, fontSize: 13, fontWeight: '600' },
    cardActions: { padding: 12, gap: 8 },
    cardActionButton: { borderRadius: 6 },
    errorCard: { borderRadius: 8, padding: 32, alignItems: 'center', borderWidth: 0.5 },
    errorIconContainer: { marginBottom: 16 },
    errorTitle: { fontWeight: '700', marginBottom: 8 },
    errorMessage: { textAlign: 'center', marginBottom: 4 },
    errorIsbn: { marginTop: 8, marginBottom: 20, fontSize: 12 },
    retryButton: { borderRadius: 6, marginTop: 12 },
    quotaWarningBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, borderRadius: 6, borderWidth: 1 },
    quotaWarningText: { fontSize: 13, flex: 1 },
    scanTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    topBarTitle: { fontSize: 17, fontWeight: '800' },
    topBarSub: { fontSize: 12, marginTop: 1 },
    quotaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    quotaPillOverdue: { backgroundColor: 'rgba(196, 78, 78, 0.15)' },
    quotaPillFull: { backgroundColor: 'rgba(90, 85, 80, 0.25)' },
    quotaPillText: { fontSize: 13, fontWeight: '700' },
    blockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 8 },
    blockTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
    blockSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  });
}
