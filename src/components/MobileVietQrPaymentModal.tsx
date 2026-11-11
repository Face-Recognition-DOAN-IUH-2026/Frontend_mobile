import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Image, ActivityIndicator, Linking, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Dialog, Portal, Button, Text, useTheme, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { paymentApi } from '../api/payment';
import { PaymentOrderResponse } from '../types/payment';
import { triggerHaptic } from '../utils/haptics';
import { AppTheme } from '../theme/DarkTheme';

export interface PopularBank {
  id: string;
  name: string;
  shortName: string;
  schemes: string[];
  color: string;
}

export const POPULAR_BANKS: PopularBank[] = [
  { id: 'mb', name: 'MB Bank', shortName: 'MB Bank', schemes: ['mbbank://'], color: '#1428A0' },
  { id: 'vcb', name: 'Vietcombank', shortName: 'Vietcombank', schemes: ['vietcombankmobile://', 'vcb://', 'vcbdigibank://'], color: '#006B3F' },
  { id: 'tcb', name: 'Techcombank', shortName: 'Techcombank', schemes: ['tcb://', 'tcbmobile://'], color: '#EC1C24' },
  { id: 'bidv', name: 'BIDV', shortName: 'BIDV', schemes: ['bidv.smartbanking.partner://', 'bidvsmartbanking://'], color: '#006269' },
  { id: 'vpb', name: 'VPBank NEO', shortName: 'VPBank', schemes: ['vpbankneo://', 'vpb://'], color: '#00875A' },
  { id: 'acb', name: 'ACB ONE', shortName: 'ACB', schemes: ['acbone://', 'acbapp://'], color: '#004A99' },
  { id: 'tpb', name: 'TPBank', shortName: 'TPBank', schemes: ['hydro://', 'tpbank://'], color: '#7B1FA2' },
  { id: 'icb', name: 'VietinBank', shortName: 'VietinBank', schemes: ['vietinbankipay://'], color: '#0054A6' },
  { id: 'momo', name: 'MoMo', shortName: 'Ví MoMo', schemes: ['momo://'], color: '#A50064' },
];

async function safeCopyToClipboard(text: string): Promise<boolean> {
  try {
    const ExpoClipboard = require('expo-clipboard');
    if (ExpoClipboard && typeof ExpoClipboard.setStringAsync === 'function') {
      await ExpoClipboard.setStringAsync(text);
      return true;
    }
  } catch {
    // ExpoClipboard native module not linked in current APK build
  }

  try {
    const { Clipboard: RNClipboard } = require('react-native');
    if (RNClipboard && typeof RNClipboard.setString === 'function') {
      RNClipboard.setString(text);
      return true;
    }
  } catch {
    // Fallback Clipboard not available
  }

  return false;
}

export interface MobileVietQrPaymentModalProps {
  visible: boolean;
  order: PaymentOrderResponse | null;
  patronName?: string;
  studentCode?: string;
  onDismiss: () => void;
  onSuccess: (orderCode: string) => void;
}

export default function MobileVietQrPaymentModal({
  visible,
  order,
  patronName,
  studentCode,
  onDismiss,
  onSuccess,
}: MobileVietQrPaymentModalProps) {
  const theme = useTheme() as AppTheme;
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [status, setStatus] = useState<'pending' | 'completed' | 'expired'>('pending');
  const [checking, setChecking] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<PopularBank>(POPULAR_BANKS[0]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (order?.expiresAt) {
      const expTime = new Date(order.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expTime - Date.now()) / 1000));
      setTimeLeft(diff);
      setStatus(diff > 0 ? 'pending' : 'expired');
    } else {
      setTimeLeft(15 * 60);
      setStatus('pending');
    }
  }, [order]);

  // Countdown timer
  useEffect(() => {
    if (!visible || status !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, status]);

  // Polling payment status every 2.5s
  const checkStatus = useCallback(async () => {
    if (!order?.orderCode || status !== 'pending') return;
    try {
      setChecking(true);
      const res = await paymentApi.getOrderStatus(order.orderCode);
      if (res.status === 'completed') {
        setStatus('completed');
        if (pollingRef.current) clearInterval(pollingRef.current);
        triggerHaptic.success();
        setTimeout(() => {
          onSuccess(order.orderCode);
        }, 1500);
      } else if (res.status === 'expired') {
        setStatus('expired');
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch {
      // Best-effort polling
    } finally {
      setChecking(false);
    }
  }, [order?.orderCode, status, onSuccess]);

  useEffect(() => {
    if (!visible || !order?.orderCode || status !== 'pending') {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    pollingRef.current = setInterval(() => {
      void checkStatus();
    }, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [visible, order?.orderCode, status, checkStatus]);

  const handleCopy = async (text: string, field: string) => {
    triggerHaptic.selection();
    await safeCopyToClipboard(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = async () => {
    if (!order) return;
    triggerHaptic.selection();
    const allInfo = `Ngân hàng: ${bankName}\nSố tài khoản: ${accountNumber}\nChủ tài khoản: ${accountHolder}\nSố tiền: ${Number(order.amount).toLocaleString('vi-VN')} đ\nNội dung: ${transferMsg}`;
    await safeCopyToClipboard(allInfo);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSimulatePayment = async () => {
    if (!order?.orderCode || simulating) return;
    try {
      setSimulating(true);
      await paymentApi.simulatePayment(order.orderCode);
      setStatus('completed');
      if (pollingRef.current) clearInterval(pollingRef.current);
      triggerHaptic.success();
      setTimeout(() => {
        onSuccess(order.orderCode);
      }, 1500);
    } catch (err: any) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  if (!visible || !order) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const bankName = order.bankName || 'MB Bank (Ngân hàng Quân đội)';
  const accountNumber = order.accountNumber || '0395324779';
  const accountHolder = order.accountName || 'THU VIEN DAI HOC CONG NGHIEP TPHCM';
  const transferMsg = order.transferContent || order.orderCode;

  // Fallback to VietQR quicklink if qrUrl was null
  const qrImageUri = order.qrUrl || `https://img.vietqr.io/image/MB-0395324779-compact2.png?amount=${order.amount}&addInfo=${encodeURIComponent(transferMsg)}&accountName=${encodeURIComponent(accountHolder)}`;

  const handleOpenBankApp = async (targetBank?: PopularBank) => {
    const bank = targetBank || selectedBank;
    triggerHaptic.selection();

    // 1. Sao chép nội dung chuyển khoản vào clipboard trước
    await safeCopyToClipboard(transferMsg);
    setCopiedField('msg');

    // 2. Thử mở trực tiếp qua custom scheme nếu máy đã đăng ký
    for (const scheme of bank.schemes) {
      try {
        const can = await Linking.canOpenURL(scheme).catch(() => false);
        if (can) {
          await Linking.openURL(scheme);
          return;
        }
      } catch {
        // Tiếp tục thử phương án tiếp theo
      }
    }

    // 3. Thử gọi trực tiếp openURL với scheme chính (trên Android 11+, canOpenURL trả về false do package visibility nhưng openURL vẫn có thể mở được nếu app đã cài)
    try {
      const opened = await Linking.openURL(bank.schemes[0]).then(() => true).catch(() => false);
      if (opened) return;
    } catch {
      // Bỏ qua nếu không mở được
    }

    // 4. Mở qua Universal Deeplink chuẩn VietQR Kit (trình duyệt hệ thống kích hoạt Intent mở app ngân hàng)
    const dlUrl = `https://dl.vietqr.io/pay?app=${bank.id}&ba=${encodeURIComponent(accountNumber + '@' + (order.bankCode || 'mb').toLowerCase())}&am=${order.amount}&tn=${encodeURIComponent(transferMsg)}&bn=${encodeURIComponent(accountHolder)}`;
    try {
      const dlOpened = await Linking.openURL(dlUrl).then(() => true).catch(() => false);
      if (dlOpened) return;
    } catch {
      // Bỏ qua
    }

    // 5. Nếu không mở được app: Thông báo rõ ràng cho người dùng (TUYỆT ĐỐI không mở ảnh QR trên web gây hiểu lầm)
    Alert.alert(
      'Đã chép nội dung chuyển khoản',
      `Không thể tự động mở app ${bank.name}. Nội dung "${transferMsg}" đã được sao chép vào bộ nhớ tạm.\n\nVui lòng mở ứng dụng ngân hàng bạn đang dùng và dán nội dung này để hoàn tất.`,
      [{ text: 'Đã hiểu' }]
    );
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={[styles.dialog, { backgroundColor: theme.colors.surface }]}>
        <Dialog.Title style={styles.title}>
          <MaterialCommunityIcons name="qrcode-scan" size={24} color={theme.colors.primary} />
          {'  '}Thanh toán Chuyển khoản (SePay)
        </Dialog.Title>

        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {status === 'completed' ? (
              <View style={styles.completedBox}>
                <MaterialCommunityIcons name="check-circle" size={72} color="#4A8C5C" />
                <Text variant="titleMedium" style={{ fontWeight: '800', color: '#4A8C5C', marginTop: 12 }}>
                  Thanh toán thành công!
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 6 }}>
                  Khoản nợ đã được gạch và thẻ thư viện đã được kích hoạt lại tự động.
                </Text>
              </View>
            ) : status === 'expired' ? (
              <View style={styles.completedBox}>
                <MaterialCommunityIcons name="clock-alert-outline" size={64} color="#B85C4A" />
                <Text variant="titleMedium" style={{ fontWeight: '700', color: '#B85C4A', marginTop: 12 }}>
                  Mã QR đã hết hạn
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
                  Vui lòng đóng và tạo lại mã thanh toán mới.
                </Text>
              </View>
            ) : (
              <View style={styles.body}>
                {/* QR Image */}
                <View style={styles.qrCard}>
                  <Image source={{ uri: qrImageUri }} style={styles.qrImage} resizeMode="contain" />
                  <Text variant="labelSmall" style={styles.napasTag}>
                    Chuẩn Napas 247 · SePay / VietQR
                  </Text>
                </View>

                {/* Amount */}
                <Text variant="headlineSmall" style={[styles.amount, { color: theme.colors.primary }]}>
                  {Number(order.amount).toLocaleString('vi-VN')} đ
                </Text>

                {patronName ? (
                  <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                    {patronName} {studentCode ? `(${studentCode})` : ''}
                  </Text>
                ) : null}

                {/* Bank transfer details card */}
                <View style={[styles.bankDetailsCard, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceVariant + '40' }]}>
                  <Text variant="labelSmall" style={{ fontWeight: '800', color: theme.colors.primary, marginBottom: 8, textTransform: 'uppercase' }}>
                    Thông tin chuyển khoản thủ công
                  </Text>

                  {/* Bank Name */}
                  <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Ngân hàng:</Text>
                    <Text variant="bodySmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>{bankName}</Text>
                  </View>

                  {/* Account Number */}
                  <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Số tài khoản:</Text>
                    <TouchableOpacity
                      style={styles.copyRow}
                      onPress={() => handleCopy(accountNumber, 'acc')}
                      activeOpacity={0.7}
                    >
                      <Text selectable={true} variant="bodyMedium" style={{ fontFamily: 'monospace', fontWeight: '800', color: theme.colors.primary }}>
                        {accountNumber}
                      </Text>
                      <IconButton
                        icon={copiedField === 'acc' ? 'check' : 'content-copy'}
                        size={16}
                        iconColor={copiedField === 'acc' ? '#4A8C5C' : theme.colors.primary}
                        style={{ margin: 0, padding: 0 }}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Account Holder */}
                  <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Chủ tài khoản:</Text>
                    <Text variant="labelMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                      {accountHolder}
                    </Text>
                  </View>

                  {/* Transfer Note */}
                  <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Nội dung CK:</Text>
                    <TouchableOpacity
                      style={styles.copyRow}
                      onPress={() => handleCopy(transferMsg, 'msg')}
                      activeOpacity={0.7}
                    >
                      <Text selectable={true} variant="bodyMedium" style={{ fontFamily: 'monospace', fontWeight: '900', color: '#D32F2F' }}>
                        {transferMsg}
                      </Text>
                      <IconButton
                        icon={copiedField === 'msg' ? 'check' : 'content-copy'}
                        size={16}
                        iconColor={copiedField === 'msg' ? '#4A8C5C' : '#D32F2F'}
                        style={{ margin: 0, padding: 0 }}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text variant="labelSmall" style={{ color: '#D32F2F', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                    ⚠️ Giữ nguyên mã nội dung để hệ thống tự động gạch nợ
                  </Text>
                </View>

                {/* Countdown */}
                <View style={styles.countdownRow}>
                  <MaterialCommunityIcons name="timer-outline" size={16} color={timeLeft < 120 ? '#B85C4A' : theme.colors.onSurfaceVariant} />
                  <Text variant="labelMedium" style={{ fontWeight: '700', color: timeLeft < 120 ? '#B85C4A' : theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                    Hết hạn sau: {timeFormatted}
                  </Text>
                </View>

                {/* Polling */}
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8, fontStyle: 'italic' }}>
                    {checking ? 'Đang kiểm tra kết quả...' : 'Đang chờ nhận tiền chuyển khoản...'}
                  </Text>
                </View>

                {/* Primary Quick Pay Button */}
                <Button
                  mode="contained"
                  icon="bank"
                  onPress={() => handleOpenBankApp(selectedBank)}
                  style={[styles.primaryActionBtn, { backgroundColor: selectedBank.color || theme.colors.primary }]}
                  contentStyle={{ height: 46 }}
                  labelStyle={{ fontWeight: '800', fontSize: 13 }}
                >
                  Mở App {selectedBank.name}
                </Button>

                {/* Quick Bank Selector */}
                <View style={styles.bankPickerContainer}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 10, marginBottom: 6, fontWeight: '700', textTransform: 'uppercase' }}>
                    Hoặc chọn app ngân hàng của bạn để mở:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankChipScroll}>
                    {POPULAR_BANKS.map((b) => {
                      const isSelected = b.id === selectedBank.id;
                      return (
                        <TouchableOpacity
                          key={b.id}
                          style={[
                            styles.bankChip,
                            {
                              borderColor: isSelected ? b.color : theme.colors.outlineVariant,
                              backgroundColor: isSelected ? b.color + '20' : theme.colors.surface,
                            },
                          ]}
                          onPress={() => {
                            setSelectedBank(b);
                            void handleOpenBankApp(b);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.bankChipDot, { backgroundColor: b.color }]} />
                          <Text
                            variant="labelSmall"
                            style={{
                              fontWeight: isSelected ? '800' : '600',
                              color: isSelected ? b.color : theme.colors.onSurface,
                              fontSize: 11,
                            }}
                          >
                            {b.shortName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Secondary Quick Actions */}
                <View style={styles.secondaryBtnRow}>
                  <Button
                    mode="outlined"
                    compact
                    icon={copiedField === 'all' ? 'check' : 'content-copy'}
                    onPress={handleCopyAll}
                    style={styles.halfBtn}
                    labelStyle={{ fontSize: 11, fontWeight: '700' }}
                  >
                    {copiedField === 'all' ? 'Đã sao chép!' : 'Chép nhanh TT'}
                  </Button>

                  <Button
                    mode="outlined"
                    compact
                    icon="image-outline"
                    onPress={() => Linking.openURL(qrImageUri).catch(() => {})}
                    style={styles.halfBtn}
                    labelStyle={{ fontSize: 11, fontWeight: '700' }}
                  >
                    Xem ảnh QR lớn
                  </Button>
                </View>

                <Button
                  mode="text"
                  icon="play-circle-outline"
                  onPress={handleSimulatePayment}
                  loading={simulating}
                  disabled={simulating}
                  style={styles.demoBtn}
                  labelStyle={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}
                >
                  {simulating ? 'Đang xử lý...' : 'Demo: Giả lập đã chuyển khoản'}
                </Button>
              </View>
            )}
          </ScrollView>
        </Dialog.ScrollArea>

        <Dialog.Actions style={{ justifyContent: 'center', paddingBottom: 12 }}>
          <Button onPress={onDismiss} mode="text">
            {status === 'completed' ? 'Đóng' : 'Hủy bỏ'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 20,
    maxWidth: 380,
    alignSelf: 'center',
    width: '94%',
    maxHeight: '90%',
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 18,
    paddingBottom: 4,
  },
  scrollArea: {
    paddingHorizontal: 0,
    maxHeight: 520,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  body: {
    alignItems: 'center',
    width: '100%',
  },
  qrCard: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 8,
    alignItems: 'center',
  },
  qrImage: {
    width: 210,
    height: 210,
  },
  napasTag: {
    color: '#666',
    fontWeight: '600',
    marginTop: 4,
    fontSize: 10,
  },
  amount: {
    fontWeight: '900',
    marginTop: 2,
    marginBottom: 2,
  },
  bankDetailsCard: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  actionBtn: {
    marginTop: 6,
    borderRadius: 10,
    width: '100%',
  },
  primaryActionBtn: {
    marginTop: 10,
    borderRadius: 12,
    width: '100%',
  },
  bankPickerContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 4,
  },
  bankChipScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  bankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  bankChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  secondaryBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  halfBtn: {
    flex: 1,
    borderRadius: 10,
  },
  demoBtn: {
    marginTop: 4,
  },
  completedBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
