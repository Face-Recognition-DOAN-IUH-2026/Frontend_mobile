import React, { useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Surface, TextInput, ActivityIndicator, Card, IconButton, Chip, Dialog, Portal, Divider, useTheme } from 'react-native-paper';
import { NoticeSnackbar } from '../../../components/NoticeSnackbar';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { borrowApi } from '../../../api/borrow';
import { BookWithStats, BookImportResponse } from '../../../types';
import { AppTheme } from '../../../theme/DarkTheme';
import { devError, devLog } from '../../../utils/logger';

interface ImportBooksScreenProps {
  navigation: any;
}

interface ScannedItem {
  isbn: string;
  quantity: number;
  lookup: BookWithStats | null;
  loading: boolean;
  error: string | null;
}

const statusLabels: Record<string, string> = {
  imported: 'Thành công',
  updated: 'Cập nhật',
  skipped: 'Bỏ qua',
  error: 'Lỗi',
  warning: 'Thiếu metadata',
};

export default function ImportBooksScreen({ navigation }: ImportBooksScreenProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const primaryFade = '#1A73E822';
  const successFade = '#34A85322';
  const errorFade = '#D9302522';

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: c.background,
    },
    permissionText: {
      color: c.onSurface,
      fontSize: 16,
      marginBottom: 16,
      textAlign: 'center',
    },
    permissionButton: {
      borderRadius: 6,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
      paddingHorizontal: 16,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: c.divider,
    },
    orText: {
      color: c.onSurfaceVariant,
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
      borderColor: c.outline,
    },
    offlineListContainer: {
      flex: 1,
      width: '100%',
      marginTop: 16,
    },
    offlineListTitle: {
      color: c.onSurface,
      fontWeight: '700',
      marginBottom: 8,
      paddingHorizontal: 8,
    },
    cameraContainer: {
      height: '45%',
      position: 'relative',
    },
    camera: {
      flex: 1,
    },
    cameraOverlay: {
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
      height: 120,
      borderRadius: 8,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: 32,
      height: 32,
      borderColor: c.primary,
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
      color: c.onSurface,
      marginTop: 16,
      fontSize: 14,
      textAlign: 'center',
      fontWeight: '500',
    },
    manualInput: {
      padding: 8,
      backgroundColor: c.surface,
      position: 'relative',
      overflow: 'hidden',
      borderTopWidth: 0.5,
      borderTopColor: c.outline,
    },
    manualInputField: {
      backgroundColor: 'transparent',
    },
    listSection: {
      flex: 1,
      backgroundColor: c.background,
    },
    listSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    listSectionTitle: {
      color: c.onSurface,
      fontWeight: '700',
    },
    listContainer: {
      flex: 1,
    },
    listContent: {
      padding: 12,
      gap: 8,
      paddingBottom: 80,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      color: c.onSurfaceVariant,
      marginTop: 12,
      fontWeight: '500',
    },
    emptyHint: {
      color: c.onSurfaceVariant,
      marginTop: 4,
      textAlign: 'center',
    },
    itemCard: {
      backgroundColor: c.surface,
      borderColor: c.outline,
      borderRadius: 12,
    },
    itemContent: {
      flexDirection: 'row',
      gap: 10,
    },
    itemCover: {
      width: 48,
      height: 68,
      borderRadius: 6,
    },
    itemCoverPlaceholder: {
      width: 48,
      height: 68,
      borderRadius: 6,
      backgroundColor: c.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemInfo: {
      flex: 1,
      gap: 2,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 6,
    },
    itemTitle: {
      color: c.onSurface,
      fontWeight: '700',
      flex: 1,
    },
    itemAuthor: {
      color: c.onSurfaceVariant,
    },
    itemMeta: {
      color: c.onSurfaceVariant,
      fontSize: 11,
      marginTop: 1,
    },
    itemIsbn: {
      color: c.onSurfaceVariant,
      fontSize: 11,
      fontFamily: 'monospace',
    },
    itemStock: {
      color: c.onSurfaceVariant,
      fontSize: 11,
      marginTop: 2,
    },
    itemProjected: {
      color: c.primary,
      fontWeight: '600',
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    errorText: {
      color: c.error,
      flex: 1,
    },
    newChip: {
      backgroundColor: primaryFade,
    },
    newChipText: {
      color: c.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    existsChip: {
      backgroundColor: successFade,
    },
    existsChipText: {
      color: c.custom.success,
      fontSize: 11,
      fontWeight: '700',
    },
    quantityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    qtyBtn: {
      width: 32,
      height: 32,
      margin: 0,
    },
    qtyValue: {
      color: c.onSurface,
      fontWeight: '700',
      marginHorizontal: 8,
      minWidth: 24,
      textAlign: 'center',
    },
    qtySpacer: {
      flex: 1,
    },
    bottomBar: {
      backgroundColor: c.surface,
      borderTopWidth: 0.5,
      borderTopColor: c.outline,
    },
    bottomBarContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
    },
    bottomBarCount: {
      color: c.onSurfaceVariant,
    },
    bottomBarValid: {
      color: c.primary,
      fontWeight: '600',
    },
    dialogTitle: {
      textAlign: 'center',
    },
    resultStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginVertical: 8,
    },
    resultStat: {
      alignItems: 'center',
    },
    resultStatValue: {
      color: c.onSurface,
      fontWeight: '900',
    },
    resultStatLabel: {
      color: c.onSurfaceVariant,
    },
    resultDivider: {
      marginVertical: 8,
    },
    resultList: {
      maxHeight: 200,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
    },
    resultRowIsbn: {
      color: c.onSurfaceVariant,
      fontSize: 10,
      fontFamily: 'monospace',
    },
    resultRowTitle: {
      color: c.onSurface,
      flex: 1,
    },
    resultSuccessChip: {
      backgroundColor: successFade,
    },
    resultSuccessChipText: {
      color: c.custom.success,
      fontSize: 10,
      fontWeight: '700',
    },
    resultErrorChip: {
      backgroundColor: errorFade,
    },
    resultErrorChipText: {
      color: c.error,
      fontSize: 10,
      fontWeight: '700',
    },
    resultWarningChip: {
      backgroundColor: '#C49A3C22',
    },
    resultWarningChipText: {
      color: c.custom.warning,
      fontSize: 10,
      fontWeight: '700',
    },
  }), [c]);

  const [permission, requestPermission] = useCameraPermissions();
  const [scannedIsbns, setScannedIsbns] = useState<ScannedItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [importResult, setImportResult] = useState<BookImportResponse | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);
  const [manualIsbn, setManualIsbn] = useState('');
  const [isManualSearching, setIsManualSearching] = useState(false);
  const lastScannedRef = useRef<{ isbn: string; time: number } | null>(null);

  const addScanned = useCallback(async (isbn: string) => {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    if (!/^\d{10,13}$/.test(cleanIsbn)) return;

    try {
      const lookup = await borrowApi.lookupBookByIsbn(cleanIsbn);
      setScannedIsbns((prev) => {
        const existing = prev.find((item) => item.isbn === cleanIsbn);
        if (existing) {
          return prev.map((item) =>
            item.isbn === cleanIsbn ? { ...item, quantity: item.quantity + 1, lookup } : item,
          );
        }
        return [...prev, { isbn: cleanIsbn, quantity: 1, lookup, loading: false, error: null }];
      });
    } catch (err: any) {
      setSnackbarMsg(`Không tìm thấy sách: ${cleanIsbn}`);
      devError('[ImportBooks] lookup error:', err);
    }
  }, []);

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    const isbn = result.data?.trim();
    if (!isbn) return;

    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    if (!/^\d{10,13}$/.test(cleanIsbn)) return;

    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.isbn === cleanIsbn && now - lastScannedRef.current.time < 2000) {
      return;
    }

    lastScannedRef.current = { isbn: cleanIsbn, time: now };
    setSnackbarMsg(`Đã quét ISBN: ${isbn}`);
    addScanned(cleanIsbn);
  };

  const handleManualAdd = async () => {
    const isbn = manualIsbn.trim();
    if (!isbn) return;
    setIsManualSearching(true);
    await addScanned(isbn);
    setIsManualSearching(false);
    setManualIsbn('');
  };

  const changeQuantity = (isbn: string, delta: number) => {
    setScannedIsbns((prev) =>
      prev.map((item) => {
        if (item.isbn !== isbn) return item;
        const next = item.quantity + delta;
        return { ...item, quantity: next < 1 ? 1 : next };
      }),
    );
  };

  const removeItem = (isbn: string) => {
    setScannedIsbns((prev) => prev.filter((item) => item.isbn !== isbn));
  };

  const handleImport = async () => {
    if (scannedIsbns.length === 0) return;

    setIsImporting(true);
    try {
      const items = scannedIsbns.map((item) => ({ isbn: item.isbn, quantity: item.quantity }));
      const result = await borrowApi.batchImportByIsbn(items);
      setImportResult(result);
      setShowResult(true);
      if (result.success) {
        setScannedIsbns([]);
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Nhập kho thất bại';
      setSnackbarMsg(message);
      devError('[ImportBooks] import error:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = scannedIsbns.length;

  const renderCamera = () => (
    <View style={styles.cameraContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={handleBarCodeScanned}
      />
      <View style={styles.cameraOverlay}>
        <View style={styles.scanArea}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.scanText}>Đặt mã vạch trong khung hình</Text>
      </View>
      <Surface style={styles.manualInput} elevation={0}>
        <TextInput
          label="Nhập ISBN thủ công"
          value={manualIsbn}
          onChangeText={setManualIsbn}
          mode="outlined"
          style={styles.manualInputField}
          outlineStyle={styles.inputOutline}
          activeOutlineColor={c.primary}
          disabled={isManualSearching}
          right={
            <TextInput.Icon
              icon="plus"
              onPress={handleManualAdd}
              disabled={isManualSearching || !manualIsbn.trim()}
              color={c.primary}
            />
          }
        />
      </Surface>
    </View>
  );

  const renderScannedList = () => {
    if (scannedIsbns.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="barcode-scan" size={48} color={c.onSurfaceVariant} />
          <Text variant="bodyLarge" style={styles.emptyText}>Quét mã ISBN để bắt đầu</Text>
          <Text variant="bodySmall" style={styles.emptyHint}>
            Camera sẽ tự động nhận diện mã vạch
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {scannedIsbns.map((item) => (
          <Card key={item.isbn} mode="outlined" style={styles.itemCard}>
            <Card.Content style={styles.itemContent}>
              {item.lookup?.cover_url ? (
                <Image source={{ uri: item.lookup.cover_url }} style={styles.itemCover} />
              ) : (
                <View style={styles.itemCoverPlaceholder}>
                  <MaterialCommunityIcons name="book-variant" size={24} color={c.onSurfaceVariant} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <View style={styles.itemHeader}>
                  {item.loading ? (
                    <ActivityIndicator size="small" color={c.primary} />
                  ) : item.error ? (
                    <View style={styles.errorRow}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={16} color={c.error} />
                      <Text variant="bodySmall" style={styles.errorText}>{item.error}</Text>
                    </View>
                  ) : (
                    <>
                      <Text variant="titleSmall" style={styles.itemTitle} numberOfLines={2}>
                        {item.lookup?.title || 'Đang tải...'}
                      </Text>
                      {item.lookup ? (
                        <Chip
                          compact
                          style={item.lookup.total_copies > 0 ? styles.existsChip : styles.newChip}
                          textStyle={item.lookup.total_copies > 0 ? styles.existsChipText : styles.newChipText}
                        >
                          {item.lookup.total_copies > 0 ? 'Đã có' : 'Mới'}
                        </Chip>
                      ) : null}
                    </>
                  )}
                </View>

                {!item.loading && item.lookup ? (
                  <>
                    {item.lookup.author ? (
                      <Text variant="bodySmall" style={styles.itemAuthor} numberOfLines={1}>
                        {item.lookup.author}
                      </Text>
                    ) : null}
                    {item.lookup.publisher || item.lookup.published_date ? (
                      <Text variant="bodySmall" style={styles.itemMeta} numberOfLines={1}>
                        {[item.lookup.publisher, item.lookup.published_date?.slice(0, 4)].filter(Boolean).join(' - ')}
                      </Text>
                    ) : null}
                    {item.lookup.page_count ? (
                      <Text variant="bodySmall" style={styles.itemMeta}>
                        {item.lookup.page_count} trang
                      </Text>
                    ) : null}
                    <Text variant="bodySmall" style={styles.itemIsbn}>ISBN: {item.isbn}</Text>
                    {item.lookup.total_copies > 0 ? (
                      <Text variant="bodySmall" style={styles.itemStock}>
                        Kho: {item.lookup.total_copies} / Sẵn: {item.lookup.available_copies}
                        {item.quantity > 0 ? (
                          <Text variant="bodySmall" style={styles.itemProjected}>
                            {' '}→ Sau nhập: {item.lookup.total_copies + item.quantity}
                          </Text>
                        ) : null}
                      </Text>
                    ) : null}
                  </>
                ) : !item.loading && !item.lookup ? (
                  <Text variant="bodySmall" style={styles.itemIsbn}>{item.isbn}</Text>
                ) : null}

                {!item.loading ? (
                  <View style={styles.quantityRow}>
                    <IconButton
                      icon="minus"
                      size={16}
                      mode="contained-tonal"
                      onPress={() => changeQuantity(item.isbn, -1)}
                      style={styles.qtyBtn}
                    />
                    <Text variant="titleMedium" style={styles.qtyValue}>{item.quantity}</Text>
                    <IconButton
                      icon="plus"
                      size={16}
                      mode="contained-tonal"
                      onPress={() => changeQuantity(item.isbn, 1)}
                      style={styles.qtyBtn}
                    />
                    <View style={styles.qtySpacer} />
                    <IconButton
                      icon="delete-outline"
                      size={18}
                      onPress={() => removeItem(item.isbn)}
                      iconColor={c.error}
                    />
                  </View>
                ) : null}
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    );
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
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Cần quyền camera để quét mã vạch</Text>
        <Button mode="contained" onPress={requestPermission} style={styles.permissionButton}>
          Cấp quyền
        </Button>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.orText}>hoặc</Text>
          <View style={styles.dividerLine} />
        </View>
        <TextInput
          label="Nhập ISBN"
          value={manualIsbn}
          onChangeText={setManualIsbn}
          mode="outlined"
          style={styles.isbnInput}
          outlineStyle={styles.inputOutline}
          activeOutlineColor={c.primary}
          right={
            <TextInput.Icon
              icon="plus"
              onPress={handleManualAdd}
              disabled={isManualSearching || !manualIsbn.trim()}
              color={c.primary}
            />
          }
        />
        {scannedIsbns.length > 0 ? (
          <View style={styles.offlineListContainer}>
            <Text variant="titleSmall" style={styles.offlineListTitle}>
              Đã quét ({scannedIsbns.length} cuốn)
            </Text>
            {renderScannedList()}
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {renderCamera()}

      <View style={styles.listSection}>
        <View style={styles.listSectionHeader}>
          <Text variant="titleSmall" style={styles.listSectionTitle}>
            Đã quét ({scannedIsbns.length} cuốn)
          </Text>
          {scannedIsbns.length > 0 ? (
            <Button compact onPress={() => setScannedIsbns([])} textColor={c.error}>
              Xoá tất cả
            </Button>
          ) : null}
        </View>
        {renderScannedList()}
      </View>

      <Surface style={styles.bottomBar} elevation={2}>
        <View style={styles.bottomBarContent}>
          <View>
            <Text variant="bodySmall" style={styles.bottomBarCount}>
              {scannedIsbns.length} cuốn đã quét
            </Text>
            {validCount > 0 ? (
              <Text variant="bodySmall" style={styles.bottomBarValid}>
                {validCount} cuốn
              </Text>
            ) : null}
          </View>
          <Button
            mode="contained"
            onPress={handleImport}
            loading={isImporting}
            disabled={isImporting || validCount === 0}
            icon="package-variant-closed"
          >
            Nhập vào kho ({validCount})
          </Button>
        </View>
      </Surface>

      <Portal>
        <Dialog visible={showResult} onDismiss={() => setShowResult(false)}>
          <Dialog.Icon icon="checkbox-marked-circle-outline" />
          <Dialog.Title style={styles.dialogTitle}>
            Kết quả nhập kho
          </Dialog.Title>
          <Dialog.Content>
            {importResult ? (
              <>
                <View style={styles.resultStats}>
                  <View style={styles.resultStat}>
                    <Text variant="headlineMedium" style={styles.resultStatValue}>{importResult.imported}</Text>
                    <Text variant="bodySmall" style={styles.resultStatLabel}>Thành công</Text>
                  </View>
                  <View style={styles.resultStat}>
                    <Text variant="headlineMedium" style={[styles.resultStatValue, importResult.skipped > 0 && { color: c.custom.warning }]}>{importResult.skipped}</Text>
                    <Text variant="bodySmall" style={styles.resultStatLabel}>Bỏ qua</Text>
                  </View>
                  <View style={styles.resultStat}>
                    <Text variant="headlineMedium" style={[styles.resultStatValue, importResult.errors > 0 && { color: c.error }]}>{importResult.errors}</Text>
                    <Text variant="bodySmall" style={styles.resultStatLabel}>Lỗi</Text>
                  </View>
                </View>
                <Divider style={styles.resultDivider} />
                <ScrollView style={styles.resultList}>
                  {importResult.results.map((row, idx) => (
                    <View key={idx} style={styles.resultRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodySmall" style={styles.resultRowIsbn}>{row.isbn}</Text>
                        <Text variant="bodySmall" style={styles.resultRowTitle} numberOfLines={1}>{row.title}</Text>
                        {row.quantity > 0 ? (
                          <Text style={{ color: c.custom.textDisabled, fontSize: 10 }}>
                            SL: {row.quantity} | Mã vạch: {row.barcodes?.length || 0}
                          </Text>
                        ) : null}
                        {row.message ? (
                          <Text style={{ color: c.custom.textDisabled, fontSize: 10 }} numberOfLines={1}>
                            {row.message}
                          </Text>
                        ) : null}
                      </View>
                      <Chip
                        compact
                        style={row.status === 'imported' || row.status === 'updated' ? styles.resultSuccessChip : row.status === 'warning' ? styles.resultWarningChip : styles.resultErrorChip}
                        textStyle={row.status === 'imported' || row.status === 'updated' ? styles.resultSuccessChipText : row.status === 'warning' ? styles.resultWarningChipText : styles.resultErrorChipText}
                      >
                        {statusLabels[row.status] || row.status}
                      </Chip>
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowResult(false)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <NoticeSnackbar
        visible={!!snackbarMsg}
        message={snackbarMsg || ''}
        severity={snackbarMsg?.includes('Không tìm thấy') ? 'error' : 'info'}
        onDismiss={() => setSnackbarMsg(null)}
      />
    </SafeAreaView>
  );
}
