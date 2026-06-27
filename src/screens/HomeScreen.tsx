import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, Chip, Surface, Text, useTheme } from 'react-native-paper';
import { borrowApi } from '../api/borrow';
import { useAuth } from '../context/AuthContext';
import { AppTheme } from '../theme/DarkTheme';
import {
  GradientHeader,
  StatCard,
  SectionCard,
  EmptyState,
  GRADIENTS,
} from '../theme/MobileDesignSystem';
import { BorrowRecord } from '../types';
import { formatDate, getDaysUntil, isOverdue } from '../utils/dateUtils';
import CacheManager from '../utils/cache/CacheManager';
import { CACHE_KEYS, CACHE_TTL } from '../utils/cache/CacheKeys';

interface HomeScreenProps {
  navigation: any;
}

type StaffAction = {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  route: string;
  gradient: string[];
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, patron } = useAuth();
  const isStaffScanner = user?.role === 'admin' || user?.role === 'staff';
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadBorrows = async () => {
    if (isStaffScanner) {
      setLoadError(null);
      setBorrows([]);
      return;
    }

    try {
      setLoadError(null);

      const cache = CacheManager.getInstance();
      const cached = await cache.get<BorrowRecord[]>(CACHE_KEYS.ACTIVE_BORROWS);
      if (cached) {
        setBorrows(cached);
      }

      try {
        const history = await borrowApi.getHistory('borrowed');
        setBorrows(history);
        await cache.set(CACHE_KEYS.ACTIVE_BORROWS, history, CACHE_TTL.ACTIVE_BORROWS);
      } catch (error: any) {
        if (!cached) {
          const message = error?.response?.data?.detail || error?.message || 'Không thể tải danh sách sách đang mượn';
          setLoadError(message);
          setBorrows([]);
        }
      }
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Không thể tải danh sách sách đang mượn';
      setLoadError(message);
      setBorrows([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBorrows();
    }, [isStaffScanner]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBorrows();
    setRefreshing(false);
  };

  const activeBorrows = borrows.filter((item) => item.status === 'borrowed');
  const overdueCount = activeBorrows.filter((item) => isOverdue(item.due_at)).length;
  const displayName = user?.full_name || user?.email || 'Người dùng';
  const roleLabel = user?.role === 'admin' ? 'Quản trị viên' : user?.role === 'staff' ? 'Nhân viên' : 'Độc giả';

  const staffActions: StaffAction[] = [
    {
      title: 'Trả sách',
      description: 'Nhập MSSV, xem sách đang mượn và xác nhận trả.',
      icon: 'barcode-scan',
      route: 'StaffReturn',
      gradient: GRADIENTS.emerald,
    },
    {
      title: 'Tạo phiếu mượn',
      description: 'Quét thẻ sinh viên và sách để tạo phiếu mượn mới.',
      icon: 'book-plus-multiple',
      route: 'StaffBorrow',
      gradient: GRADIENTS.blue,
    },
    {
      title: 'Nhập sách',
      description: 'Quét ISBN và nhập sách mới vào thư viện.',
      icon: 'package-variant-closed',
      route: 'ImportBooks',
      gradient: GRADIENTS.amber,
    },
    {
      title: 'Lịch trực',
      description: 'Xem ca làm việc và lịch trực của bạn.',
      icon: 'calendar-clock',
      route: 'Schedule',
      gradient: GRADIENTS.violet,
    },
    {
      title: 'AI Health',
      description: 'Xem báo cáo sức khỏe hệ thống và phân tích dữ liệu AI.',
      icon: 'chart-line',
      route: 'AIHealth',
      gradient: GRADIENTS.cyan,
    },
    {
      title: 'Hồ sơ',
      description: 'Cài đặt tài khoản, bảo mật và giao diện.',
      icon: 'account-cog',
      route: 'Profile',
      gradient: GRADIENTS.rose,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <GradientHeader
          title={displayName}
          subtitle={roleLabel}
          icon={isStaffScanner ? 'shield-account' : 'account'}
          right={
            user?.avatar_url ? (
              <Avatar.Image size={40} source={{ uri: user.avatar_url }} />
            ) : (
              <Avatar.Text size={40} label={displayName.slice(0, 1).toUpperCase()} color={theme.colors.onPrimary} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            )
          }
        />

        {patron?.password_auto_generated ? (
          <SectionCard
            title="Mật khẩu mặc định"
            icon="shield-alert"
            accentColor={theme.colors.tertiary}
            right={
              <Button mode="contained-tonal" compact onPress={() => navigation.navigate('ChangePassword')}>
                Đổi
              </Button>
            }
          >
            <Text variant="bodySmall" style={styles.mutedText}>
              Đổi mật khẩu để bảo mật tài khoản.
            </Text>
          </SectionCard>
        ) : null}

        {isStaffScanner ? (
          <View style={styles.staffGrid}>
            {staffActions.map((action) => (
              <Surface
                key={action.route}
                style={[styles.staffCard, { borderColor: theme.colors.outline }]}
                elevation={0}
                onTouchEnd={() => navigation.navigate(action.route)}
              >
                <View style={[styles.staffAccent, { backgroundColor: action.gradient[0] }]} />
                <View style={styles.staffCardInner}>
                  <View style={[styles.staffIcon, { backgroundColor: action.gradient[0] + '18' }]}>
                    <MaterialCommunityIcons name={action.icon as any} size={22} color={action.gradient[0]} />
                  </View>
                  <Text variant="titleSmall" style={styles.staffCardTitle} numberOfLines={1}>
                    {action.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.staffCardDesc} numberOfLines={2}>
                    {action.description}
                  </Text>
                </View>
              </Surface>
            ))}
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statFlex}>
                <StatCard
                  label="Đang mượn"
                  value={activeBorrows.length}
                  icon="book-open-variant"
                  gradient={GRADIENTS.indigo}
                />
              </View>
              <View style={styles.statFlex}>
                <StatCard
                  label="Quá hạn"
                  value={overdueCount}
                  icon="alert-circle-outline"
                  gradient={overdueCount > 0 ? GRADIENTS.red : GRADIENTS.emerald}
                />
              </View>
            </View>

            <SectionCard
              title="Sách đang mượn"
              icon="bookshelf"
              accentColor={theme.colors.primary}
            >
              {loadError ? (
                <View style={styles.stateContent}>
                  <MaterialCommunityIcons name="cloud-off-outline" size={38} color={theme.colors.onSurfaceVariant} />
                  <Text variant="titleSmall" style={styles.cardTitle}>Không thể kết nối server</Text>
                  <Text variant="bodySmall" style={styles.stateDescription} selectable>{loadError}</Text>
                  <Button mode="outlined" icon="refresh" onPress={loadBorrows}>Thử lại</Button>
                </View>
              ) : activeBorrows.length === 0 ? (
                <EmptyState icon="bookshelf" message="Bạn chưa mượn cuốn sách nào" />
              ) : (
                <View style={styles.borrowList}>
                  {activeBorrows.map((record) => {
                    const daysLeft = getDaysUntil(record.due_at);
                    const overdue = daysLeft < 0;
                    return (
                      <Surface key={record.id} style={[styles.borrowCard, { borderColor: theme.colors.outline }]} elevation={0}>
                        <View style={[styles.borrowAccent, { backgroundColor: overdue ? theme.colors.error : GRADIENTS.emerald[0] }]} />
                        <View style={styles.borrowContent}>
                          {record.book?.cover_url ? (
                            <Image source={{ uri: record.book.cover_url }} style={styles.bookCover} />
                          ) : (
                            <View style={[styles.bookCoverPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                              <MaterialCommunityIcons name="book-variant" size={24} color={theme.colors.onSurfaceVariant} />
                            </View>
                          )}
                          <View style={styles.borrowInfo}>
                            <View style={styles.borrowHeader}>
                              <Text variant="titleSmall" style={styles.cardTitle} numberOfLines={2}>
                                {record.book?.title || record.book_id}
                              </Text>
                              <Chip
                                compact
                                style={overdue ? styles.errorChip : styles.successChip}
                                textStyle={overdue ? styles.errorChipText : styles.successChipText}
                              >
                                {overdue ? 'Quá hạn' : `Còn ${daysLeft} ngày`}
                              </Chip>
                            </View>
                            {record.book?.author ? (
                              <Text variant="bodySmall" style={styles.mutedText} numberOfLines={1}>{record.book.author}</Text>
                            ) : null}
                            <Text variant="bodySmall" style={styles.mutedText}>Hạn trả: {formatDate(record.due_at)}</Text>
                          </View>
                        </View>
                      </Surface>
                    );
                  })}
                </View>
              )}
            </SectionCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const success = theme.dark ? '#4A8C5C' : '#067647';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 28,
      gap: 12,
    },
    mutedText: {
      color: theme.colors.onSurfaceVariant,
    },
    cardTitle: {
      color: theme.colors.onSurface,
      fontWeight: '800',
    },

    /* staff grid */
    staffGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    staffCard: {
      width: '47.5%',
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 0.5,
      backgroundColor: theme.colors.surface,
    },
    staffAccent: {
      height: 3,
    },
    staffCardInner: {
      padding: 14,
      gap: 6,
    },
    staffIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    staffCardTitle: {
      color: theme.colors.onSurface,
      fontWeight: '800',
    },
    staffCardDesc: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },

    /* stats */
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statFlex: {
      flex: 1,
    },

    /* state card inside section */
    stateContent: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: 18,
    },
    stateDescription: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },

    /* borrow list */
    borrowList: {
      gap: 10,
      paddingBottom: 4,
    },
    borrowCard: {
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 0.5,
      backgroundColor: theme.colors.surface,
    },
    borrowAccent: {
      height: 3,
    },
    borrowContent: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
    },
    bookCover: {
      width: 58,
      height: 82,
      borderRadius: 8,
    },
    bookCoverPlaceholder: {
      width: 58,
      height: 82,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    borrowInfo: {
      flex: 1,
      gap: 5,
    },
    borrowHeader: {
      gap: 8,
    },
    successChip: {
      alignSelf: 'flex-start',
      backgroundColor: `${success}22`,
    },
    successChipText: {
      color: success,
      fontWeight: '800',
    },
    errorChip: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.errorContainer,
    },
    errorChipText: {
      color: theme.colors.error,
      fontWeight: '800',
    },
  });
}
