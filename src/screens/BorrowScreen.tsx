import React, { useState } from 'react';
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

interface BorrowScreenProps {
  navigation: any;
}

export default function BorrowScreen({ navigation }: BorrowScreenProps) {
  const { patron } = useAuth();
  const [scanned, setScanned] = useState(false);
  const [isbn, setIsbn] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [book, setBook] = useState<OpenLibraryBook | null>(null);
  const [localBook, setLocalBook] = useState<Book | null>(null);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const searchBook = async (isbnToSearch: string) => {
    if (!isbnToSearch.trim()) return;

    console.log('[Borrow] searchBook called with ISBN:', isbnToSearch);
    setIsSearching(true);
    setSearchError(null);
    try {
      try {
        console.log('[Borrow] Checking local book...');
        const localBookData = await borrowApi.getBook(isbnToSearch.trim());
        console.log('[Borrow] Local book found:', localBookData);
        setLocalBook(localBookData);
      } catch (err) {
        console.log('[Borrow] Local book not found, trying OpenLibrary');
      }

      console.log('[Borrow] Querying OpenLibrary for ISBN:', isbnToSearch);
      const openLibraryBook = await openLibraryApi.getBookByIsbn(isbnToSearch.trim());
      if (openLibraryBook) {
        console.log('[Borrow] OpenLibrary book found:', openLibraryBook.title);
        setBook(openLibraryBook);
      } else if (!localBook) {
        console.log('[Borrow] No book found anywhere');
        setSearchError('Không tìm thấy sách với ISBN này');
      }
    } catch (error) {
      console.error('[Borrow] Search error:', error);
      setSearchError('Không thể tìm kiếm sách');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || !result.data) return;
    console.log('[Borrow] Barcode scanned:', result.data);
    setScanned(true);
    setIsbn(result.data);
    searchBook(result.data);
  };

  const handleBorrow = async () => {
    if (!isbn.trim()) return;

    console.log('[Borrow] handleBorrow called, ISBN:', isbn);
    setIsBorrowing(true);
    try {
      console.log('[Borrow] Checking patron status...');
      const patronData = await authApi.getCurrentPatron();
      console.log('[Borrow] Patron data:', patronData);
      const status = patronData.current_status || patronData.currentStatus;
      console.log('[Borrow] Patron status:', status);
      if (status !== 'inside') {
        console.log('[Borrow] Patron NOT inside library, blocking borrow');
        Alert.alert('Không thể mượn', 'Bạn phải đi qua cổng vào thư viện trước khi mượn sách');
        setIsBorrowing(false);
        return;
      }
      console.log('[Borrow] Patron is inside, proceeding with borrow');

      console.log('[Borrow] Calling borrowApi.borrowBook with barcode:', isbn.trim());
      const result = await borrowApi.borrowBook(isbn.trim());
      console.log('[Borrow] borrowBook result:', result);
      if (result.status === 'success') {
        console.log('[Borrow] Borrow SUCCESS');
        Alert.alert('Thành công', result.message, [
          { text: 'OK', onPress: () => resetState() },
        ]);
      }
    } catch (error: any) {
      console.error('[Borrow] Borrow error:', error);
      console.log('[Borrow] Error response:', error.response?.data);
      let msg = 'Mượn sách thất bại';
      if (!error.response) {
        msg = 'Không thể kết nối server. Vui lòng kiểm tra mạng.';
      } else if (error.response?.status === 401) {
        msg = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
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
              {isbn ? (
                <Text variant="bodySmall" style={styles.errorIsbn}>ISBN: {isbn}</Text>
              ) : null}
              <Button
                mode="contained"
                onPress={searchAgain}
                style={styles.retryButton}
                icon="barcode-scan"
              >
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
                <Text variant="titleLarge" style={styles.bookTitle}>
                  {displayBook.title}
                </Text>
                {'authors' in displayBook && displayBook.authors && displayBook.authors.length > 0 ? (
                  <Text variant="bodyMedium" style={styles.bookAuthor}>
                    {displayBook.authors.map(a => a.name).join(', ')}
                  </Text>
                ) : 'author' in displayBook && displayBook.author ? (
                  <Text variant="bodyMedium" style={styles.bookAuthor}>
                    {displayBook.author}
                  </Text>
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

                <View style={styles.metaRow}>
                  {'publishers' in displayBook && displayBook.publishers && displayBook.publishers.length > 0 ? (
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="factory" size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>
                        {typeof displayBook.publishers[0] === 'string'
                          ? displayBook.publishers[0]
                          : displayBook.publishers[0]?.name}
                      </Text>
                    </View>
                  ) : null}
                  {'subjects' in displayBook && displayBook.subjects && displayBook.subjects.length > 0 ? (
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="tag" size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>{displayBook.subjects.slice(0, 2).map((s: any) => s.name ?? s).join(', ')}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.dividerMeta} />
                <Text variant="bodySmall" style={styles.isbnLabel}>
                  ISBN: {isbn}
                </Text>
                {localBook?.shelf_location && (
                  <Text variant="bodySmall" style={styles.locationLabel}>
                    <MaterialCommunityIcons name="map-marker" size={13} color={colors.primary} /> Vị trí: {localBook.shelf_location}
                  </Text>
                )}
              </Card.Content>
              <Card.Actions style={styles.cardActions}>
                <Button
                  mode="outlined"
                  onPress={searchAgain}
                  style={styles.cardActionButton}
                  labelStyle={styles.cardActionButtonLabel}
                  testID="rescan-button"
                >
                  Quét lại
                </Button>
                <Button
                  mode="contained"
                  onPress={handleBorrow}
                  loading={isBorrowing}
                  disabled={isBorrowing}
                  style={styles.cardActionButton}
                  labelStyle={styles.cardActionButtonLabel}
                  testID="confirm-borrow-button"
                >
                  Xác nhận mượn
                </Button>
              </Card.Actions>
            </Card>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  permissionText: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionButton: {
    borderRadius: 6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  orText: {
    color: colors.textSecondary,
    marginHorizontal: 12,
    fontSize: 12,
  },
  isbnInput: {
    width: '80%',
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  inputOutline: {
    borderRadius: 6,
    borderColor: colors.border,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 150,
    borderRadius: 8,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanText: {
    color: colors.text,
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  manualInput: {
    padding: 16,
    backgroundColor: colors.surface,
    position: 'relative',
    overflow: 'hidden',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  manualAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
  },
  manualLabel: {
    color: colors.textSecondary,
    marginBottom: 8,
    fontSize: 13,
  },
  isbnInputFull: {
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  resultContainer: {
    flex: 1,
    padding: 16,
  },
  resultContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loader: {
    alignSelf: 'center',
  },
  bookCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
    zIndex: 1,
  },
  cover: {
    height: 280,
    resizeMode: 'contain',
    backgroundColor: colors.surfaceVariant,
  },
  coverPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
  },
  coverPlaceholderText: {
    color: colors.textSecondary,
    marginTop: 8,
    fontSize: 13,
  },
  bookTitle: {
    color: colors.text,
    marginTop: 12,
    fontWeight: '700',
    fontSize: 20,
  },
  bookAuthor: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  dividerMeta: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 10,
  },
  isbnLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  locationLabel: {
    color: colors.primary,
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  cardActions: {
    padding: 12,
    gap: 8,
  },
  cardActionButton: {
    borderRadius: 6,
  },
  cardActionButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  errorIsbn: {
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 20,
    fontSize: 12,
  },
  retryButton: {
    borderRadius: 6,
    marginTop: 12,
  },
});
