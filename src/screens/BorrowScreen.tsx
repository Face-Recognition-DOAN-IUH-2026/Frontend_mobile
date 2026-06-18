import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text, Button, Surface, ActivityIndicator, Card, Divider, useTheme,
} from 'react-native-paper';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { borrowApi } from '../api/borrow';
import { useAuth } from '../context/AuthContext';
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

export default function BorrowScreen() {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { patron } = useAuth();
  const [cameraReady, setCameraReady] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [activeCount, setActiveCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [activeRecords, setActiveRecords] = useState<BorrowRecord[]>([]);
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedBorrowItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const MAX_BORROW_BOOKS = 3;
  const remaining = MAX_BORROW_BOOKS - activeCount;
  const canBorrow = remaining > 0 && overdueCount === 0;

  const loadPatronQuota = async () => {
    if (!patron?.id) return;
    setIsLoadingQuota(true);
    try {
      const data = await borrowApi.getPatronActiveBorrows();
      setActiveCount(data.total ?? 0);
      setOverdueCount(data.overdue_count ?? 0);
      setActiveRecords(data.records ?? []);
    } catch {
    } finally {
      setIsLoadingQuota(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPatronQuota();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (patron) loadPatronQuota();
    }, [patron])
  );

  const handleBarCodeScanned = useCallback(async (result: BarcodeScanningResult) => {
    if (scanned || !result.data || !patron?.id) return;
    setScanned(true);
    const barcode = result.data;

    if (scannedItems.find((item) => item.barcode === barcode)) {
      setScanned(false);
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
      setScanned(false);
      return;
    }

    try {
      const result = await borrowApi.lookupBorrowSlip({
        patron_id: patron.id,
        items: [{ barcode, isbn: barcode }],
      });
      const item = result.items.find((i) => i.barcode === barcode);
      if (!item || !item.can_borrow || !item.book || !item.copy) {
        const msg = item?.reason || 'Không tìm thấy sách trong thư viện';
        Alert.alert('Thông báo', `"${item?.book?.title || barcode}": ${msg}`);
      } else {
        const book: Book = {
          id: item.book.id,
          isbn: item.book.isbn,
          title: item.book.title,
          author: item.book.author || undefined,
          cover_url: item.book.cover_url || undefined,
          shelf_location: item.book.shelf_location || undefined,
        };
        setScannedItems((prev) => [...prev, { barcode, isbn: barcode, copy_id: item.copy?.id || null, copy_barcode: item.copy?.barcode || null, book }]);
      }
      if (result.errors?.length) {
        for (const err of result.errors) {
          Alert.alert('Thông báo', err);
        }
      }
    } catch (error: any) {
      devError('[Borrow] Scan error:', error);
      let msg = 'Không tìm thấy sách trong thư viện';
      if (error.response?.status === 403) {
        msg = error.response?.data?.detail || 'Bạn không thể mượn sách lúc này';
      } else if (error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      Alert.alert('Thông báo', msg);
    }
    setTimeout(() => setScanned(false), 500);
  }, [scanned, scannedItems, activeRecords, patron]);

  const removeItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resetState = () => {
    setScannedItems([]);
    loadPatronQuota();
  };

  const submitSlip = async (items: ScannedBorrowItem[]) => {
    if (!items.length || !patron?.id) return;
    setIsCreating(true);
    try {
      const apiItems = items.map((item) => ({
        barcode: item.copy_barcode || item.barcode,
        isbn: item.isbn,
        book_id: item.book.id,
        copy_id: item.copy_id!,
      }));
      const result = await borrowApi.confirmBorrowSlip({ patron_id: patron.id, items: apiItems });
      if (result.status === 'success') {
        Alert.alert('Thành công', result.message, [{ text: 'OK', onPress: resetState }]);
      }
    } catch (error: any) {
      devError('[Borrow] Create slip error:', error);
      let msg = 'Tạo phiếu mượn thất bại';
      if (error.response?.data?.detail) msg = error.response.data.detail;
      Alert.alert('Lỗi', msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateSlip = () => {
    if (!scannedItems.length) return;
    const validItems = scannedItems.filter((item) => !item.alreadyBorrowed);
    const alreadyBorrowedItems = scannedItems.filter((item) => item.alreadyBorrowed);

    if (alreadyBorrowedItems.length > 0) {
      Alert.alert(
        'Sách đã được mượn trước đó',
        `Có ${alreadyBorrowedItems.length} sách đã được mượn trước đó và sẽ không được thêm vào phiếu.`,
        [
          { text: 'Bỏ qua', style: 'cancel' },
          { text: 'Tạo phiếu', onPress: () => submitSlip(validItems) },
        ]
      );
      return;
    }
    submitSlip(validItems);
  };

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
        {permission.granted && canBorrow ? (
          <CameraView
            style={styles.camera}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
            }}
            onBarcodeScanned={cameraReady && !scanned ? handleBarCodeScanned : undefined}
          />
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
                : 'Cần cấp quyền camera'}
            </Text>
          </View>
        )}
      </View>

      <Surface style={styles.listPanel} elevation={2}>
        <View style={styles.listHeader}>
          <MaterialCommunityIcons name="book-open-variant" size={20} color={c.primary} />
          <Text style={[styles.listTitle, { color: c.onSurface }]}>
            Danh sách mượn ({scannedItems.length} cuốn)
          </Text>
        </View>

        <Divider />

        {scannedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="barcode-scan" size={48} color={c.onSurfaceVariant} />
            <Text style={[styles.emptyText, { color: c.onSurfaceVariant }]}>Quét sách để thêm vào phiếu mượn</Text>
          </View>
        ) : (
          <FlatList
            data={scannedItems}
            keyExtractor={(_, index) => String(index)}
            style={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item, index }) => (
              <Card
                style={[
                  styles.itemCard,
                  item.alreadyBorrowed && styles.itemCardAlreadyBorrowed,
                ]}
              >
                <View style={styles.itemRow}>
                  {item.book.cover_url ? (
                    <Card.Cover source={{ uri: item.book.cover_url }} style={styles.itemCover} />
                  ) : (
                    <View style={[styles.itemCoverPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                      <MaterialCommunityIcons name="book-open-variant" size={24} color={c.onSurfaceVariant} />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemTitle, { color: c.onSurface }]} numberOfLines={2}>{item.book.title}</Text>
                      {item.alreadyBorrowed && (
                        <View style={[styles.alreadyBorrowedBadge, { backgroundColor: theme.dark ? 'rgba(196,78,78,0.2)' : 'rgba(196,78,78,0.1)' }]}>
                          <MaterialCommunityIcons name="book-lock" size={12} color={c.error} />
                          <Text style={[styles.alreadyBorrowedText, { color: c.error }]}>Đã mượn</Text>
                        </View>
                      )}
                    </View>
                    {item.book.author && <Text style={[styles.itemAuthor, { color: c.onSurfaceVariant }]} numberOfLines={1}>{item.book.author}</Text>}
                    <Text style={[styles.itemIsbn, { color: c.onSurfaceVariant }]}>{item.barcode}</Text>
                    {item.alreadyBorrowed && (
                      <Text style={[styles.alreadyBorrowedNote, { color: c.onSurfaceVariant }]}>Sách này đang được mượn — sẽ không thêm vào phiếu</Text>
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
          <Button mode="contained" onPress={handleCreateSlip} loading={isCreating} disabled={isCreating || scannedItems.length === 0 || !canBorrow} style={styles.actionButton}>
            {isCreating ? 'Đang tạo phiếu...' : `Tạo phiếu mượn (${scannedItems.length} cuốn)`}
          </Button>
        </View>
      </Surface>
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
    scannerContainer: { height: 220, position: 'relative' },
    camera: { flex: 1 },
    cameraPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    cameraPlaceholderText: { fontSize: 14, textAlign: 'center' },
    listPanel: { flex: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12, marginTop: -12 },
    listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
    listTitle: { fontSize: 15, fontWeight: '700' },
    list: { flex: 1, paddingHorizontal: 12 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 40 },
    emptyText: { fontSize: 14, textAlign: 'center' },
    itemCard: { marginVertical: 4, borderRadius: 8, overflow: 'hidden' },
    itemCardAlreadyBorrowed: { opacity: 0.7 },
    itemRow: { flexDirection: 'row', alignItems: 'center', padding: 8 },
    itemCover: { width: 48, height: 64, borderRadius: 4 },
    itemCoverPlaceholder: { width: 48, height: 64, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
    itemInfo: { flex: 1, marginLeft: 10, justifyContent: 'center' },
    itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    itemTitle: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
    itemAuthor: { fontSize: 12, marginTop: 1 },
    itemIsbn: { fontSize: 11, marginTop: 1 },
    alreadyBorrowedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    alreadyBorrowedText: { fontSize: 10, fontWeight: '600' },
    alreadyBorrowedNote: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
    removeButton: { marginLeft: 4 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, gap: 12 },
    actionButton: { flex: 1, borderRadius: 6 },
  });
}
