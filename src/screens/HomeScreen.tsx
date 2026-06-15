import React, { useState, useCallback } from 'react';
import { View, Image, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Button, Avatar, Badge } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { borrowApi } from '../api/borrow';
import { BorrowRecord } from '../types';
import { colors } from '../theme/colors';
import { formatDate, getDaysUntil, isOverdue } from '../utils/dateUtils';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
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
      console.error('Failed to load borrows:', error);
      const message = error?.response?.data?.detail || error?.message || 'Không thể tải danh sách';
      setLoadError(message);
      setBorrows([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBorrows();
    }, [isStaffScanner])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBorrows();
    setRefreshing(false);
  };

  const activeBorrows = borrows.filter((b) => b.status === 'borrowed');
  const overdueCount = activeBorrows.filter((b) => isOverdue(b.due_at)).length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Surface style={styles.header} elevation={0}>
          <View style={styles.headerSpine} />
          <View style={styles.headerContent}>
            <View style={styles.avatarRow}>
              <Avatar.Text size={52} label={user?.full_name?.[0] || user?.email?.[0] || 'U'} color={colors.background} style={styles.avatar} />
              <View style={styles.greetingBlock}>
                <Text variant="bodySmall" style={styles.greeting}>
                  Xin chào
                </Text>
                <Text variant="titleLarge" style={styles.userName}>
                  {user?.full_name || user?.email}
                </Text>
              </View>
            </View>
          </View>
        </Surface>

        {!isStaffScanner && (
        <View style={styles.statsRow}>
          <Surface style={styles.statCard} elevation={0}>
            <View style={styles.statSpine} />
            <Text style={styles.statNumber}>{activeBorrows.length}</Text>
            <Text style={styles.statLabel}>Đang mượn</Text>
          </Surface>
          <Surface style={[styles.statCard, overdueCount > 0 && styles.statCardWarning]} elevation={0}>
            <View style={[styles.statSpine, overdueCount > 0 && styles.statSpineWarning]} />
            <Text style={[styles.statNumber, overdueCount > 0 && styles.statNumberWarning]}>
              {overdueCount}
            </Text>
            <Text style={styles.statLabel}>Quá hạn</Text>
          </Surface>
        </View>
        )}

        {patron?.password_auto_generated && (
          <View style={styles.passwordBanner}>
            <Surface style={styles.passwordBannerInner} elevation={0}>
              <View style={styles.passwordBannerAccent} />
              <View style={styles.passwordBannerContent}>
                <MaterialCommunityIcons name="shield-alert" size={20} color={colors.warning} />
                <View style={styles.passwordBannerText}>
                  <Text variant="bodyMedium" style={styles.passwordBannerTitle}>
                    Mật khẩu mặc định
                  </Text>
                  <Text variant="bodySmall" style={styles.passwordBannerDesc}>
                    Đổi mật khẩu để bảo mật tài khoản
                  </Text>
                </View>
              </View>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('ChangePassword')}
                style={styles.passwordBannerButton}
                labelStyle={styles.passwordBannerButtonLabel}
                compact
              >
                Đổi
              </Button>
            </Surface>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Borrow')}>
            <Surface style={styles.actionCard} elevation={0}>
              <View style={styles.actionIconWrap}>
                <MaterialCommunityIcons name={isStaffScanner ? 'barcode-scan' : 'book-outline'} size={22} color={colors.background} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>{isStaffScanner ? 'Trả sách' : 'Mượn sách'}</Text>
                <Text style={styles.actionDesc}>
                  {isStaffScanner ? 'Quét mã vạch để xác nhận trả sách' : 'Quét mã vạch để mượn sách'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
            </Surface>
          </TouchableOpacity>
          {!isStaffScanner && (
            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('History')}>
              <Surface style={styles.actionCard} elevation={0}>
                <View style={[styles.actionIconWrap, styles.actionIconSecondaryWrap]}>
                  <MaterialCommunityIcons name="history" size={22} color={colors.text} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Lịch sử</Text>
                  <Text style={styles.actionDesc}>Xem sách đã mượn</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
              </Surface>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionSpine} />
            <Text style={styles.sectionTitle}>{isStaffScanner ? 'Máy quét trả sách' : 'Sách đang mượn'}</Text>
          </View>

          {loadError ? (
            <Surface style={styles.stateCard} elevation={0}>
              <MaterialCommunityIcons name="cloud-off-outline" size={36} color={colors.textSecondary} />
              <Text variant="bodyMedium" style={styles.stateText}>
                Không thể kết nối server
              </Text>
              <Text variant="bodySmall" style={styles.stateDetail}>
                {loadError}
              </Text>
              <Button mode="outlined" onPress={loadBorrows} style={styles.stateButton} labelStyle={styles.stateButtonLabel} icon="refresh">
                Thử lại
              </Button>
            </Surface>
          ) : activeBorrows.length === 0 ? (
            <Surface style={styles.stateCard} elevation={0}>
              <MaterialCommunityIcons name={isStaffScanner ? 'barcode-scan' : 'bookshelf'} size={36} color={colors.textSecondary} />
              <Text variant="bodyMedium" style={styles.stateText}>
                {isStaffScanner ? 'Sẵn sàng quét trả sách' : 'Bạn chưa mượn cuốn sách nào'}
              </Text>
              <Button mode="contained" onPress={() => navigation.navigate('Borrow')} style={styles.stateButton} labelStyle={styles.stateButtonLabel}>
                {isStaffScanner ? 'Mở máy quét' : 'Mượn sách ngay'}
              </Button>
            </Surface>
          ) : (
            activeBorrows.map((record) => {
              const daysLeft = getDaysUntil(record.due_at);
              const overdue = daysLeft < 0;
              return (
                <Surface key={record.id} style={styles.borrowCard} elevation={0}>
                  <View style={[styles.borrowSpine, overdue ? styles.borrowSpineOverdue : styles.borrowSpineActive]} />
                  {record.book?.cover_url ? (
                    <Image source={{ uri: record.book.cover_url }} style={styles.bookCover} />
                  ) : (
                    <View style={styles.bookCoverPlaceholder}>
                      <MaterialCommunityIcons name="book-variant" size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.borrowContent}>
                    <View style={styles.borrowHeader}>
                      <Text style={styles.bookTitle} numberOfLines={2}>
                        {record.book?.title || record.book_id}
                      </Text>
                      <View style={[styles.badge, overdue ? styles.badgeOverdue : styles.badgeActive]}>
                        <Text style={styles.badgeText}>
                          {overdue ? 'Quá hạn' : `Còn ${daysLeft} ngày`}
                        </Text>
                      </View>
                    </View>
                    {record.book?.author ? (
                      <Text style={styles.borrowInfo} numberOfLines={1}>
                        {record.book.author}
                      </Text>
                    ) : null}
                    <Text style={styles.borrowInfo}>
                      Hạn trả: {formatDate(record.due_at)}
                    </Text>
                  </View>
                </Surface>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  headerSpine: {
    width: 4,
    backgroundColor: colors.primary,
  },
  headerContent: {
    flex: 1,
    padding: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  greetingBlock: {
    flex: 1,
  },
  greeting: {
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  userName: {
    color: colors.text,
    fontWeight: '700',
    marginTop: -1,
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  statSpine: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  statSpineWarning: {
    backgroundColor: colors.warning,
  },
  statCardWarning: {
    borderWidth: 0.5,
    borderColor: colors.warning,
  },
  statNumber: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 30,
    lineHeight: 36,
  },
  statNumberWarning: {
    color: colors.warning,
  },
  statLabel: {
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },

  passwordBanner: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  passwordBannerInner: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: colors.warning,
    overflow: 'hidden',
  },
  passwordBannerAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.warning,
  },
  passwordBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passwordBannerText: {
    flex: 1,
  },
  passwordBannerTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  passwordBannerDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  passwordBannerButton: {
    borderRadius: 6,
    backgroundColor: colors.warning,
  },
  passwordBannerButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
  },

  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconSecondaryWrap: {
    backgroundColor: colors.secondary,
  },
  actionTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  actionDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },

  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionSpine: {
    width: 3,
    height: 18,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },

  stateCard: {
    padding: 32,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  stateText: {
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  stateDetail: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  stateButton: {
    borderRadius: 6,
  },
  stateButtonLabel: {
    fontSize: 14,
  },

  borrowCard: {
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  borrowSpine: {
    width: 4,
  },
  borrowSpineActive: {
    backgroundColor: colors.primary,
  },
  borrowSpineOverdue: {
    backgroundColor: colors.error,
  },
  bookCover: {
    width: 56,
    height: 78,
    borderRadius: 4,
    margin: 10,
    marginRight: 0,
  },
  bookCoverPlaceholder: {
    width: 56,
    height: 78,
    borderRadius: 4,
    margin: 10,
    marginRight: 0,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borrowContent: {
    flex: 1,
    padding: 14,
  },
  borrowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookTitle: {
    color: colors.text,
    flex: 1,
    marginRight: 8,
    fontWeight: '600',
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeActive: {
    backgroundColor: colors.success,
  },
  badgeOverdue: {
    backgroundColor: colors.error,
  },
  badgeText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '700',
  },
  borrowInfo: {
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
});
