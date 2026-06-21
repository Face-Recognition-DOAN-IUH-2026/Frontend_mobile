import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Surface, Text, useTheme } from 'react-native-paper';
import { useNotification } from '../context/NotificationContext';
import { AppTheme } from '../theme/DarkTheme';
import { Notification } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';

interface NotificationScreenProps {
  navigation: any;
}

type FilterTab = 'all' | 'unread';

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unread', label: 'Chưa đọc' },
];

const NOTIFICATION_ICONS: Record<string, { name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; colorKey: 'error' | 'success' | 'warning' | 'primary' }> = {
  borrow_overdue: { name: 'alert-circle', colorKey: 'error' },
  book_available: { name: 'book-check', colorKey: 'success' },
  schedule_change: { name: 'calendar-clock', colorKey: 'warning' },
  membership_expiry: { name: 'card-account-details', colorKey: 'primary' },
  access_anomaly: { name: 'shield-alert', colorKey: 'error' },
  daily_stats: { name: 'chart-bar', colorKey: 'primary' },
  staff_absence: { name: 'account-off', colorKey: 'warning' },
};

function getNotificationIcon(type: string) {
  return NOTIFICATION_ICONS[type] || { name: 'bell' as const, colorKey: 'primary' as const };
}

function getSpineColor(type: string, colors: any): string {
  const icon = getNotificationIcon(type);
  if (icon.colorKey === 'error') return colors.error;
  if (icon.colorKey === 'success') return colors.custom.success;
  if (icon.colorKey === 'warning') return colors.custom.warning;
  return colors.primary;
}

function getIconBgColor(type: string, colors: any): string {
  const icon = getNotificationIcon(type);
  if (icon.colorKey === 'error') return colors.error;
  if (icon.colorKey === 'success') return colors.custom.success;
  if (icon.colorKey === 'warning') return colors.custom.warning;
  return colors.primary;
}

export default function NotificationScreen({ navigation }: NotificationScreenProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead } = useNotification();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.isRead;
    return true;
  });

  const handlePress = async (item: Notification) => {
    if (!item.isRead) {
      await markAsRead(item.id);
    }
    navigation.navigate('NotificationDetail', { notification: { ...item, isRead: true } });
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);
    const spineColor = getSpineColor(item.type, c);
    const iconBg = getIconBgColor(item.type, c);

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => handlePress(item)}>
        <Surface style={[styles.card, { backgroundColor: c.surface, borderColor: c.outline }]} elevation={0}>
          <View style={[styles.spine, { backgroundColor: item.isRead ? c.custom.textDisabled : spineColor }]} />
          <View style={[styles.iconCircle, { backgroundColor: `${iconBg}20` }]}>
            <MaterialCommunityIcons name={icon.name} size={20} color={item.isRead ? c.custom.textDisabled : iconBg} />
          </View>
          <View style={styles.content}>
            <Text style={[styles.title, { color: item.isRead ? c.onSurfaceVariant : c.onSurface }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.body, { color: c.onSurfaceVariant }]} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={[styles.time, { color: c.custom.textDisabled }]}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <View style={styles.header}>
        <View style={[styles.headerSpine, { backgroundColor: c.primary }]} />
        <Text style={[styles.headerTitle, { color: c.onSurface }]}>Thông báo</Text>
        {unreadCount > 0 && (
          <TouchableOpacity activeOpacity={0.7} onPress={markAllAsRead} style={styles.markAllBtn}>
            <MaterialCommunityIcons name="check-all" size={18} color={c.primary} />
            <Text style={[styles.markAllText, { color: c.primary }]}>Đọc tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.key} activeOpacity={0.7} onPress={() => setActiveFilter(f.key)}>
            <Surface
              style={[
                styles.filterChip,
                { backgroundColor: c.surface, borderColor: c.outline },
                activeFilter === f.key && { backgroundColor: c.primary, borderColor: c.primary },
              ]}
              elevation={0}
            >
              <Text style={[styles.filterText, { color: c.onSurfaceVariant }, activeFilter === f.key && { color: c.background }]}>
                {f.label}
              </Text>
            </Surface>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="bell-outline" size={48} color={c.onSurfaceVariant} />
              <Text style={[styles.emptyText, { color: c.onSurfaceVariant }]}>
                {activeFilter === 'unread' ? 'Không có thông báo chưa đọc' : 'Không có thông báo mới'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 4,
      gap: 10,
    },
    headerSpine: { width: 3, height: 20, borderRadius: 2 },
    headerTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
    markAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 0.5,
    },
    markAllText: { fontSize: 12, fontWeight: '600' },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 0.5,
    },
    filterText: { fontSize: 13, fontWeight: '600' },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      paddingBottom: 20,
    },
    card: {
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: 10,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: 0.5,
    },
    spine: { width: 4 },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 10,
      marginRight: 0,
    },
    content: { flex: 1, padding: 10, paddingRight: 14 },
    title: { fontWeight: '600', fontSize: 14, lineHeight: 18 },
    body: { fontSize: 12, marginTop: 2, lineHeight: 16 },
    time: { fontSize: 11, marginTop: 4 },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 60,
      gap: 12,
    },
    emptyText: { fontSize: 14, textAlign: 'center' },
  });
}
