import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Surface, TextInput, ActivityIndicator, Card } from 'react-native-paper';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { borrowApi } from '../api/borrow';
import { openLibraryApi } from '../api/openlibrary';
import { BorrowRecord } from '../types';
import { colors } from '../theme/colors';

interface ReturnScreenProps {
  navigation: any;
}

export default function ReturnScreen({ navigation }: ReturnScreenProps) {
  const [scanned, setScanned] = useState(false);
  const [isbn, setIsbn] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeRecord, setActiveRecord] = useState<BorrowRecord | null>(null);
  const [bookTitle, setBookTitle] = useState<string>('');
  const [bookCover, setBookCover] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const searchActiveBorrow = async (isbnToSearch: string) => {
    setIsSearching(true);
    try {
      const history = await borrowApi.getHistory('borrowed');
      if (history.length > 0) {
        setActiveRecord(history[0]);
      }

      const openLibraryBook = await openLibraryApi.getBookByIsbn(isbnToSearch.trim());
      if (openLibraryBook) {
        setBookTitle(openLibraryBook.title);
        setBookCover(openLibraryBook.cover?.medium || null);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || !result.data) return;
    setScanned(true);
    setIsbn(result.data);
    searchActiveBorrow(result.data);
  };

  const handleReturn = async () => {
    if (!isbn.trim()) return;

    setIsReturning(true);
    try {
      const result = await borrowApi.returnBook(isbn.trim());
      if (result.status === 'success') {
        Alert.alert('Thành công', result.message, [
          { text: 'OK', onPress: () => resetState() },
        ]);
      }
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Trả sách thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setIsReturning(false);
    }
  };

  const resetState = () => {
    setScanned(false);
    setIsbn('');
    setActiveRecord(null);
    setBookTitle('');
    setBookCover(null);
  };

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
          right={<TextInput.Icon icon="magnify" onPress={() => searchActiveBorrow(isbn)} color={colors.primary} />}
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
              right={
                <TextInput.Icon
                  icon="magnify"
                  onPress={() => searchActiveBorrow(isbn)}
                  disabled={isSearching}
                  color={colors.primary}
                />
              }
            />
          </Surface>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          {isSearching ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <Card style={styles.returnCard}>
              <View style={styles.cardAccent} />
              {bookCover && (
                <Card.Cover source={{ uri: bookCover }} style={styles.cover} />
              )}
              <Card.Content>
                <Text variant="titleLarge" style={styles.bookTitle}>
                  {bookTitle || `ISBN: ${isbn}`}
                </Text>
                <Text variant="bodyMedium" style={styles.isbnLabel}>
                  ISBN: {isbn}
                </Text>
                <Text variant="bodyMedium" style={styles.instructionText}>
                  Xác nhận trả sách này?
                </Text>
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
                  onPress={handleReturn}
                  loading={isReturning}
                  disabled={isReturning}
                  style={styles.cardActionButton}
                  labelStyle={styles.cardActionButtonLabel}
                >
                  Xác nhận trả
                </Button>
              </Card.Actions>
            </Card>
          )}
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
    justifyContent: 'center',
  },
  loader: {
    alignSelf: 'center',
  },
  returnCard: {
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
  isbnLabel: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
  },
  instructionText: {
    color: colors.primary,
    marginTop: 16,
    fontWeight: '600',
    fontSize: 14,
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
