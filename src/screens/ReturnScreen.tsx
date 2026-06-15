import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { borrowApi } from '../api/borrow';
import { AppTheme } from '../theme/DarkTheme';
import { BorrowRecord, StaffPatronActiveBorrowsResponse } from '../types';
import { formatDate, getDaysUntil, isOverdue } from '../utils/dateUtils';

type StepState = 'lookup' | 'scan' | 'ready';
type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const normalizeBookCode = (value?: string | null) =>
  (value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .replace(/\.0+$/, '');

export default function ReturnScreen() {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [studentCode, setStudentCode] = useState('');
  const [isbn, setIsbn] = useState('');
  const [staffLookup, setStaffLookup] = useState<StaffPatronActiveBorrowsResponse | null>(null);
  const [isLoadingPatron, setIsLoadingPatron] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [permission, requestPermission] = useCameraPermissions();

  const activeRecords = staffLookup?.records ?? [];
  const normalizedIsbn = normalizeBookCode(isbn);

  const matchedRecord = useMemo(() => {
    if (!normalizedIsbn) return null;
    return activeRecords.find((record) => normalizeBookCode(record.book?.isbn) === normalizedIsbn) ?? null;
  }, [activeRecords, normalizedIsbn]);

  const step: StepState = !staffLookup ? 'lookup' : normalizedIsbn && matchedRecord ? 'ready' : 'scan';
  const canReturn = !!staffLookup && !!normalizedIsbn && !!matchedRecord && !isReturning;

  const extractErrorMessage = (err: any, fallback: string) =>
    err?.response?.data?.detail || err?.response?.data?.error || fallback;

  const extractLookupErrorMessage = (err: any) => {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail || err?.response?.data?.error;
    if (status === 404 && detail === 'Not Found') {
      return 'Backend chưa có endpoint tra cứu theo MSSV. Vui lòng rebuild/restart borrow-service và gateway.';
    }
    return detail || 'Không tìm thấy độc giả hoặc không thể tải sách đang mượn';
  };

  const loadPatronBorrows = async (code = studentCode.trim()) => {
    if (!code) {
      setError('Vui lòng nhập MSSV trước khi tra cứu');
      return;
    }

    setIsLoadingPatron(true);
    setError(null);
    setIsbn('');
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

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || !result.data) return;
    const code = normalizeBookCode(result.data);
    if (!code) return;
    setScanned(true);
    setIsbn(code);
    setTimeout(() => setScanned(false), 1200);
  };

  const handleReturn = async () => {
    const code = studentCode.trim();
    if (!code || !normalizedIsbn || !staffLookup || !matchedRecord) return;

    setConfirmVisible(false);
    setIsReturning(true);
    setError(null);
    try {
      const result = await borrowApi.returnByPatron(code, normalizedIsbn);
      setSnackbar(result.message || 'Đã cập nhật phiếu mượn');
      setIsbn('');
      setScanned(false);
      await loadPatronBorrows(code);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Trả sách thất bại'));
    } finally {
      setIsReturning(false);
    }
  };

  const resetPatron = () => {
    setStaffLookup(null);
    setStudentCode('');
    setIsbn('');
    setScanned(false);
    setError(null);
  };

  const renderStepPill = (value: StepState, label: string, icon: MaterialIconName) => {
    const active = step === value;
    const complete = value === 'lookup' ? !!staffLookup : value === 'scan' ? !!normalizedIsbn : !!matchedRecord;
    return (
      <View style={[styles.stepPill, (active || complete) && styles.stepPillActive]}>
        <MaterialCommunityIcons
          name={complete ? 'check-circle' : icon}
          size={15}
          color={active || complete ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
        />
        <Text style={[styles.stepText, (active || complete) && styles.stepTextActive]}>{label}</Text>
      </View>
    );
  };

  const renderBorrowRecord = (record: BorrowRecord) => {
    const daysLeft = getDaysUntil(record.due_at);
    const overdue = isOverdue(record.due_at);
    const isMatched = matchedRecord?.id === record.id;

    return (
      <Card key={record.id} mode="outlined" style={[styles.recordCard, isMatched && styles.recordCardMatched]}>
        <Card.Content style={styles.recordContent}>
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
        </Card.Content>
      </Card>
    );
  };

  const renderScanner = () => {
    if (!staffLookup || activeRecords.length === 0) return null;

    if (!permission) {
      return <ActivityIndicator color={theme.colors.primary} style={styles.loader} />;
    }

    return (
      <Card mode="outlined" style={styles.panel}>
        <Card.Content>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleGroup}>
              <MaterialCommunityIcons name="barcode-scan" size={22} color={theme.colors.primary} />
              <View>
                <Text variant="titleMedium" style={styles.cardTitle}>Quét sách trả</Text>
                <Text style={styles.mutedText}>Mã góc ISBN trên bìa sách</Text>
              </View>
            </View>
            {normalizedIsbn ? (
              <Button mode="text" compact onPress={() => { setIsbn(''); setScanned(false); }}>
                Xóa
              </Button>
            ) : null}
          </View>

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
              <MaterialCommunityIcons name="camera-off-outline" size={34} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.mutedText}>Chưa có quyền camera</Text>
              <Button mode="contained" onPress={requestPermission} icon="camera">
                Cấp quyền
              </Button>
            </View>
          )}

          <TextInput
            label="ISBN / mã góc sách"
            value={isbn}
            onChangeText={(value) => {
              setIsbn(value);
              setScanned(false);
            }}
            mode="outlined"
            keyboardType="number-pad"
            style={styles.input}
            right={<TextInput.Icon icon="barcode" color={theme.colors.primary} />}
          />

          {normalizedIsbn && !matchedRecord ? (
            <View style={styles.inlineWarning}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.colors.tertiary} />
              <Text style={styles.warningText}>
                MSSV này không có sách đang mượn với ISBN {normalizedIsbn}
              </Text>
            </View>
          ) : null}

          {matchedRecord ? (
            <View style={styles.matchBox}>
              <MaterialCommunityIcons name="book-check-outline" size={24} color={theme.dark ? '#4A8C5C' : '#067647'} />
              <View style={styles.matchTextWrap}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {matchedRecord.book?.title || matchedRecord.book_id}
                </Text>
                <Text style={styles.successText}>Sẵn sàng xác nhận trả</Text>
              </View>
            </View>
          ) : null}

          <Button
            mode="contained"
            onPress={() => setConfirmVisible(true)}
            loading={isReturning}
            disabled={!canReturn}
            style={styles.returnButton}
            icon="check"
            contentStyle={styles.largeButtonContent}
          >
            Xác nhận trả
          </Button>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>Staff scanner</Text>
          <Text variant="headlineSmall" style={styles.screenTitle}>Trả sách tại quầy</Text>
          <View style={styles.stepsRow}>
            {renderStepPill('lookup', 'MSSV', 'account-search-outline')}
            {renderStepPill('scan', 'ISBN', 'barcode-scan')}
            {renderStepPill('ready', 'Trả', 'check')}
          </View>
        </View>

        <Card mode="outlined" style={styles.panel}>
          <Card.Content>
            <View style={styles.panelHeader}>
              <View style={styles.panelTitleGroup}>
                <MaterialCommunityIcons name="account-search-outline" size={22} color={theme.colors.primary} />
                <View>
                  <Text variant="titleMedium" style={styles.cardTitle}>Tìm độc giả</Text>
                  <Text style={styles.mutedText}>Nhập MSSV trước khi quét sách</Text>
                </View>
              </View>
              {staffLookup ? (
                <Button mode="text" compact onPress={resetPatron}>
                  Đổi
                </Button>
              ) : null}
            </View>

            <View style={styles.lookupRow}>
              <TextInput
                label="MSSV"
                value={studentCode}
                onChangeText={setStudentCode}
                autoCapitalize="characters"
                keyboardType="number-pad"
                mode="outlined"
                style={[styles.input, styles.lookupInput]}
                right={
                  <TextInput.Icon
                    icon="magnify"
                    onPress={() => loadPatronBorrows()}
                    disabled={isLoadingPatron}
                    color={theme.colors.primary}
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
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.colors.error} />
                <Text style={styles.errorText} selectable>{error}</Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>

        {isLoadingPatron ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}

        {staffLookup ? (
          <Card mode="outlined" style={styles.panel}>
            <Card.Content>
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
                <View style={styles.countBox}>
                  <Text style={styles.countNumber}>{staffLookup.total}</Text>
                  <Text style={styles.countLabel}>sách</Text>
                </View>
              </View>

              {activeRecords.length === 0 ? (
                <View style={styles.emptyBox}>
                  <MaterialCommunityIcons name="book-check-outline" size={42} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.cardTitle}>Không có sách đang mượn</Text>
                  <Text style={styles.mutedCenterText}>Có thể đổi MSSV để tiếp tục tra cứu.</Text>
                </View>
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
            </Card.Content>
          </Card>
        ) : null}

        {renderScanner()}
      </ScrollView>

      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>Xác nhận trả sách</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Trả sách "{matchedRecord?.book?.title || matchedRecord?.book_id}" cho MSSV {studentCode.trim()}?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>Hủy</Button>
            <Button onPress={handleReturn} loading={isReturning}>Xác nhận</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const success = theme.dark ? '#4A8C5C' : '#067647';
  const warningBg = theme.dark ? 'rgba(196, 154, 60, 0.16)' : '#FFF4E5';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 28,
      gap: 12,
    },
    headerBlock: {
      gap: 8,
    },
    kicker: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    screenTitle: {
      color: theme.colors.onBackground,
      fontWeight: '800',
    },
    stepsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    stepPill: {
      flex: 1,
      minHeight: 34,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 5,
    },
    stepPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    stepText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      fontWeight: '700',
    },
    stepTextActive: {
      color: theme.colors.onPrimary,
    },
    panel: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 14,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 12,
    },
    panelTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      flex: 1,
    },
    cardTitle: {
      color: theme.colors.onSurface,
      fontWeight: '800',
    },
    mutedText: {
      color: theme.colors.onSurfaceVariant,
    },
    mutedCenterText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    lookupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    lookupInput: {
      flex: 1,
    },
    lookupButton: {
      borderRadius: 8,
      minWidth: 86,
    },
    lookupButtonContent: {
      minHeight: 52,
    },
    input: {
      backgroundColor: theme.colors.surface,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 12,
      padding: 10,
      borderRadius: 8,
      backgroundColor: theme.colors.errorContainer,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    loader: {
      marginVertical: 12,
    },
    patronHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: theme.colors.onPrimary,
      fontWeight: '900',
      fontSize: 18,
    },
    patronInfo: {
      flex: 1,
    },
    countBox: {
      minWidth: 54,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
    },
    countNumber: {
      color: theme.colors.primary,
      fontSize: 18,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    countLabel: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 11,
      fontWeight: '700',
    },
    recordsBlock: {
      marginTop: 14,
      gap: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    sectionTitle: {
      color: theme.colors.onSurface,
      fontSize: 14,
      fontWeight: '800',
    },
    recordsList: {
      gap: 8,
    },
    recordCard: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 12,
      borderColor: theme.colors.outlineVariant,
    },
    recordCardMatched: {
      borderColor: success,
      backgroundColor: `${success}18`,
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
      backgroundColor: theme.colors.primaryContainer,
    },
    primaryChipText: {
      color: theme.dark ? theme.colors.primary : theme.colors.onSurface,
      fontSize: 12,
      fontWeight: '800',
    },
    errorChip: {
      backgroundColor: theme.colors.errorContainer,
    },
    errorChipText: {
      color: theme.colors.error,
      fontSize: 12,
      fontWeight: '800',
    },
    errorText: {
      color: theme.colors.error,
      flex: 1,
      fontSize: 13,
    },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 28,
      gap: 6,
    },
    cameraWrap: {
      height: 190,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceVariant,
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
      backgroundColor: 'rgba(0,0,0,0.28)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanArea: {
      width: 245,
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
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    topLeft: {
      top: 0,
      left: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    topRight: {
      top: 0,
      right: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderLeftWidth: 0,
      borderTopWidth: 0,
    },
    permissionBox: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      gap: 9,
      marginBottom: 12,
    },
    inlineWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      padding: 10,
      borderRadius: 8,
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
      borderRadius: 8,
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
      borderRadius: 8,
      marginTop: 12,
    },
    largeButtonContent: {
      minHeight: 48,
    },
  });
}
