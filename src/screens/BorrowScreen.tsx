import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Surface, TextInput, ActivityIndicator, Card } from 'react-native-paper';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
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
  const [permission, requestPermission] = useCameraPermissions();

  const searchBook = async (isbnToSearch: string) => {
    if (!isbnToSearch.trim()) return;

    setIsSearching(true);
    try {
      try {
        const localBookData = await borrowApi.getBook(isbnToSearch.trim());
        setLocalBook(localBookData);
      } catch {
      }

      const openLibraryBook = await openLibraryApi.getBookByIsbn(isbnToSearch.trim());
      if (openLibraryBook) {
        setBook(openLibraryBook);
      } else if (!localBook) {
        Alert.alert('Không tìm thấy', 'Không tìm thấy sách với ISBN này');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Lỗi', 'Không thể tìm kiếm sách');
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

    setIsBorrowing(true);
    try {
      try {
        const patronData = await authApi.getCurrentPatron();
        const status = patronData.current_status || patronData.currentStatus;
        if (status !== 'inside') {
          Alert.alert('Không thể mượn', 'Bạn phải đi qua cổng vào thư viện trước khi mượn sách');
          setIsBorrowing(false);
          return;
        }
      } catch (checkError) {
        console.error('Failed to check patron status:', checkError);
        Alert.alert('Lỗi', 'Không thể xác minh trạng thái. Vui lòng thử lại.');
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
      const message = error?.response?.data?.detail || 'Mượn sách thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setIsBorrowing(false);
    }
  };

  const resetState = () => {
    setScanned(false);
    setIsbn('');
    setBook(null);
    setLocalBook(null);
  };

  const displayBook = book || (localBook ? {
    title: localBook.title,
    author: localBook.author,
    cover: localBook.cover_url ? { medium: localBook.cover_url } : undefined
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
          right={<TextInput.Icon icon="magnify" onPress={() => searchBook(isbn)} color={colors.primary} />}
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
          >
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.scanText}>Đặt mã vạch trong khung hình</Text>
            </View>
          </CameraView>

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
              right={<TextInput.Icon icon="magnify" onPress={() => searchBook(isbn)} disabled={isSearching} color={colors.primary} />}
            />
          </Surface>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          {isSearching ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : displayBook ? (
            <Card style={styles.bookCard}>
              <View style={styles.cardAccent} />
              {displayBook.cover?.medium && (
                <Card.Cover source={{ uri: displayBook.cover.medium }} style={styles.cover} />
              )}
              <Card.Content>
                <Text variant="titleLarge" style={styles.bookTitle}>
                  {displayBook.title}
                </Text>
                {'authors' in displayBook && displayBook.authors ? (
                  <Text variant="bodyMedium" style={styles.bookAuthor}>
                    {displayBook.authors[0]?.name}
                  </Text>
                ) : 'author' in displayBook && displayBook.author ? (
                  <Text variant="bodyMedium" style={styles.bookAuthor}>
                    {displayBook.author}
                  </Text>
                ) : null}
                <Text variant="bodySmall" style={styles.isbnLabel}>
                  ISBN: {isbn}
                </Text>
                {localBook?.shelf_location && (
                  <Text variant="bodySmall" style={styles.locationLabel}>
                    Vị trí: {localBook.shelf_location}
                  </Text>
                )}
              </Card.Content>
              <Card.Actions style={styles.cardActions}>
                <Button
                  mode="outlined"
                  onPress={resetState}
                  style={styles.cardActionButton}
                  labelStyle={styles.cardActionButtonLabel}
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
                >
                  Xác nhận mượn
                </Button>
              </Card.Actions>
            </Card>
          ) : null}
        </View>
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
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
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
    height: 200,
    resizeMode: 'contain',
    backgroundColor: colors.surfaceVariant,
  },
  bookTitle: {
    color: colors.text,
    marginTop: 12,
    fontWeight: '700',
    fontSize: 18,
  },
  bookAuthor: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 14,
  },
  isbnLabel: {
    color: colors.textSecondary,
    marginTop: 8,
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
});
