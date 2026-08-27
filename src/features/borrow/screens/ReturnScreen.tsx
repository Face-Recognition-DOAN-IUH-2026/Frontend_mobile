import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Chip,
  Menu,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { NoticeSnackbar } from '../../../components/NoticeSnackbar';
import { borrowApi } from '../../../api/borrow';
import { AppTheme } from '../../../theme/DarkTheme';
import { BorrowRecord, StaffPatronActiveBorrowsResponse } from '../../../types';
import { formatDate, getDaysUntil, isOverdue } from '../../../utils/dateUtils';
import { getErrorMessage } from '../../../utils/errorUtils';
import {
  GradientHeader,
  SectionCard,
  StatCard,
  FilterPill,
  EmptyState,
  GRADIENTS,
} from '../../../theme/MobileDesignSystem';

type StepState = 'lookup' | 'scan';

interface ScannedReturnItem {
  isbn: string;
  record: BorrowRecord;
  condition: string;
}
type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const normalizeBookCode = (value?: string | null) =>
  (value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .replace(/\.0+$/, '');

export default function ReturnScreen() {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [studentCode, setStudentCode] = useState('');
  const [staffLookup, setStaffLookup] = useState<StaffPatronActiveBorrowsResponse | null>(null);
  const [isLoadingPatron, setIsLoadingPatron] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedReturns, setScannedReturns] = useState<ScannedReturnItem[]>([]);
  const [batchReturning, setBatchReturning] = useState(false);
  const [conditionMenuIsbn, setConditionMenuIsbn] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const [scanToast, setScanToast] = useState('');
  const [permission, requestPermission] = useCameraPermissions();

  const CONDITION_OPTIONS = useMemo(() => [
    { label: 'Còn mới', value: 'Còn mới' },
    { label: 'Bình thường', value: 'Bình thường' },
    { label: 'Sách cũ', value: 'Sách cũ' },
    { label: 'Rách bìa', value: 'Rách bìa' },
    { label: 'Rách trang', value: 'Rách trang' },
    { label: 'Thiếu trang', value: 'Thiếu trang' },
    { label: 'Ẩm mốc', value: 'Ẩm mốc' },
    { label: 'Viết/bôi bẩn', value: 'Viết/bôi bẩn' },
    { label: 'Hư hỏng nặng', value: 'Hư hỏng nặng' },
  ], []);

  const activeRecords = staffLookup?.records ?? [];
  const step: StepState = !staffLookup ? 'lookup' : 'scan';

  const extractLookupErrorMessage = (err: any) => {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail || err?.response?.data?.error;
    if (status === 404 && detail === 'Not Found') {
      return 'Không tìm thấy thông tin độc giả. Vui lòng thử lại.';
    }
    if (detail && typeof detail === 'string' && !detail.includes('backend') && !detail.includes('endpoint')) {
      return detail;
    }
    return 'Không tìm thấy độc giả hoặc không thể tải sách đang mượn';
  };

  const loadPatronBorrows = async (code = studentCode.trim()) => {
    if (!code) {
      setError('Vui lòng nhập MSSV trước khi tra cứu');
      return;
    }

    setIsLoadingPatron(true);
    setError(null);
    setScannedReturns([]);
    setScanned(false);
    try {
      const result = await borrowApi.getActiveBorrowsByStudentCode(code);
      setStaffLookup(result);
    } catch (err: any) {
      setStaffLookup(null);
      setError(extractLookupErrorMessage(err));
    } finally {
      setIsLoadingPatron(false);
    }
  };

  type ItemResult = { isbn: string; title: string; status: 'ok' | 'fail'; error?: string };
  const handleBatchReturn = async () => {
    const code = studentCode.trim();
    if (!code || !staffLookup || !scannedReturns.length) return;

    setBatchReturning(true);
    setError(null);
    const results: ItemResult[] = [];
    for (const item of scannedReturns) {
      try {
        await borrowApi.returnByPatron(code, item.isbn, item.condition || undefined);
        results.push({ isbn: item.isbn, title: item.record.book?.title || item.isbn, status: 'ok' });
      } catch (err) {
        results.push({ isbn: item.isbn, title: item.record.book?.title || item.isbn, status: 'fail', error: getErrorMessage(err) });
      }
    }
    setBatchReturning(false);

    const okList = results.filter(r => r.status === 'ok');
    const failList = results.filter(r => r.status === 'fail');

    if (okList.length > 0 && failList.length === 0) {
      setSnackbar(`✓ Đã trả ${okList.length} sách thành công`);
    } else if (okList.length > 0 && failList.length > 0) {
      const failTitles = failList.map(f => f.title).join(', ');
      setSnackbar(`✓ Đã trả ${okList.length} sách thành công\n✗ Thất bại: ${failTitles}`);
    } else {
      const failTitles = failList.map(f => f.title).join(', ');
      const failErrors = failList.map(f => `${f.title}: ${f.error}`).join(' | ');
      setSnackbar(`✗ Trả thất bại: ${failTitles}\n${failErrors}`);
    }

    setScannedReturns([]);
    await loadPatronBorrows(code);
  };

  const updateCondition = (isbn: string, value: string) => {
    setScannedReturns((prev) => prev.map((item) =>
      item.isbn === isbn ? { ...item, condition: value } : item
    ));
  };

  const removeScanned = (isbn: string) => {
    setScannedReturns((prev) => prev.filter((item) => item.isbn !== isbn));
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || !result.data) return;
    const code = normalizeBookCode(result.data);
    if (!code || !/^\d{10,13}$/.test(code)) return;
    setScanned(true);
    setTimeout(() => setScanned(false), 1200);
    let toast = '';
    setScannedReturns((prev) => {
      if (prev.some((item) => item.isbn === code)) {
        toast = `Sách ${code} đã có trong danh sách`;
        return prev;
      }
      const match = activeRecords.find((r) => normalizeBookCode(r.book?.isbn) === code);
      if (match) {
        toast = `Đã thêm: ${match.book?.title || code}`;
        return [...prev, { isbn: code, record: match, condition: '' }];
      }
      toast = `Không tìm thấy sách đang mượn: ${code}`;
      return prev;
    });
    setScanToast(toast);
  };

  const resetPatron = () => {
    setStaffLookup(null);
    setStudentCode('');
    setScannedReturns([]);
    setScanned(false);
    setError(null);
  };

  const renderBorrowRecord = (record: BorrowRecord) => {
    const daysLeft = getDaysUntil(record.due_at);
    const overdue = isOverdue(record.due_at);

    return (
      <Surface key={record.id} style={styles.recordCard} elevation={0}>
        <View style={styles.recordHeader}>
          <View style={styles.recordTitleWrap}>
            <Text variant="titleSmall" style={styles.cardTitle} numberOfLines={2} selectable>
              {record.book?.title || record.book_id}
            </Text>
            <Text variant="bodySmall" style={styles.mutedText} selectable>
              ISBN {record.book?.isbn || record.book_id}
            </Text>
          </View>
          <Chip compact style={overdue ? styles.errorChip : styles.primaryChip} textStyle={overdue ? styles.errorChipText : styles.primaryChipText}>
            {overdue ? 'Quá hạn' : 'Đang mượn'}
          </Chip>
        </View>
        <View style={styles.recordFooter}>
          <Text style={styles.mutedText}>Mượn {formatDate(record.borrow_at)}</Text>
          <Text style={[styles.mutedText, overdue && styles.errorText]}>
            Hạn {formatDate(record.due_at)} - {overdue ? `trễ ${Math.abs(daysLeft)} ngày` : `còn ${daysLeft} ngày`}
          </Text>
        </View>
      </Surface>
    );
  };

  const renderScanner = () => {
    if (!staffLookup) return null;

    if (!permission) {
      return <LoadingOverlay loading message="..." />;
    }

    const hasScanned = scannedReturns.length > 0;
    const hasActiveRecords = activeRecords.length > 0;

    return (
      <SectionCard
        title="Quét sách trả"
        icon="barcode-scan"
        accentColor={GRADIENTS.emerald[0]}
        right={
          hasScanned ? (
            <Button mode="text" compact onPress={() => setScannedReturns([])} textColor={c.error}>
              Xóa tất cả
            </Button>
          ) : undefined
        }
      >
        {permission.granted ? (
          <View style={styles.cameraWrap}>
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
              <Text style={styles.cameraHint}>Đưa ISBN vào khung</Text>
            </View>
          </View>
        ) : (
          <View style={styles.permissionBox}>
            <MaterialCommunityIcons name="camera-off-outline" size={34} color={c.onSurfaceVariant} />
            <Text style={styles.mutedCenterText}>Chưa có quyền camera</Text>
            <Button mode="contained" onPress={requestPermission} icon="camera" style={styles.permissionBtn}>
              Cấp quyền
            </Button>
          </View>
        )}

        {hasScanned ? (
          <View style={styles.scannedList}>
            <Text variant="titleSmall" style={styles.scannedListTitle}>
              Đã quét ({scannedReturns.length} cuốn)
            </Text>
            {scannedReturns.map((item) => (
              <View key={item.isbn} style={styles.scannedItem}>
                <View style={styles.scannedItemDot} />
                <View style={styles.scannedItemInfo}>
                  <Text variant="bodySmall" style={styles.cardTitle} numberOfLines={1}>
                    {item.record.book?.title || item.record.book_id}
                  </Text>
                  <Text style={styles.scannedIsbn}>{item.isbn}</Text>
                </View>
                <Menu
                  visible={conditionMenuIsbn === item.isbn}
                  onDismiss={() => setConditionMenuIsbn(null)}
                  anchor={
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => setConditionMenuIsbn(item.isbn)}
                      style={styles.scannedConditionBtn}
                      contentStyle={styles.scannedConditionContent}
                      icon={item.condition ? 'check-circle' : 'note-plus-outline'}
                    >
                      {item.condition || 'Tình trạng'}
                    </Button>
                  }
                  anchorPosition="bottom"
                >
                  {CONDITION_OPTIONS.map((opt) => (
                    <Menu.Item
                      key={opt.value}
                      onPress={() => {
                        updateCondition(item.isbn, opt.value);
                        setConditionMenuIsbn(null);
                      }}
                      title={opt.label}
                      leadingIcon={item.condition === opt.value ? 'check' : undefined}
                    />
                  ))}
                  <Menu.Item
                    onPress={() => {
                      updateCondition(item.isbn, '');
                      setConditionMenuIsbn(null);
                    }}
                    title="Xoá lựa chọn"
                    leadingIcon="close"
                  />
                </Menu>
                <MaterialCommunityIcons
                  name="close-circle-outline"
                  size={22}
                  color={c.error}
                  onPress={() => removeScanned(item.isbn)}
                  style={styles.scannedRemove}
                />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.scannedEmpty}>Chưa có sách nào được quét</Text>
        )}

        {!hasActiveRecords && !hasScanned ? (
          <View style={styles.emptyCameraOverlay}>
            <MaterialCommunityIcons name="book-check-outline" size={36} color={c.onSurfaceVariant} />
            <Text style={styles.mutedCenterText}>Không có sách đang mượn</Text>
            <Text style={styles.mutedCenterText}>Có thể đổi patron để tiếp tục</Text>
          </View>
        ) : null}

        <Button
          mode="contained"
          onPress={handleBatchReturn}
          loading={batchReturning}
          disabled={batchReturning || !hasScanned}
          style={styles.returnButton}
          icon="check"
          contentStyle={styles.largeButtonContent}
        >
          {batchReturning ? 'Đang trả...' : `Xác nhận trả (${scannedReturns.length} cuốn)`}
        </Button>
      </SectionCard>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <GradientHeader
          title="Trả sách tại quầy"
          subtitle={staffLookup ? `Độc giả: ${staffLookup.patron.full_name || staffLookup.patron.student_code}` : 'Staff scanner'}
          icon="book-check-outline"
        />

        <View style={styles.stepsRow}>
          <FilterPill
            label="Tra cứu MSSV"
            active={step === 'lookup'}
            onPress={() => {}}
          />
          <FilterPill
            label="Quét ISBN"
            active={step === 'scan'}
            onPress={() => {}}
          />
        </View>

        <SectionCard
          title="Tìm độc giả"
          icon="account-search-outline"
          accentColor={GRADIENTS.navy[0]}
          right={
            staffLookup ? (
              <Button mode="text" compact onPress={resetPatron}>
                Đổi
              </Button>
            ) : undefined
          }
        >
          <View style={styles.lookupRow}>
            <TextInput
              label="MSSV"
              value={studentCode}
              onChangeText={setStudentCode}
              autoCapitalize="characters"
              keyboardType="number-pad"
              mode="outlined"
              style={[styles.input, styles.lookupInput]}
              outlineStyle={styles.inputOutline}
              right={
                <TextInput.Icon
                  icon="magnify"
                  onPress={() => loadPatronBorrows()}
                  disabled={isLoadingPatron}
                  color={c.primary}
                />
              }
            />
            <Button
              mode="contained"
              onPress={() => loadPatronBorrows()}
              loading={isLoadingPatron}
              disabled={isLoadingPatron}
              style={styles.lookupButton}
              contentStyle={styles.lookupButtonContent}
              icon="arrow-right"
            >
              Tìm
            </Button>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={c.error} />
              <Text style={styles.errorText} selectable>{error}</Text>
            </View>
          ) : null}
        </SectionCard>

        {isLoadingPatron ? <LoadingOverlay loading message="Đang tải..." /> : null}

        {staffLookup ? (
          <SectionCard
            title="Thông tin độc giả"
            icon="account-outline"
            accentColor={GRADIENTS.steel[0]}
          >
            <View style={styles.patronHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(staffLookup.patron.full_name || staffLookup.patron.student_code).slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.patronInfo}>
                <Text variant="titleMedium" style={styles.cardTitle} numberOfLines={1} selectable>
                  {staffLookup.patron.full_name || staffLookup.patron.student_code}
                </Text>
                <Text variant="bodySmall" style={styles.mutedText} selectable>
                  MSSV {staffLookup.patron.student_code}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statHalf}>
                <StatCard
                  label="Đang mượn"
                  value={staffLookup.total}
                  icon="book-open-variant"
                  gradient={GRADIENTS.navy}
                />
              </View>
              <View style={styles.statHalf}>
                <StatCard
                  label="Quá hạn"
                  value={staffLookup.overdue_count}
                  icon="alert-circle-outline"
                  gradient={staffLookup.overdue_count > 0 ? GRADIENTS.red : GRADIENTS.emerald}
                />
              </View>
            </View>

            {activeRecords.length === 0 ? (
              <EmptyState icon="book-check-outline" message="Không có sách đang mượn — có thể đổi MSSV" />
            ) : (
              <View style={styles.recordsBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Sách đang mượn</Text>
                  {staffLookup.overdue_count > 0 ? (
                    <Chip compact style={styles.errorChip} textStyle={styles.errorChipText}>
                      {staffLookup.overdue_count} quá hạn
                    </Chip>
                  ) : null}
                </View>
                <View style={styles.recordsList}>{activeRecords.map(renderBorrowRecord)}</View>
              </View>
            )}
          </SectionCard>
        ) : null}

        {renderScanner()}
      </ScrollView>

      <NoticeSnackbar
        visible={!!snackbar || !!scanToast}
        message={snackbar || scanToast}
        severity={(snackbar || scanToast).includes('✓') || (snackbar || scanToast).includes('Đã thêm') ? 'success' : ((snackbar || scanToast).includes('✗') ? 'error' : 'info')}
        onDismiss={() => { setSnackbar(''); setScanToast(''); }}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  const success = theme.dark ? '#4A8C5C' : '#067647';
  const warningBg = theme.dark ? 'rgba(196, 154, 60, 0.16)' : '#FFF4E5';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingBottom: 28,
      gap: 12,
    },
    stepsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
    },
    cardTitle: {
      color: c.onSurface,
      fontWeight: '800',
    },
    mutedText: {
      color: c.onSurfaceVariant,
    },
    mutedCenterText: {
      color: c.onSurfaceVariant,
      textAlign: 'center',
    },
    lookupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    lookupInput: {
      flex: 1,
    },
    lookupButton: {
      borderRadius: 10,
      minWidth: 86,
    },
    lookupButtonContent: {
      minHeight: 52,
    },
    input: {
      backgroundColor: c.surface,
    },
    inputOutline: {
      borderRadius: 10,
    },
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
    patronHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: c.onPrimary,
      fontWeight: '900',
      fontSize: 18,
    },
    patronInfo: {
      flex: 1,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    statHalf: {
      flex: 1,
    },
    recordsBlock: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    sectionTitle: {
      color: c.onSurface,
      fontSize: 14,
      fontWeight: '800',
    },
    recordsList: {
      gap: 8,
    },
    recordCard: {
      backgroundColor: c.surfaceVariant,
      borderRadius: 14,
      borderColor: c.outlineVariant,
      borderWidth: 0.5,
      overflow: 'hidden',
      position: 'relative',
      padding: 12,
    },
    recordContent: {
      paddingVertical: 12,
    },
    recordHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    recordTitleWrap: {
      flex: 1,
    },
    recordFooter: {
      marginTop: 9,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      flexWrap: 'wrap',
    },
    primaryChip: {
      backgroundColor: c.primaryContainer,
    },
    primaryChipText: {
      color: theme.dark ? c.primary : c.onSurface,
      fontSize: 12,
      fontWeight: '800',
    },
    errorChip: {
      backgroundColor: c.errorContainer,
    },
    errorChipText: {
      color: c.error,
      fontSize: 12,
      fontWeight: '800',
    },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 28,
      gap: 6,
    },
    emptyCameraOverlay: {
      alignItems: 'center',
      paddingVertical: 16,
      gap: 6,
    },
    cameraWrap: {
      height: 190,
      marginHorizontal: 16,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: c.surfaceVariant,
      marginBottom: 12,
    },
    camera: {
      flex: 1,
    },
    cameraOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanArea: {
      width: 250,
      height: 112,
      position: 'relative',
    },
    cameraHint: {
      color: '#FFFFFF',
      marginTop: 12,
      fontSize: 13,
      fontWeight: '700',
    },
    corner: {
      position: 'absolute',
      width: 32,
      height: 32,
      borderColor: c.primary,
      borderWidth: 2.5,
    },
    topLeft: {
      top: 0,
      left: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderTopLeftRadius: 12,
    },
    topRight: {
      top: 0,
      right: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
      borderTopRightRadius: 12,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomLeftRadius: 12,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderBottomRightRadius: 12,
    },
    permissionBox: {
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 14,
      backgroundColor: c.surfaceVariant,
      alignItems: 'center',
      gap: 9,
      marginBottom: 12,
    },
    permissionBtn: {
      borderRadius: 10,
    },
    inlineWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      padding: 10,
      borderRadius: 10,
      backgroundColor: warningBg,
    },
    warningText: {
      color: theme.colors.tertiary,
      flex: 1,
      fontSize: 13,
    },
    matchBox: {
      marginTop: 10,
      padding: 10,
      borderRadius: 10,
      backgroundColor: `${success}18`,
      borderWidth: 1,
      borderColor: `${success}66`,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    matchTextWrap: {
      flex: 1,
    },
    successText: {
      color: success,
      fontSize: 12,
      marginTop: 2,
      fontWeight: '700',
    },
    returnButton: {
      borderRadius: 10,
      marginHorizontal: 16,
      marginTop: 4,
    },
    largeButtonContent: {
      minHeight: 48,
    },
    scannedList: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    scannedListTitle: {
      color: c.onSurface,
      fontWeight: '800',
      marginBottom: 4,
    },
    scannedItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: c.surfaceVariant,
    },
    scannedItemDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    scannedItemInfo: {
      flex: 1,
      minWidth: 0,
    },
    scannedIsbn: {
      color: c.primary,
      fontSize: 11,
      fontFamily: 'monospace',
      marginTop: 2,
    },
    scannedConditionBtn: {
      borderRadius: 8,
      minWidth: 0,
    },
    scannedConditionContent: {
      minHeight: 30,
    },
    scannedRemove: {
      padding: 4,
    },
    scannedEmpty: {
      color: c.onSurfaceVariant,
      fontSize: 13,
      marginTop: 12,
      textAlign: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
  });
}
