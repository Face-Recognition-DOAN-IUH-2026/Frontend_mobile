import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../../../theme/DarkTheme';
import { GradientHeader } from '../../../theme/MobileDesignSystem';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { buildN8nChatHtml } from '../utils/buildN8nChatHtml';
import { devError } from '../../../utils/logger';

/** Webhook Public Streaming Chat Trigger của n8n (cùng biến với Frontend_Web). */
const CHAT_WEBHOOK_URL =
  process.env.EXPO_PUBLIC_CHAT_WEBHOOK_URL?.trim() || '';

/** metadata gửi kèm mỗi tin nhắn để workflow n8n biết đang trò chuyện với ai. */
function buildMetadata(
  user: { id?: string; full_name?: string; role?: string } | null,
): Record<string, string> {
  if (!user?.id) return { role: 'guest' };
  return {
    userId: user.id,
    role: user.role || 'patron',
    fullName: user.full_name || '',
  };
}

interface N8nChatScreenProps {
  user?: { id?: string; full_name?: string; role?: string } | null;
}

export default function N8nChatScreen({ user = null }: N8nChatScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [webhookDown, setWebhookDown] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const html = useMemo(() => {
    if (!CHAT_WEBHOOK_URL) return '';
    try {
      return buildN8nChatHtml({
        webhookUrl: CHAT_WEBHOOK_URL,
        metadata: buildMetadata(user),
      });
    } catch {
      return '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, retryKey]);

  const handleRetry = useCallback(() => {
    setWebhookDown(false);
    setLoading(true);
    setRetryKey(prev => prev + 1);
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type !== 'n8n-chat-status') return;

      // Chỉ coi là "webhook-down" khi lỗi đến từ việc gửi tin nhắn thật (fetch wrapper)
  // hoặc khi khởi tạo widget bị lỗi. Lỗi probe OPTIONS (webhook-probe-*) do mạng
  // di động/WebView chặn preflight KHÔNG làm sập toàn bộ chat.
      if (payload.status === 'webhook-error' || payload.status === 'chat-init-error') {
        // Ghi nhận chi tiết lỗi từ WebView (ví dụ status HTTP / lỗi mạng) để chẩn
        // đoán khi chatbot không hoạt động trên thiết bị thật.
        devError('[N8nChat] webhook error:', payload.status, payload.detail);
        setWebhookDown(true);
      } else if (payload.status === 'webhook-ok' || payload.status === 'chat-ready' || payload.status === 'webhook-probe-ok' || payload.status === 'webhook-probe-warn' || payload.status === 'webhook-probe-failed') {
        // Probe thành công/cảnh báo/thất bại: không chặn chat, chỉ ghi log.
        if (payload.status === 'webhook-probe-failed') {
          devError('[N8nChat] probe failed:', payload.detail);
        }
        setWebhookDown(false);
      }
    } catch {
      // Tin nhắn không phải JSON hợp lệ — bỏ qua, không được làm sập màn hình.
    }
  }, []);

  const handleLoadEnd = useCallback(() => setLoading(false), []);

  // Chưa cấu hình webhook -> chặn sớm với thông báo rõ ràng thay vì WebView trắng.
  if (!html) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <GradientHeader title="TVTL AI" subtitle="Trợ lý thông minh" icon="robot" />
        <View style={styles.center}>
          <MaterialCommunityIcons name="alert-circle-outline" size={56} color={theme.colors.error} />
          <Text variant="titleMedium" style={styles.errorTitle}>
            Chưa cấu hình trợ lý AI
          </Text>
          <Text variant="bodyMedium" style={styles.errorDesc}>
            Biến môi trường EXPO_PUBLIC_CHAT_WEBHOOK_URL chưa được thiết lập.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GradientHeader title="TVTL AI" subtitle="Trợ lý thông minh" icon="robot" />

      <View style={styles.webViewWrap}>
        <WebView
          key={retryKey}
          source={{ html }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          // WebView nạp HTML nội bộ: Origin là "null". Webhook n8n đã được xác
          // nhận echo Origin "null" trong CORS nên preflight OPTIONS sẽ qua.
          mixedContentMode="always"
          allowsInlineMediaPlayback
          setSupportMultipleWindows={false}
          keyboardDisplayRequiresUserAction={false}
          onMessage={handleMessage}
          onLoadEnd={handleLoadEnd}
          startInLoadingState={false}
          style={styles.webView}
        />

        {loading ? <LoadingOverlay loading message="Đang kết nối trợ lý AI..." /> : null}

        {webhookDown && !loading ? (
          <View style={styles.errorOverlay}>
            <MaterialCommunityIcons
              name="wifi-off"
              size={56}
              color={theme.colors.error}
            />
            <Text variant="titleMedium" style={styles.errorTitle}>
              Không thể kết nối trợ lý AI
            </Text>
            <Text variant="bodyMedium" style={styles.errorDesc}>
              Dịch vụ chatbot đang tạm thời gián đoạn. Vui lòng kiểm tra mạng và thử lại.
            </Text>
            <Button
              mode="contained"
              onPress={handleRetry}
              style={styles.retryButton}
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
              icon="refresh"
            >
              Thử lại
            </Button>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    webViewWrap: {
      flex: 1,
      position: 'relative',
    },
    webView: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: c.background,
    },
    errorTitle: {
      color: c.onSurface,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
      textAlign: 'center',
    },
    errorDesc: {
      color: c.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    retryButton: {
      borderRadius: 20,
      paddingHorizontal: 24,
    },
  });
}
