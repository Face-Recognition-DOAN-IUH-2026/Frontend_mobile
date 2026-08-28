import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Surface, TextInput, Divider, useTheme } from 'react-native-paper';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { borrowApi } from '../../../api/borrow';
import { Book, BorrowRecord } from '../../../types';
import { AppTheme } from '../../../theme/DarkTheme';
import { devError } from '../../../utils/logger';
import { GradientHeader, SectionCard, StatCard, EmptyState, GRADIENTS } from '../../../theme/MobileDesignSystem';
import { NoticeSnackbar } from '../../../components/NoticeSnackbar';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { triggerHaptic } from '../../../utils/haptics';

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
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [activeRecords, setActiveRecords] = useState<BorrowRecord[]>([]);
  const [borrowConfig, setBorrowConfig] = useState<{ max_borrow_books: number }>({ max_borrow_books: 3 });
  const [manualIsbn, setManualIsbn] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    borrowApi.getBorrowConfig().then(setBorrowConfig).catch(() => setScanToast('Không thể tải cấu hình mượn sách, dùng mặc định'));
  }, []);

  const remaining = borrowConfig.max_borrow_books - activeCount;
  const canBorrow = remaining > 0 && overdueCount === 0;

  const lookupManualIsbn = async () => {
    const isbn = manualIsbn.trim();
    if (!isbn || !patronId) return;
    setScanError(null);

    if (scannedItems.find((item) => item.barcode === isbn)) {
      setScanToast('Sách này đã có trong danh sách');
      setManualIsbn('');
      return;
    }

    if (scannedItems.length >= remaining) {
      setScanError(`Chỉ được mượn tối đa ${borrowConfig.max_borrow_books} cuốn`);
      setManualIsbn('');
      return;
    }

    try {
      const result = await borrowApi.lookupBorrowSlip({
        patron_id: patronId,
        items: [{ barcode: isbn, isbn }],
      });
      const item = result.items.find((i) => i.barcode === isbn);
      if (!item || !item.can_borrow) {
        const msg = item?.reason || 'Sách không thể mượn';
        const title = item?.book?.title || '';
        setScanError(title ? `"${title}": ${msg}` : `${msg} (ISBN: ${isbn})`);
        setManualIsbn('');
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
        barcode: isbn,
        isbn,
        copy_id: item.copy?.id || null,
        copy_barcode: item.copy?.barcode || null,
        book,
      }]);
      triggerHaptic.success();
      setScanToast(`Đã thêm: ${book.title}`);
      setManualIsbn('');
    } catch (error: any) {
      triggerHaptic.warning();
      let msg = `Không tìm thấy sách: ${isbn}`;
      if (error.response?.status === 403) {
        msg = error.response?.data?.detail || 'Bạn không thể mượn sách lúc này';
      } else if (error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      setScanError(msg);
      setManualIsbn('');
    }
  };

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
      setScanToast(`Chỉ được mượn tối đa ${borrowConfig.max_borrow_books} cuốn`);
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
        triggerHaptic.error();
        setScanError(title ? `"${title}": ${msg}` : `${msg} (ISBN: ${barcode})`);
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
      triggerHaptic.success();
      setScanToast(`Đã thêm: ${book.title}`);
    } catch (error: any) {
      triggerHaptic.error();
      let msg = `Không tìm thấy sách: ${barcode}`;
      if (error.response?.status === 403) {
        msg = error.response?.data?.detail || 'Bạn không thể mượn sách lúc này';
      } else if (error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      setScanError(msg);
    }
    setTimeout(() => setScanned(false), 500);
  }, [scanned, scannedItems, remaining, activeRecords, patronId]);

  const lookupPatron = async () => {
    if (!patronCode.trim()) return;
    setIsLookingUp(true);
    setError(null);
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
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      const detail = err?.response?.data?.detail || err?.message || '';
      if (status === 403) {
        if (detail.includes('chua vao thu vien')) {
          setError('Độc giả chưa ở trong thư viện. Vui lòng yêu cầu độc giả quét thẻ tại cửa vào.');
        } else {
          setError('Thẻ độc giả đã bị khóa/hết hạn. Vui lòng liên hệ thư viện.');
        }
      } else {
        setError('Không tìm thấy độc giả với mã số này');
      }
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
    setError(null);
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

    if (activeCount + validItems.length > borrowConfig.max_borrow_books) {
      Alert.alert('Vượt quá giới hạn', `Tổng sách mượn sẽ là ${activeCount + validItems.length} cuốn, tối đa ${borrowConfig.max_borrow_books} cuốn`);
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
        <LoadingOverlay loading message="Loading..." />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['bottom']}>
        <MaterialCommunityIcons name="camera-off-outline" size={48} color={c.onSurfaceVariant} />
        <Text style={styles.permissionText}>Cần quyền camera để quét mã vạch sách</Text>
        <Button mode="contained" onPress={requestPermission} style={styles.permissionButton}>
          Cấp quyền
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <GradientHeader
        title="Mượn sách"
        subtitle={patronId ? `Độc giả: ${patronName}` : 'Quét sách cho độc giả'}
        icon="book-plus-outline"
      />

      <SectionCard
        title="Độc giả"
        icon="account-outline"
        accentColor={GRADIENTS.navy[0]}
        right={
          patronId ? (
            <Button mode="text" compact onPress={resetState} textColor={c.error}>
              Đặt lại
            </Button>
          ) : undefined
        }
      >
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
            Tra cứu
          </Button>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={c.error} />
            <Text style={styles.errorText} selectable>{error}</Text>
          </View>
        ) : null}

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
      </SectionCard>

      {patronId ? (
        <View style={styles.statsRow}>
          <View style={styles.statHalf}>
            <StatCard
              label="Đang mượn"
              value={activeCount}
              icon="book-open-variant"
              gradient={GRADIENTS.navy}
              pct={(activeCount / borrowConfig.max_borrow_books) * 100}
            />
          </View>
          <View style={styles.statHalf}>
            <StatCard
              label="Khả dụng"
              value={remaining}
              icon="book-check-outline"
              gradient={canBorrow ? GRADIENTS.emerald : GRADIENTS.amber}
            />
          </View>
        </View>
      ) : null}

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

      {scanError ? (
        <View style={styles.scanErrorBox}>
          <View style={styles.scanErrorRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={c.error} />
            <Text style={styles.scanErrorText} selectable>{scanError}</Text>
            <Button mode="text" compact onPress={() => setScanError(null)} textColor={c.error} style={{ minWidth: 0 }}>
              <MaterialCommunityIcons name="close" size={16} color={c.error} />
            </Button>
          </View>
          <Button
            mode="outlined"
            compact
            onPress={() => { setScanError(null); setManualIsbn(''); }}
            style={styles.manualEntryButton}
            textColor={c.primary}
          >
            Nhập ISBN thủ công
          </Button>
        </View>
      ) : null}

      {patronId && canBorrow ? (
        <View style={styles.manualInputRow}>
          <TextInput
            value={manualIsbn}
            onChangeText={setManualIsbn}
            placeholder="Nhập ISBN thủ công..."
            mode="outlined"
            style={styles.manualInput}
            outlineStyle={styles.inputOutline}
            activeOutlineColor={c.primary}
            keyboardType="numeric"
            onSubmitEditing={lookupManualIsbn}
          />
          <Button
            mode="contained"
            compact
            onPress={lookupManualIsbn}
            disabled={!manualIsbn.trim()}
            style={styles.manualLookupButton}
          >
            Thêm
          </Button>
        </View>
      ) : null}

      <SectionCard
        title={`Danh sách mượn (${scannedItems.length} cuốn)`}
        icon="book-open-variant"
        accentColor={GRADIENTS.violet[0]}
        right={
          scannedItems.length > 0 ? (
            <Button mode="text" compact onPress={() => setScannedItems([])} textColor={c.error}>
              Xoá tất cả
            </Button>
          ) : undefined
        }
        style={styles.listSection}
      >
        {scannedItems.length === 0 ? (
          <EmptyState icon="barcode-scan" message="Quét sách để thêm vào phiếu mượn" />
        ) : (
          <FlatList
            data={scannedItems}
            keyExtractor={(_, index) => String(index)}
            style={styles.list}
            renderItem={({ item, index }) => (
              <Surface
                style={[
                  styles.itemCard,
                  item.alreadyBorrowed && styles.itemCardAlreadyBorrowed,
                ]}
                elevation={0}
              >
                <View style={styles.itemRow}>
                  {item.book.cover_url ? (
                    <View style={styles.itemCoverWrap}>
                      <MaterialCommunityIcons name="book-open-variant" size={20} color={c.primary} />
                    </View>
                  ) : (
                    <View style={styles.itemCoverPlaceholder}>
                      <MaterialCommunityIcons name="book-open-variant" size={24} color={c.onSurfaceVariant} />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{item.book.title}</Text>
                      {item.alreadyBorrowed ? (
                        <View style={styles.alreadyBorrowedBadge}>
                          <MaterialCommunityIcons name="book-lock" size={12} color={c.error} />
                          <Text style={styles.alreadyBorrowedText}>Đã mượn</Text>
                        </View>
                      ) : null}
                    </View>
                    {item.book.author ? <Text style={styles.itemAuthor} numberOfLines={1}>{item.book.author}</Text> : null}
                    <Text style={styles.itemIsbn}>{item.barcode}</Text>
                    {item.alreadyBorrowed ? (
                      <Text style={styles.alreadyBorrowedNote}>Sách này đang được mượn — sẽ không thêm vào phiếu</Text>
                    ) : null}
                  </View>
                  <Button mode="text" compact onPress={() => removeItem(index)} textColor={c.error} style={styles.removeButton}>
                    Xoá
                  </Button>
                </View>
              </Surface>
            )}
          />
        )}
      </SectionCard>

      <View style={styles.actionRow}>
        <Button mode="outlined" onPress={resetState} style={styles.actionButton} textColor={c.onSurfaceVariant}>
          Xoá tất cả
        </Button>
        <Button mode="contained" onPress={handleCreateSlip} loading={isCreating} disabled={isCreating || scannedItems.length === 0 || !patronId || !canBorrow} style={styles.actionButton}>
          {isCreating ? 'Đang tạo phiếu...' : `Tạo phiếu mượn (${scannedItems.length} cuốn)`}
        </Button>
      </View>

      <NoticeSnackbar
        visible={!!scanToast}
        message={scanToast}
        severity={scanToast.startsWith('⚠️') || scanToast.includes('Không') ? 'warning' : 'success'}
        onDismiss={() => setScanToast('')}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: c.background, gap: 12 },
    permissionText: { color: c.onSurface, fontSize: 16, marginBottom: 8, textAlign: 'center' },
    permissionButton: { borderRadius: 10, paddingHorizontal: 24 },
    patronRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    patronField: { flex: 1, backgroundColor: 'transparent' },
    inputOutline: { borderRadius: 10, borderColor: c.outlineVariant },
    lookupButton: { borderRadius: 10, height: 44 },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.errorContainer,
      borderWidth: 1,
      borderColor: c.error,
    },
    errorText: {
      color: c.error,
      flex: 1,
      fontSize: 13,
    },
    patronReadyBanner: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: theme.dark ? 'rgba(74, 140, 92, 0.12)' : 'rgba(6, 118, 71, 0.08)' },
    patronReadyText: { color: theme.dark ? '#4A8C5C' : '#067647', fontSize: 12, fontWeight: '600' },
    quotaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
    quotaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
    quotaBadgeOk: { backgroundColor: theme.dark ? 'rgba(74, 140, 92, 0.12)' : 'rgba(6, 118, 71, 0.08)' },
    quotaBadgeWarning: { backgroundColor: theme.dark ? 'rgba(196, 154, 60, 0.15)' : 'rgba(181, 71, 8, 0.08)' },
    quotaBadgeError: { backgroundColor: 'rgba(196, 78, 78, 0.15)' },
    quotaBadgeText: { fontSize: 12, fontWeight: '700', color: c.onSurface },
    quotaBadgeTextError: { color: c.error },
    statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
    statHalf: { flex: 1 },
    scannerContainer: { height: 220, marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', backgroundColor: c.surfaceVariant, marginBottom: 12 },
    camera: { flex: 1 },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
    scanArea: { width: 280, height: 100, borderRadius: 12, position: 'relative' },
    corner: { position: 'absolute', width: 28, height: 28, borderColor: c.primary, borderWidth: 2.5 },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
    scanText: { color: '#FFFFFF', marginTop: 12, fontSize: 14, textAlign: 'center', fontWeight: '600' },
    cameraPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: c.surfaceVariant },
    cameraPlaceholderText: { color: c.onSurfaceVariant, fontSize: 14, fontWeight: '600' },
    scanErrorBox: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.errorContainer,
      borderWidth: 1,
      borderColor: c.error,
    },
    scanErrorRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    scanErrorText: {
      color: c.error,
      flex: 1,
      fontSize: 13,
    },
    manualEntryButton: {
      marginTop: 8,
      alignSelf: 'flex-start',
      borderColor: c.primary,
    },
    manualInputRow: {
      flexDirection: 'row',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 12,
      alignItems: 'center',
    },
    manualInput: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    manualLookupButton: {
      borderRadius: 10,
      height: 40,
    },
    listSection: { flex: 1, marginHorizontal: 16 },
    list: { flex: 1 },
    itemCard: { marginVertical: 4, marginHorizontal: 16, backgroundColor: c.surface, borderRadius: 14, borderWidth: 0.5, borderColor: c.outlineVariant },
    itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    itemCoverWrap: { width: 44, height: 60, borderRadius: 8, backgroundColor: c.primaryContainer, justifyContent: 'center', alignItems: 'center' },
    itemCoverPlaceholder: { width: 44, height: 60, borderRadius: 8, backgroundColor: c.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
    itemInfo: { flex: 1, marginLeft: 12 },
    itemTitle: { fontSize: 14, fontWeight: '600', color: c.onSurface },
    itemAuthor: { fontSize: 12, color: c.onSurfaceVariant, marginTop: 2 },
    itemIsbn: { fontSize: 11, color: c.primary, marginTop: 2, fontFamily: 'monospace' },
    itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    alreadyBorrowedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(196, 78, 78, 0.15)' },
    alreadyBorrowedText: { color: c.error, fontSize: 10, fontWeight: '700' },
    alreadyBorrowedNote: { color: c.error, fontSize: 11, marginTop: 2, fontStyle: 'italic' },
    itemCardAlreadyBorrowed: { backgroundColor: c.surfaceVariant, borderColor: c.error, borderWidth: 1, opacity: 0.7 },
    removeButton: { marginLeft: 4 },
    actionRow: { flexDirection: 'row', padding: 16, gap: 8, paddingBottom: 20 },
    actionButton: { flex: 1, borderRadius: 10 },
  });
}
