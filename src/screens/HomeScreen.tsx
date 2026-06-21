import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { borrowApi } from '../api/borrow';
import { useAuth } from '../context/AuthContext';
import { AppTheme } from '../theme/DarkTheme';
import { BorrowRecord } from '../types';
import { formatDate, getDaysUntil, isOverdue } from '../utils/dateUtils';

interface HomeScreenProps {
  navigation: any;
}

type StaffAction = {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  route: string;
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
      const history = await borrowApi.getHistory('borrowed');
      setBorrows(history);
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
      title: 'Tra sach',
      description: 'Nhap MSSV, xem sach dang muon va xac nhan tra bang ISBN.',
      icon: 'barcode-scan',
      route: 'StaffReturn',
    },
    {
      title: 'Nhập sách',
      description: 'Quét ISBN và nhập sách mới vào thư viện.',
      icon: 'package-variant-closed',
      route: 'ImportBooks',
    },
    {
      title: 'Lịch trực',
      description: 'Xem ca hôm nay và lịch làm việc trong tuần.',
      icon: 'calendar-clock',
      route: 'Schedule',
    },
    {
      title: 'Hồ sơ',
      description: 'Cài đặt tài khoản, bảo mật và giao diện.',
      icon: 'account-cog',
      route: 'Profile',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <Card mode="contained" style={styles.heroCard}>
          <Card.Content style={styles.heroContent}>
            <Avatar.Text
              size={58}
              label={displayName.slice(0, 1).toUpperCase()}
              color={theme.colors.onPrimary}
              style={styles.avatar}
            />
            <View style={styles.heroText}>
              <Text variant="labelLarge" style={styles.kicker}>Xin chào</Text>
              <Text variant="headlineSmall" style={styles.userName} numberOfLines={2}>
                {displayName}
              </Text>
              <Chip compact icon={isStaffScanner ? 'shield-account' : 'account'} style={styles.roleChip} textStyle={styles.roleChipText}>
                {roleLabel}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {patron?.password_auto_generated ? (
          <Card mode="outlined" style={styles.warningCard}>
            <Card.Content style={styles.warningContent}>
              <MaterialCommunityIcons name="shield-alert" size={24} color={theme.colors.tertiary} />
              <View style={styles.warningText}>
                <Text variant="titleSmall" style={styles.cardTitle}>Mật khẩu mặc định</Text>
                <Text variant="bodySmall" style={styles.mutedText}>Đổi mật khẩu để bảo mật tài khoản.</Text>
              </View>
              <Button mode="contained-tonal" compact onPress={() => navigation.navigate('ChangePassword')}>
                Đổi
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        {isStaffScanner ? (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Công việc nhanh</Text>
            {staffActions.map((action) => (
              <Card key={action.route} mode="outlined" style={styles.actionCard} onPress={() => navigation.navigate(action.route)}>
                <Card.Content style={styles.actionContent}>
                  <View style={styles.actionIcon}>
                    <MaterialCommunityIcons name={action.icon} size={24} color={theme.colors.onPrimary} />
                  </View>
                  <View style={styles.actionText}>
                    <Text variant="titleMedium" style={styles.cardTitle}>{action.title}</Text>
                    <Text variant="bodySmall" style={styles.mutedText}>{action.description}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
                </Card.Content>
              </Card>
            ))}
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <Card mode="contained" style={styles.statCard}>
                <Card.Content>
                  <Text variant="headlineMedium" style={styles.statNumber}>{activeBorrows.length}</Text>
                  <Text variant="bodySmall" style={styles.mutedText}>Đang mượn</Text>
                </Card.Content>
              </Card>
              <Card mode="contained" style={[styles.statCard, overdueCount > 0 && styles.overdueCard]}>
                <Card.Content>
                  <Text variant="headlineMedium" style={[styles.statNumber, overdueCount > 0 && styles.overdueText]}>{overdueCount}</Text>
                  <Text variant="bodySmall" style={styles.mutedText}>Quá hạn</Text>
                </Card.Content>
              </Card>
            </View>

            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>Sách đang mượn</Text>
              {loadError ? (
                <Card mode="outlined" style={styles.stateCard}>
                  <Card.Content style={styles.stateContent}>
                    <MaterialCommunityIcons name="cloud-off-outline" size={38} color={theme.colors.onSurfaceVariant} />
                    <Text variant="titleSmall" style={styles.cardTitle}>Không thể kết nối server</Text>
                    <Text variant="bodySmall" style={styles.stateDescription} selectable>{loadError}</Text>
                    <Button mode="outlined" icon="refresh" onPress={loadBorrows}>Thử lại</Button>
                  </Card.Content>
                </Card>
              ) : activeBorrows.length === 0 ? (
                <Card mode="outlined" style={styles.stateCard}>
                  <Card.Content style={styles.stateContent}>
                    <MaterialCommunityIcons name="bookshelf" size={38} color={theme.colors.onSurfaceVariant} />
                    <Text variant="titleSmall" style={styles.cardTitle}>Ban chua muon cuon sach nao</Text>
                  </Card.Content>
                </Card>
              ) : (
                activeBorrows.map((record) => {
                  const daysLeft = getDaysUntil(record.due_at);
                  const overdue = daysLeft < 0;
                  return (
                    <Card key={record.id} mode="outlined" style={styles.borrowCard}>
                      <Card.Content style={styles.borrowContent}>
                        {record.book?.cover_url ? (
                          <Image source={{ uri: record.book.cover_url }} style={styles.bookCover} />
                        ) : (
                          <View style={styles.bookCoverPlaceholder}>
                            <MaterialCommunityIcons name="book-variant" size={24} color={theme.colors.onSurfaceVariant} />
                          </View>
                        )}
                        <View style={styles.borrowInfo}>
                          <View style={styles.borrowHeader}>
                            <Text variant="titleSmall" style={styles.cardTitle} numberOfLines={2}>
                              {record.book?.title || record.book_id}
                            </Text>
                            <Chip compact style={overdue ? styles.errorChip : styles.successChip} textStyle={overdue ? styles.errorChipText : styles.successChipText}>
                              {overdue ? 'Quá hạn' : `Còn ${daysLeft} ngày`}
                            </Chip>
                          </View>
                          {record.book?.author ? (
                            <Text variant="bodySmall" style={styles.mutedText} numberOfLines={1}>{record.book.author}</Text>
                          ) : null}
                          <Text variant="bodySmall" style={styles.mutedText}>Hạn trả: {formatDate(record.due_at)}</Text>
                        </View>
                      </Card.Content>
                    </Card>
                  );
                })
              )}
            </View>
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
      gap: 14,
    },
    heroCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
    },
    heroContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    avatar: {
      backgroundColor: theme.colors.primary,
    },
    heroText: {
      flex: 1,
      gap: 4,
    },
    kicker: {
      color: theme.colors.primary,
      fontWeight: '800',
    },
    userName: {
      color: theme.colors.onSurface,
      fontWeight: '800',
    },
    roleChip: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.primaryContainer,
    },
    roleChipText: {
      color: theme.dark ? theme.colors.primary : theme.colors.onSurface,
      fontWeight: '800',
    },
    warningCard: {
      borderColor: theme.colors.tertiary,
      backgroundColor: theme.colors.surface,
    },
    warningContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    warningText: {
      flex: 1,
    },
    section: {
      gap: 10,
    },
    sectionTitle: {
      color: theme.colors.onBackground,
      fontWeight: '800',
    },
    actionCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 14,
    },
    actionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionText: {
      flex: 1,
      gap: 2,
    },
    cardTitle: {
      color: theme.colors.onSurface,
      fontWeight: '800',
    },
    mutedText: {
      color: theme.colors.onSurfaceVariant,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    statNumber: {
      color: theme.colors.primary,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    overdueCard: {
      backgroundColor: theme.colors.errorContainer,
    },
    overdueText: {
      color: theme.colors.error,
    },
    stateCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 14,
    },
    stateContent: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: 18,
    },
    stateDescription: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    borrowCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 14,
    },
    borrowContent: {
      flexDirection: 'row',
      gap: 12,
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
      backgroundColor: theme.colors.surfaceVariant,
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
