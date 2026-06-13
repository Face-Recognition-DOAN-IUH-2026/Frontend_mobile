import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Button, Avatar, Badge, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { borrowApi } from '../api/borrow';
import { BorrowRecord } from '../types';
import { colors } from '../theme/colors';
import { formatDate, getDaysUntil, isOverdue } from '../utils/dateUtils';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadBorrows = async () => {
    try {
      const history = await borrowApi.getHistory('borrowed');
      setBorrows(history);
    } catch (error) {
      console.error('Failed to load borrows:', error);
    }
  };

  useEffect(() => {
    loadBorrows();
  }, []);

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
      <View style={styles.headerAccent} />
      <Surface style={styles.header} elevation={0}>
        <View style={styles.avatarRow}>
          <Avatar.Text size={56} label={user?.full_name?.[0] || user?.email?.[0] || 'U'} color={colors.background} style={styles.avatar} />
          <View style={styles.greetingBlock}>
            <Text variant="titleMedium" style={styles.greeting}>
              Xin chào
            </Text>
            <Text variant="titleLarge" style={styles.userName}>
              {user?.full_name || user?.email}
            </Text>
          </View>
        </View>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Chào mừng đến với Thư Viện
        </Text>
      </Surface>

      <View style={styles.statsRow}>
        <Surface style={styles.statCard} elevation={0}>
          <View style={styles.bookmarkEdge} />
          <Text variant="displaySmall" style={styles.statNumber}>
            {activeBorrows.length}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Sách đang mượn
          </Text>
        </Surface>
        <Surface style={[styles.statCard, overdueCount > 0 && styles.statCardWarning]} elevation={0}>
          <View style={[styles.bookmarkEdge, overdueCount > 0 && styles.bookmarkEdgeWarning]} />
          <Text variant="displaySmall" style={[styles.statNumber, overdueCount > 0 && styles.warningText]}>
            {overdueCount}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Quá hạn
          </Text>
        </Surface>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Borrow')}
        >
          <Surface style={styles.actionInner} elevation={0}>
            <View style={styles.actionIcon}>
              <MaterialCommunityIcons name="book-plus" size={20} color={colors.background} />
            </View>
            <Text style={styles.actionLabel}>Mượn sách</Text>
          </Surface>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Return')}
        >
          <Surface style={styles.actionInner} elevation={0}>
            <View style={styles.actionIconSecondary}>
              <MaterialCommunityIcons name="book-arrow-left" size={20} color={colors.text} />
            </View>
            <Text style={styles.actionLabel}>Trả sách</Text>
          </Surface>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Sách đang mượn
        </Text>
        {activeBorrows.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={0}>
            <MaterialCommunityIcons name="bookshelf" size={36} color={colors.textSecondary} />
            <Text variant="bodyMedium" style={styles.emptyText}>
              Bạn chưa mượn cuốn sách nào
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Borrow')}
              style={styles.emptyButton}
              labelStyle={styles.emptyButtonLabel}
            >
              Mượn sách ngay
            </Button>
          </Surface>
        ) : (
          activeBorrows.map((record) => {
            const daysLeft = getDaysUntil(record.due_at);
            const overdue = daysLeft < 0;
            return (
              <Surface key={record.id} style={styles.borrowCard} elevation={0}>
                <View style={[styles.bookmarkBar, overdue ? styles.bookmarkBarOverdue : styles.bookmarkBarActive]} />
                <View style={styles.borrowContent}>
                  <View style={styles.borrowHeader}>
                    <Text variant="titleMedium" style={styles.bookTitle} numberOfLines={1}>
                      {record.book_id}
                    </Text>
                    <Badge
                      style={[styles.badge, overdue ? styles.badgeOverdue : styles.badgeActive]}
                      size={22}
                    >
                      {overdue ? 'Quá hạn' : `Còn ${daysLeft} ngày`}
                    </Badge>
                  </View>
                  <Text variant="bodySmall" style={styles.borrowInfo}>
                    Mượn: {formatDate(record.borrow_at)}
                  </Text>
                  <Text variant="bodySmall" style={styles.borrowInfo}>
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
  headerAccent: {
    height: 4,
    backgroundColor: colors.primary,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: colors.surface,
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
  },
  userName: {
    color: colors.text,
    fontWeight: '700',
    marginTop: -2,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    position: 'relative',
    overflow: 'hidden',
  },
  bookmarkEdge: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  bookmarkEdgeWarning: {
    backgroundColor: colors.warning,
  },
  statCardWarning: {
    borderColor: colors.warning,
    borderWidth: 0.5,
  },
  statNumber: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 32,
    lineHeight: 38,
  },
  warningText: {
    color: colors.warning,
  },
  statLabel: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
  },
  actionInner: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconSecondary: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    color: colors.text,
    marginBottom: 12,
    fontWeight: '700',
    fontSize: 16,
  },
  emptyCard: {
    padding: 28,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: 16,
  },
  emptyButton: {
    borderRadius: 6,
  },
  emptyButtonLabel: {
    fontSize: 14,
  },
  borrowCard: {
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  bookmarkBar: {
    width: 3,
    borderRadius: 2,
  },
  bookmarkBarActive: {
    backgroundColor: colors.primary,
  },
  bookmarkBarOverdue: {
    backgroundColor: colors.error,
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
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeOverdue: {
    backgroundColor: colors.error,
  },
  badgeActive: {
    backgroundColor: colors.success,
  },
  borrowInfo: {
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
});
