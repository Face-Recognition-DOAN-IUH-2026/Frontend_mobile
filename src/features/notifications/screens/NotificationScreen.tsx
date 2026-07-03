import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface, Text, useTheme } from 'react-native-paper';
import { GradientHeader, EmptyState, FilterPill } from '../../../theme/MobileDesignSystem';
import { useNotification } from '../../../context/NotificationContext';
import { AppTheme } from '../../../theme/DarkTheme';
import { Notification } from '../../../types';
import { formatRelativeTime } from '../../../utils/dateUtils';
import { LoadingOverlay } from '../../../components/LoadingOverlay';

interface NotificationScreenProps {
  navigation: any;
}

type FilterTab = 'all' | 'unread';

interface ExpandedState {
  [key: string]: boolean;
}

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
  const [expanded, setExpanded] = useState<ExpandedState>({});

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

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
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
            <Text style={[styles.body, { color: c.onSurfaceVariant }]} numberOfLines={expanded[item.id] ? undefined : 2}>
              {item.body}
            </Text>
            {item.body && item.body.length > 100 ? (
              <TouchableOpacity onPress={() => toggleExpand(item.id)} style={styles.expandBtn}>
                <Text style={[styles.expandText, { color: c.primary }]}>
                  {expanded[item.id] ? 'Thu gọn' : 'Xem thêm'}
                </Text>
              </TouchableOpacity>
            ) : null}
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
      <GradientHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Không có thông báo mới'}
        icon="bell"
        right={
          unreadCount > 0 ? (
            <TouchableOpacity activeOpacity={0.7} onPress={markAllAsRead} style={styles.markAllBtn}>
              <MaterialCommunityIcons name="check-all" size={18} color={c.primary} />
              <Text style={[styles.markAllText, { color: c.primary }]}>Đọc tất cả</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <FilterPill key={f.key} label={f.label} active={activeFilter === f.key} onPress={() => setActiveFilter(f.key)} />
        ))}
      </View>

      {isLoading && !refreshing ? <LoadingOverlay loading message="Đang tải..." /> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="bell-outline"
              title={activeFilter === 'unread' ? 'Không có thông báo chưa đọc' : 'Không có thông báo mới'}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
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
    expandBtn: { marginTop: 4 },
    expandText: { fontSize: 12, fontWeight: '600' },
    time: { fontSize: 11, marginTop: 4 },
  });
}
