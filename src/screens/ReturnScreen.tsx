import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Card, Chip, Surface, Text, TextInput } from 'react-native-paper';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { borrowApi } from '../api/borrow';
import { BorrowRecord, StaffPatronActiveBorrowsResponse } from '../types';
import { colors } from '../theme/colors';
import { formatDate, getDaysUntil, isOverdue } from '../utils/dateUtils';

interface ReturnScreenProps {
  navigation: any;
}

type StepState = 'lookup' | 'scan' | 'ready';
type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export default function ReturnScreen({ navigation: _navigation }: ReturnScreenProps) {
  const [studentCode, setStudentCode] = useState('');
  const [isbn, setIsbn] = useState('');
  const [staffLookup, setStaffLookup] = useState<StaffPatronActiveBorrowsResponse | null>(null);
  const [isLoadingPatron, setIsLoadingPatron] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const activeRecords = staffLookup?.records ?? [];
  const normalizedIsbn = isbn.trim();

  const matchedRecord = useMemo(() => {
    if (!normalizedIsbn) return null;
    return activeRecords.find((record) => record.book?.isbn === normalizedIsbn) ?? null;
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
    setScanned(true);
    setIsbn(result.data.trim());
  };

  const handleReturn = async () => {
    const code = studentCode.trim();
    if (!code || !normalizedIsbn || !staffLookup || !matchedRecord) return;

    setIsReturning(true);
    setError(null);
    try {
      const result = await borrowApi.returnByPatron(code, normalizedIsbn);
      Alert.alert('Trả sách thành công', result.message || 'Đã cập nhật phiếu mượn', [
        {
          text: 'OK',
          onPress: async () => {
            setIsbn('');
            setScanned(false);
            await loadPatronBorrows(code);
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Không thể trả sách', extractErrorMessage(err, 'Trả sách thất bại'));
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
          color={active || complete ? colors.background : colors.textSecondary}
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
      <Card key={record.id} style={[styles.recordCard, isMatched && styles.recordCardMatched]}>
        <Card.Content style={styles.recordContent}>
          <View style={styles.recordHeader}>
            <View style={styles.recordTitleWrap}>
              <Text variant="titleSmall" style={styles.recordTitle} numberOfLines={2} selectable>
                {record.book?.title || record.book_id}
              </Text>
              <Text variant="bodySmall" style={styles.recordMeta} selectable>
                ISBN {record.book?.isbn || record.book_id}
              </Text>
            </View>
            <Chip
              compact
              style={[styles.statusChip, overdue ? styles.overdueChip : styles.borrowedChip]}
              textStyle={[styles.statusChipText, overdue && styles.overdueChipText]}
            >
              {overdue ? 'Quá hạn' : 'Đang mượn'}
            </Chip>
          </View>
          <View style={styles.recordFooter}>
            <Text style={styles.recordDateText}>Mượn {formatDate(record.borrow_at)}</Text>
            <Text style={[styles.recordDateText, overdue && styles.overdueText]}>
              Hạn {formatDate(record.due_at)} · {overdue ? `trễ ${Math.abs(daysLeft)} ngày` : `còn ${daysLeft} ngày`}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderScanner = () => {
    if (!staffLookup || activeRecords.length === 0) return null;

    if (!permission) {
      return <ActivityIndicator color={colors.primary} style={styles.loader} />;
    }

    return (
      <Surface style={styles.panel} elevation={0}>
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleGroup}>
            <MaterialCommunityIcons name="barcode-scan" size={22} color={colors.primary} />
            <View>
              <Text variant="titleMedium" style={styles.panelTitle}>Quét sách trả</Text>
              <Text style={styles.panelSubtitle}>Mã góc ISBN trên bìa sách</Text>
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
            <MaterialCommunityIcons name="camera-off-outline" size={34} color={colors.textSecondary} />
            <Text style={styles.permissionText}>Chưa có quyền camera</Text>
            <Button mode="contained" onPress={requestPermission} style={styles.actionButton} icon="camera">
              Cấp quyền
            </Button>
          </View>
        )}

        <TextInput
          label="ISBN / mã góc sách"
          value={isbn}
          onChangeText={(value) => {
            setIsbn(value.trim());
            setScanned(false);
          }}
          mode="outlined"
          keyboardType="number-pad"
          style={styles.input}
          outlineStyle={styles.inputOutline}
          activeOutlineColor={colors.primary}
          right={<TextInput.Icon icon="barcode" color={colors.primary} />}
        />

        {normalizedIsbn && !matchedRecord ? (
          <View style={styles.inlineWarning}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.warning} />
            <Text style={styles.inlineWarningText}>
              MSSV này không có sách đang mượn với ISBN {normalizedIsbn}
            </Text>
          </View>
        ) : null}

        {matchedRecord ? (
          <View style={styles.matchBox}>
            <MaterialCommunityIcons name="book-check-outline" size={24} color={colors.success} />
            <View style={styles.matchTextWrap}>
              <Text style={styles.matchTitle} numberOfLines={2}>
                {matchedRecord.book?.title || matchedRecord.book_id}
              </Text>
              <Text style={styles.matchMeta}>Sẵn sàng xác nhận trả</Text>
            </View>
          </View>
        ) : null}

        <Button
          mode="contained"
          onPress={handleReturn}
          loading={isReturning}
          disabled={!canReturn}
          style={[styles.returnButton, !canReturn && styles.returnButtonDisabled]}
          icon="check"
          contentStyle={styles.returnButtonContent}
        >
          Xác nhận trả
        </Button>
      </Surface>
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

        <Surface style={styles.panel} elevation={0}>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleGroup}>
              <MaterialCommunityIcons name="account-search-outline" size={22} color={colors.primary} />
              <View>
                <Text variant="titleMedium" style={styles.panelTitle}>Tìm độc giả</Text>
                <Text style={styles.panelSubtitle}>Nhập MSSV trước khi quét sách</Text>
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
              outlineStyle={styles.inputOutline}
              activeOutlineColor={colors.primary}
              right={
                <TextInput.Icon
                  icon="magnify"
                  onPress={() => loadPatronBorrows()}
                  disabled={isLoadingPatron}
                  color={colors.primary}
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
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={styles.errorText} selectable>{error}</Text>
            </View>
          ) : null}
        </Surface>

        {isLoadingPatron ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}

        {staffLookup ? (
          <Surface style={styles.panel} elevation={0}>
            <View style={styles.patronHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(staffLookup.patron.full_name || staffLookup.patron.student_code).slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.patronInfo}>
                <Text variant="titleMedium" style={styles.patronName} numberOfLines={1} selectable>
                  {staffLookup.patron.full_name || staffLookup.patron.student_code}
                </Text>
                <Text variant="bodySmall" style={styles.patronMeta} selectable>
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
                <MaterialCommunityIcons name="book-check-outline" size={42} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Không có sách đang mượn</Text>
                <Text style={styles.emptyText}>Có thể đổi MSSV để tiếp tục tra cứu.</Text>
              </View>
            ) : (
              <View style={styles.recordsBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Sách đang mượn</Text>
                  {staffLookup.overdue_count > 0 ? (
                    <Chip compact style={styles.overdueChip} textStyle={styles.overdueChipText}>
                      {staffLookup.overdue_count} quá hạn
                    </Chip>
                  ) : null}
                </View>
                <View style={styles.recordsList}>{activeRecords.map(renderBorrowRecord)}</View>
              </View>
            )}
          </Surface>
        ) : null}

        {renderScanner()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  screenTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepPill: {
    flex: 1,
    minHeight: 34,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  stepPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  stepTextActive: {
    color: colors.background,
  },
  panel: {
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
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
  panelTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  panelSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
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
    borderRadius: 6,
    minWidth: 86,
  },
  lookupButtonContent: {
    minHeight: 52,
  },
  input: {
    backgroundColor: 'transparent',
  },
  inputOutline: {
    borderRadius: 6,
    borderColor: colors.border,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 6,
    backgroundColor: colors.error + '14',
    borderWidth: 0.5,
    borderColor: colors.error + '44',
  },
  errorText: {
    color: colors.error,
    flex: 1,
    fontSize: 13,
  },
  loader: {
    marginVertical: 12,
  },
  actionButton: {
    borderRadius: 6,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.background,
    fontWeight: '900',
    fontSize: 18,
  },
  patronInfo: {
    flex: 1,
  },
  patronName: {
    color: colors.text,
    fontWeight: '800',
  },
  patronMeta: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  countBox: {
    minWidth: 54,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
  },
  countNumber: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  countLabel: {
    color: colors.textSecondary,
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
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  recordsList: {
    gap: 8,
  },
  recordCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  recordCardMatched: {
    borderColor: colors.success,
    backgroundColor: colors.success + '12',
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
  recordTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  recordMeta: {
    color: colors.textSecondary,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  statusChip: {
    height: 28,
  },
  borrowedChip: {
    backgroundColor: colors.primary + '18',
  },
  overdueChip: {
    backgroundColor: colors.error + '18',
  },
  statusChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  overdueChipText: {
    color: colors.error,
  },
  recordFooter: {
    marginTop: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  recordDateText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  overdueText: {
    color: colors.error,
    fontWeight: '800',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
  cameraWrap: {
    height: 190,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
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
    color: colors.text,
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.primary,
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
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  permissionText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    backgroundColor: colors.warning + '14',
  },
  inlineWarningText: {
    color: colors.warning,
    flex: 1,
    fontSize: 13,
  },
  matchBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    backgroundColor: colors.success + '14',
    borderWidth: 0.5,
    borderColor: colors.success + '44',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  matchTextWrap: {
    flex: 1,
  },
  matchTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  matchMeta: {
    color: colors.success,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
  },
  returnButton: {
    borderRadius: 6,
    marginTop: 12,
  },
  returnButtonDisabled: {
    opacity: 0.62,
  },
  returnButtonContent: {
    minHeight: 48,
  },
});
