import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Image, ActivityIndicator, Linking, TouchableOpacity, ScrollView, Alert, Share } from 'react-native';
import { Dialog, Portal, Button, Text, useTheme, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { paymentApi } from '../api/payment';
import { PaymentOrderResponse } from '../types/payment';
import { triggerHaptic } from '../utils/haptics';
import { AppTheme } from '../theme/DarkTheme';

async function safeCopyOrShare(text: string): Promise<void> {
  try {
    await Share.share({
      message: text,
      title: 'Thông tin chuyển khoản SePay',
    });
  } catch {
    // Dismissed share sheet
  }
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
    setCopiedField(field);
    await safeCopyOrShare(text);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = async () => {
    if (!order) return;
    triggerHaptic.selection();
    const allInfo = `Ngân hàng: ${bankName}\nSố tài khoản: ${accountNumber}\nChủ tài khoản: ${accountHolder}\nSố tiền: ${Number(order.amount).toLocaleString('vi-VN')} đ\nNội dung: ${transferMsg}`;
    setCopiedField('all');
    await safeCopyOrShare(allInfo);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSaveQrToAlbum = async () => {
    triggerHaptic.selection();
    Alert.alert(
      'Lưu ảnh QR vào Album',
      'Đang mở ảnh QR. Bạn nhấn giữ vào ảnh và chọn "Tải hình ảnh xuống" để lưu vào Thư viện ảnh / Album của máy.\n\nSau đó vào app ngân hàng bất kỳ, chọn "Quét QR từ thư viện ảnh" để thanh toán.',
      [
        {
          text: 'Mở ảnh ngay',
          onPress: () => {
            Linking.openURL(qrImageUri).catch(() => {});
          },
        },
      ]
    );
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

  // VietQR quicklink image URI
  const qrImageUri = order.qrUrl || `https://img.vietqr.io/image/MB-0395324779-compact2.png?amount=${order.amount}&addInfo=${encodeURIComponent(transferMsg)}&accountName=${encodeURIComponent(accountHolder)}`;

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
                {/* QR Image Card */}
                <View style={styles.qrCard}>
                  <Image source={{ uri: qrImageUri }} style={styles.qrImage} resizeMode="contain" />
                  <Text variant="labelSmall" style={styles.napasTag}>
                    Chuẩn Napas 247 · Tự động gạch nợ qua SePay
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
                    Thông tin chuyển khoản
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

                {/* Primary Action Button: Save QR to Album */}
                <Button
                  mode="contained"
                  icon="download"
                  onPress={handleSaveQrToAlbum}
                  style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
                  contentStyle={{ height: 46 }}
                  labelStyle={{ fontWeight: '800', fontSize: 13 }}
                >
                  Lưu ảnh QR vào Album / Thư viện
                </Button>

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
                    icon="open-in-new"
                    onPress={() => Linking.openURL(qrImageUri).catch(() => {})}
                    style={styles.halfBtn}
                    labelStyle={{ fontSize: 11, fontWeight: '700' }}
                  >
                    Xem ảnh đầy đủ
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
