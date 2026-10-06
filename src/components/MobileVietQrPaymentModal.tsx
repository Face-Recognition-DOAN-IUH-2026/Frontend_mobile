import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Image, ActivityIndicator, Linking } from 'react-native';
import { Dialog, Portal, Button, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { paymentApi } from '../api/payment';
import { PaymentOrderResponse } from '../types/payment';
import { triggerHaptic } from '../utils/haptics';
import { AppTheme } from '../theme/DarkTheme';

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

  if (!visible || !order) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleOpenBankApp = () => {
    triggerHaptic.selection();
    if (order.qrUrl) {
      Linking.openURL(order.qrUrl).catch(() => {});
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={[styles.dialog, { backgroundColor: theme.colors.surface }]}>
        <Dialog.Title style={styles.title}>
          <MaterialCommunityIcons name="qrcode-scan" size={24} color={theme.colors.primary} />
          {'  '}Thanh toán VietQR Napas
        </Dialog.Title>

        <Dialog.Content style={styles.content}>
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
              {order.qrUrl ? (
                <View style={styles.qrCard}>
                  <Image source={{ uri: order.qrUrl }} style={styles.qrImage} resizeMode="contain" />
                </View>
              ) : null}

              <Text variant="headlineSmall" style={[styles.amount, { color: theme.colors.primary }]}>
                {Number(order.amount).toLocaleString('vi-VN')} đ
              </Text>

              {patronName ? (
                <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                  {patronName} {studentCode ? `(${studentCode})` : ''}
                </Text>
              ) : null}

              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                Mã GD: {order.orderCode}
              </Text>

              <View style={styles.countdownRow}>
                <MaterialCommunityIcons name="timer-outline" size={16} color={timeLeft < 120 ? '#B85C4A' : theme.colors.onSurfaceVariant} />
                <Text variant="labelMedium" style={{ fontWeight: '700', color: timeLeft < 120 ? '#B85C4A' : theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                  Hết hạn sau: {timeFormatted}
                </Text>
              </View>

              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8, fontStyle: 'italic' }}>
                  {checking ? 'Đang kiểm tra kết quả...' : 'Đang chờ nhận tiền chuyển khoản...'}
                </Text>
              </View>

              {order.qrUrl && (
                <Button
                  mode="outlined"
                  icon="bank"
                  onPress={handleOpenBankApp}
                  style={styles.deepLinkBtn}
                  contentStyle={{ height: 38 }}
                >
                  Mở ảnh QR để quét
                </Button>
              )}
            </View>
          )}
        </Dialog.Content>

        <Dialog.Actions style={{ justifyContent: 'center', paddingBottom: 16 }}>
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
    maxWidth: 360,
    alignSelf: 'center',
    width: '90%',
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 18,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 16,
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
    marginBottom: 12,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  amount: {
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 4,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  deepLinkBtn: {
    marginTop: 8,
    borderRadius: 10,
    width: '100%',
  },
  completedBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
