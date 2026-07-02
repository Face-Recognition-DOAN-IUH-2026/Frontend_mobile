import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Surface, Text, useTheme } from 'react-native-paper';
import { AppTheme } from '../../../theme/DarkTheme';
import { Notification } from '../../../types';
import { formatDateTime } from '../../../utils/dateUtils';

interface NotificationDetailScreenProps {
  route: { params: { notification: Notification } };
  navigation: any;
}

const NOTIFICATION_ICONS: Record<string, { name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string }> = {
  borrow_overdue: { name: 'alert-circle', label: 'Quá hạn mượn' },
  book_available: { name: 'book-check', label: 'Sách có sẵn' },
  schedule_change: { name: 'calendar-clock', label: 'Thay đổi lịch' },
  membership_expiry: { name: 'card-account-details', label: 'Hạn thẻ' },
  access_anomaly: { name: 'shield-alert', label: 'Bất thường truy cập' },
  daily_stats: { name: 'chart-bar', label: 'Báo cáo thống kê' },
  staff_absence: { name: 'account-off', label: 'Nhân viên vắng mặt' },
};

function getNotificationConfig(type: string) {
  return NOTIFICATION_ICONS[type] || { name: 'bell' as const, label: 'Thông báo' };
}

function getIconColor(type: string, colors: any): string {
  if (type === 'borrow_overdue' || type === 'access_anomaly') return colors.error;
  if (type === 'book_available') return colors.custom.success;
  if (type === 'schedule_change' || type === 'staff_absence') return colors.custom.warning;
  return colors.primary;
}

function getDeepLinkAction(type: string, data?: Record<string, any>): { screen: string; params?: any } | null {
  switch (type) {
    case 'schedule_change':
      return { screen: 'Schedule' };
    case 'membership_expiry':
      return { screen: 'Profile' };
    case 'borrow_overdue':
      return { screen: 'History' };
    default:
      return null;
  }
}

export default function NotificationDetailScreen({ route, navigation }: NotificationDetailScreenProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { notification } = route.params;

  const config = getNotificationConfig(notification.type);
  const iconColor = getIconColor(notification.type, c);
  const deepLink = getDeepLinkAction(notification.type, notification.data);

  const handleDeepLink = () => {
    if (deepLink) {
      navigation.navigate(deepLink.screen);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={[styles.card, { backgroundColor: c.surface, borderColor: c.outlineVariant }]} elevation={0}>
          <View style={[styles.iconCircle, { backgroundColor: `${iconColor}18` }]}>
            <MaterialCommunityIcons name={config.name} size={48} color={iconColor} />
          </View>

          <Text style={[styles.typeLabel, { color: iconColor }]}>
            {config.label}
          </Text>

          <Text style={[styles.title, { color: c.onSurface }]}>
            {notification.title}
          </Text>

          <Text style={[styles.body, { color: c.onSurfaceVariant }]}>
            {notification.body}
          </Text>

          <Text style={[styles.timestamp, { color: c.custom.textDisabled }]}>
            {formatDateTime(notification.createdAt)}
          </Text>
        </Surface>

        {deepLink ? (
          <Button
            mode="contained"
            onPress={handleDeepLink}
            style={[styles.actionButton, { backgroundColor: c.primary }]}
            labelStyle={styles.actionLabel}
            icon="chevron-right"
          >
            Xem chi tiết
          </Button>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: {
      padding: 16,
      paddingBottom: 28,
      gap: 14,
    },
    card: {
      borderRadius: 14,
      borderWidth: 0.5,
      padding: 20,
      alignItems: 'center',
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    typeLabel: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 12,
    },
    body: {
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
    },
    timestamp: {
      fontSize: 12,
      marginTop: 16,
      textAlign: 'center',
    },
    actionButton: {
      borderRadius: 10,
    },
    actionLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
