import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Surface, TextInput, ActivityIndicator, Card, Divider, Snackbar, Avatar, Portal, useTheme } from 'react-native-paper';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { borrowApi } from '../api/borrow';
import { Book, BorrowRecord } from '../types';
import { AppTheme } from '../theme/DarkTheme';
import { devError } from '../utils/logger';

interface ScannedBorrowItem {
  barcode: string;
  isbn: string;
  copy_id: string | null;
  copy_barcode: string | null;
  book: Book;
  alreadyBorrowed?: boolean;
}

export default function StaffBorrowScreen() {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [scanned, setScanned] = useState(false);
  const [patronCode, setPatronCode] = useState('');
  const [patronId, setPatronId] = useState<string | null>(null);
  const [patronName, setPatronName] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedBorrowItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanToast, setScanToast] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [activeRecords, setActiveRecords] = useState<BorrowRecord[]>([]);

  const MAX_BORROW = 3;
  const remaining = MAX_BORROW - activeCount;
  const canBorrow = remaining > 0 && overdueCount === 0;

  const handleBarCodeScanned = useCallback(async (result: BarcodeScanningResult) => {
    if (scanned || !result.data) return;
    setScanned(true);
    const barcode = result.data;

    if (!patronId) {
      setTimeout(() => setScanned(false), 500);
      return;
    }

    if (scannedItems.find((item) => item.barcode === barcode)) {
      setScanToast('Sách này đã có trong danh sách');
      setTimeout(() => setScanned(false), 500);
      return;
    }

    if (scannedItems.length >= remaining) {
      setScanToast(`Chỉ được mượn tối đa ${MAX_BORROW} cuốn`);
      setTimeout(() => setScanned(false), 500);
      return;
    }

    const normalizeCode = (v: string | undefined | null) => v?.replace(/[\s-]+/g, '').replace(/\.0+$/, '') ?? '';
    const barcodeNormalized = normalizeCode(barcode);
    const alreadyBorrowedRecord = activeRecords.find(
      (r) => normalizeCode(r.book?.isbn) === barcodeNormalized || normalizeCode(r.book_id) === barcodeNormalized
    );

    if (alreadyBorrowedRecord) {
      const book: Book = {
        id: alreadyBorrowedRecord.book_id,
        isbn: alreadyBorrowedRecord.book?.isbn || barcode,
        title: alreadyBorrowedRecord.book?.title || barcode,
        author: alreadyBorrowedRecord.book?.author,
        cover_url: alreadyBorrowedRecord.book?.cover_url,
        shelf_location: alreadyBorrowedRecord.book?.shelf_location,
      };
      setScannedItems((prev) => [...prev, { barcode, isbn: barcode, copy_id: null, copy_barcode: null, book, alreadyBorrowed: true }]);
      setScanToast(`⚠️ "${alreadyBorrowedRecord.book?.title || barcode}" đã được mượn — sẽ không thêm vào phiếu`);
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    try {
      const result = await borrowApi.lookupBorrowSlip({
        patron_id: patronId!,
        items: [{ barcode, isbn: barcode }],
      });
      const item = result.items.find((i) => i.barcode === barcode);
      if (!item || !item.can_borrow) {
        const msg = item?.reason || 'Sách không thể mượn';
        const title = item?.book?.title || '';
        Alert.alert('Thông báo', title ? `"${title}": ${msg}` : `${msg} (ISBN: ${barcode})`);
        setTimeout(() => setScanned(false), 500);
        return;
      }
      const book: Book = {
        id: item.book!.id,
        isbn: item.book!.isbn,
        title: item.book!.title,
        author: item.book!.author || undefined,
        cover_url: item.book!.cover_url || undefined,
        shelf_location: item.book!.shelf_location || undefined,
      };
      setScannedItems((prev) => [...prev, {
        barcode,
        isbn: barcode,
        copy_id: item.copy?.id || null,
        copy_barcode: item.copy?.barcode || null,
        book,
      }]);
      setScanToast(`Đã thêm: ${book.title}`);
    } catch {
      Alert.alert('Thông báo', `Không tìm thấy sách: ${barcode}`);
    }
    setTimeout(() => setScanned(false), 500);
  }, [scanned, scannedItems, remaining, activeRecords, patronId]);

  const lookupPatron = async () => {
    if (!patronCode.trim()) return;
    setIsLookingUp(true);
    try {
      const data = await borrowApi.getActiveBorrowsByStudentCode(patronCode.trim());
      if (data.patron) {
        setPatronId(data.patron.id);
        setPatronName(data.patron.full_name || data.patron.student_code);
        setActiveCount(data.total ?? 0);
        setOverdueCount(data.overdue_count ?? 0);
        setActiveRecords(data.records ?? []);
        setScanToast(`Đã chọn độc giả: ${data.patron.full_name || data.patron.student_code}`);
      }
    } catch {
      setScanToast('Không tìm thấy độc giả với mã số này');
      setPatronId(null);
      setPatronName('');
      setActiveCount(0);
      setOverdueCount(0);
      setActiveRecords([]);
    } finally {
      setIsLookingUp(false);
    }
  };

  const removeItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resetState = () => {
    setScanned(false);
    setScannedItems([]);
    setPatronCode('');
    setPatronId(null);
    setPatronName('');
    setActiveCount(0);
    setOverdueCount(0);
    setActiveRecords([]);
    setCameraReady(false);
  };

  const handleCreateSlip = async () => {
    if (!scannedItems.length || !patronId) return;

    const validItems = scannedItems.filter((item) => !item.alreadyBorrowed);
    const alreadyBorrowedItems = scannedItems.filter((item) => item.alreadyBorrowed);

    if (alreadyBorrowedItems.length > 0) {
      const titles = alreadyBorrowedItems.map((b) => `"${b.book.title || b.barcode}"`).join(', ');
      Alert.alert(
        'Sách đã được mượn trước đó',
        `${alreadyBorrowedItems.length} sách trong danh sách đang được mượn: ${titles}`,
        [
          { text: 'Bỏ qua', style: 'cancel' },
          {
            text: 'Tạo phiếu',
            onPress: () => submitSlip(validItems),
          },
        ]
      );
      return;
    }

    if (activeCount + validItems.length > MAX_BORROW) {
      Alert.alert('Vượt quá giới hạn', `Tổng sách mượn sẽ là ${activeCount + validItems.length} cuốn, tối đa ${MAX_BORROW} cuốn`);
      return;
    }

    submitSlip(validItems);
  };

  const submitSlip = async (items: ScannedBorrowItem[]) => {
    if (!items.length || !patronId) return;
    setIsCreating(true);
    try {
      const apiItems = items.map((item) => ({
        barcode: item.copy_barcode || item.barcode,
        isbn: item.isbn,
        book_id: item.book.id,
        copy_id: item.copy_id!,
      }));
      const result = await borrowApi.confirmBorrowSlip({ patron_id: patronId, items: apiItems });
      if (result.status === 'success') {
        Alert.alert('Thành công', result.message, [
          { text: 'OK', onPress: resetState },
        ]);
      }
    } catch (error: any) {
      devError('[StaffBorrow] Create slip error:', error);
      let msg = 'Tạo phiếu mượn thất bại';
      if (error.response?.data?.detail) msg = error.response.data.detail;
      Alert.alert('Lỗi', msg);
    } finally {
      setIsCreating(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={c.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['bottom']}>
        <Text style={styles.permissionText}>Cần quyền camera để quét mã vạch sách</Text>
        <Button mode="contained" onPress={requestPermission} style={styles.permissionButton}>
          Cấp quyền
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Surface style={styles.patronInput} elevation={0}>
        <Text style={styles.patronLabel}>Mã số độc giả</Text>
        <View style={styles.patronRow}>
          <TextInput
            value={patronCode}
            onChangeText={setPatronCode}
            placeholder="Nhập MSSV..."
            mode="outlined"
            style={styles.patronField}
            outlineStyle={styles.inputOutline}
            activeOutlineColor={c.primary}
          />
          <Button mode="contained" onPress={lookupPatron} loading={isLookingUp} disabled={isLookingUp || !patronCode.trim()} style={styles.lookupButton}>
            Tra
          </Button>
        </View>

        {patronId ? (
          <View style={styles.quotaRow}>
            <View style={styles.patronReadyBanner}>
              <MaterialCommunityIcons name="check-circle" size={15} color={theme.dark ? '#4A8C5C' : '#067647'} />
              <Text style={styles.patronReadyText}>{patronName}</Text>
            </View>
            <View style={[styles.quotaBadge, !canBorrow && overdueCount > 0 ? styles.quotaBadgeError : !canBorrow ? styles.quotaBadgeWarning : styles.quotaBadgeOk]}>
              <MaterialCommunityIcons
                name={canBorrow ? 'check-circle' : 'alert-circle'}
                size={13}
                color={canBorrow ? (theme.dark ? '#4A8C5C' : '#067647') : c.error}
              />
              <Text style={[styles.quotaBadgeText, !canBorrow && styles.quotaBadgeTextError]}>
                {overdueCount > 0
                  ? `${overdueCount} quá hạn`
                  : `${remaining} cuốn khả dụng`}
              </Text>
            </View>
          </View>
        ) : null}
      </Surface>

      <View style={styles.scannerContainer}>
        {permission?.granted && patronId && canBorrow ? (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              onCameraReady={() => setCameraReady(true)}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
              }}
              onBarcodeScanned={cameraReady && !scanned ? handleBarCodeScanned : undefined}
            />
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.scanText}>Quét mã vạch sách</Text>
            </View>
          </>
        ) : (
          <View style={styles.cameraPlaceholder}>
            <MaterialCommunityIcons
              name={!canBorrow ? 'book-lock-outline' : 'barcode-scan'}
              size={48}
              color={c.onSurfaceVariant}
            />
            <Text style={styles.cameraPlaceholderText}>
              {!canBorrow
                ? overdueCount > 0
                  ? 'Có sách quá hạn, không thể mượn thêm'
                  : 'Đã mượn tối đa 3 cuốn'
                : permission?.granted
                  ? 'Cần tra độc giả trước'
                  : 'Cần cấp quyền camera'}
            </Text>
          </View>
        )}
      </View>

      <Surface style={styles.listPanel} elevation={2}>
        <View style={styles.listHeader}>
          <MaterialCommunityIcons name="book-open-variant" size={20} color={c.primary} />
          <Text style={styles.listTitle}>
            Danh sách mượn ({scannedItems.length} cuốn)
          </Text>
        </View>

        <Divider />

        {scannedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="barcode-scan" size={48} color={c.onSurfaceVariant} />
            <Text style={styles.emptyText}>Quét sách để thêm vào phiếu mượn</Text>
          </View>
        ) : (
          <FlatList
            data={scannedItems}
            keyExtractor={(_, index) => String(index)}
            style={styles.list}
renderItem={({ item, index }) => (
                <Card
                  style={[
                    styles.itemCard,
                    item.alreadyBorrowed && styles.itemCardAlreadyBorrowed,
                  ]}
                  key={index}
                >
                <View style={styles.itemRow}>
                  {item.book.cover_url ? (
                    <Card.Cover source={{ uri: item.book.cover_url }} style={styles.itemCover} />
                  ) : (
                    <View style={styles.itemCoverPlaceholder}>
                      <MaterialCommunityIcons name="book-open-variant" size={24} color={c.onSurfaceVariant} />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{item.book.title}</Text>
                      {item.alreadyBorrowed && (
                        <View style={styles.alreadyBorrowedBadge}>
                          <MaterialCommunityIcons name="book-lock" size={12} color={c.error} />
                          <Text style={styles.alreadyBorrowedText}>Đã mượn</Text>
                        </View>
                      )}
                    </View>
                    {item.book.author && <Text style={styles.itemAuthor} numberOfLines={1}>{item.book.author}</Text>}
                    <Text style={styles.itemIsbn}>{item.barcode}</Text>
                    {item.alreadyBorrowed && (
                      <Text style={styles.alreadyBorrowedNote}>Sách này đang được mượn — sẽ không thêm vào phiếu</Text>
                    )}
                  </View>
                  <Button mode="text" compact onPress={() => removeItem(index)} textColor={c.error} style={styles.removeButton}>
                    Xoá
                  </Button>
                </View>
              </Card>
            )}
          />
        )}

        <Divider />

        <View style={styles.actionRow}>
          <Button mode="outlined" onPress={resetState} style={styles.actionButton} textColor={c.onSurfaceVariant}>
            Xoá tất cả
          </Button>
          <Button mode="contained" onPress={handleCreateSlip} loading={isCreating} disabled={isCreating || scannedItems.length === 0 || !patronId || !canBorrow} style={styles.actionButton}>
            {isCreating ? 'Đang tạo phiếu...' : `Tạo phiếu mượn (${scannedItems.length} cuốn)`}
          </Button>
        </View>
      </Surface>

      <Portal>
        <View style={styles.topSnackbarWrapper}>
          <Snackbar
            visible={!!scanToast}
            onDismiss={() => setScanToast('')}
            duration={2000}
            style={styles.topSnackbar}
          >
            {scanToast}
          </Snackbar>
        </View>
      </Portal>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: c.background },
    permissionText: { color: c.onSurface, fontSize: 16, marginBottom: 16, textAlign: 'center' },
    permissionButton: { borderRadius: 6 },
    patronInput: { padding: 12, backgroundColor: c.surface },
    patronLabel: { fontSize: 13, color: c.onSurfaceVariant, marginBottom: 6, fontWeight: '600' },
    patronRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    patronField: { flex: 1, backgroundColor: 'transparent' },
    inputOutline: { borderRadius: 6, borderColor: c.outlineVariant },
    lookupButton: { borderRadius: 6, height: 44 },
    patronStatus: { fontSize: 12, color: c.primary, marginTop: 6, fontWeight: '600' },
    patronReadyBanner: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, backgroundColor: theme.dark ? 'rgba(74, 140, 92, 0.12)' : 'rgba(6, 118, 71, 0.08)' },
    patronReadyText: { color: theme.dark ? '#4A8C5C' : '#067647', fontSize: 12, fontWeight: '600' },
    quotaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 8 },
    quotaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
    quotaBadgeOk: { backgroundColor: theme.dark ? 'rgba(74, 140, 92, 0.12)' : 'rgba(6, 118, 71, 0.08)' },
    quotaBadgeWarning: { backgroundColor: theme.dark ? 'rgba(196, 154, 60, 0.15)' : 'rgba(181, 71, 8, 0.08)' },
    quotaBadgeError: { backgroundColor: 'rgba(196, 78, 78, 0.15)' },
    quotaBadgeText: { fontSize: 12, fontWeight: '700', color: c.onSurface },
    quotaBadgeTextError: { color: c.error },
    scannerContainer: { height: 220, position: 'relative', backgroundColor: c.surfaceVariant },
    camera: { flex: 1 },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    scanArea: { width: 280, height: 100, borderRadius: 8, position: 'relative' },
    corner: { position: 'absolute', width: 28, height: 28, borderColor: c.primary, borderWidth: 2 },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
    scanText: { color: c.onSurface, marginTop: 12, fontSize: 14, textAlign: 'center', fontWeight: '500' },
    cameraPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: c.surfaceVariant },
    cameraPlaceholderText: { color: c.onSurfaceVariant, fontSize: 14, fontWeight: '600' },
    listPanel: { flex: 1, backgroundColor: c.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, marginTop: -16 },
    listHeader: { padding: 16, paddingBottom: 8 },
    listTitle: { fontSize: 16, fontWeight: '700', color: c.onSurface, marginTop: 4 },
    list: { flex: 1, paddingHorizontal: 12 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyText: { color: c.onSurfaceVariant, marginTop: 12, fontSize: 14 },
    itemCard: { marginVertical: 4, backgroundColor: c.surface, borderRadius: 8 },
    itemRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
    itemCover: { width: 44, height: 60, borderRadius: 4 },
    itemCoverPlaceholder: { width: 44, height: 60, borderRadius: 4, backgroundColor: c.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
    itemInfo: { flex: 1, marginLeft: 10 },
    itemTitle: { fontSize: 14, fontWeight: '600', color: c.onSurface },
    itemAuthor: { fontSize: 12, color: c.onSurfaceVariant, marginTop: 2 },
    itemIsbn: { fontSize: 11, color: c.primary, marginTop: 2, fontFamily: 'monospace' },
    itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    alreadyBorrowedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(196, 78, 78, 0.15)' },
    alreadyBorrowedText: { color: c.error, fontSize: 10, fontWeight: '700' },
    alreadyBorrowedNote: { color: c.error, fontSize: 11, marginTop: 2, fontStyle: 'italic' },
    itemCardAlreadyBorrowed: { backgroundColor: c.surfaceVariant, borderColor: c.error, borderWidth: 1, opacity: 0.7 },
    removeButton: { marginLeft: 4 },
    actionRow: { flexDirection: 'row', padding: 12, gap: 8 },
    actionButton: { flex: 1, borderRadius: 6 },
    topSnackbarWrapper: { position: 'absolute', top: 8, left: 0, right: 0, zIndex: 9999, paddingHorizontal: 16 },
    topSnackbar: { width: '100%' },
  });
}
