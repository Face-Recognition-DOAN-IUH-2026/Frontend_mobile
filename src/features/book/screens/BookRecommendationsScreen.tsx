import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { EmptyState, GradientHeader } from '../../../theme/MobileDesignSystem';
import { useFocusEffect } from '@react-navigation/native';
import { AIBookRecommendation } from '../../../types/ai';
import { aiApi } from '../../../api/ai';
import { useAuth } from '../../../context/AuthContext';
import { AppTheme } from '../../../theme/DarkTheme';
import BookRecommendationCard from '../../../shared/ui/ai/BookRecommendationCard';
import SwipeReserveRow from '../../../components/SwipeReserveRow';
import { UndoBar } from '../../../components/UndoBar';
import { joinWaitlist, leaveWaitlist } from '../../../api/borrow';
import { useNetwork } from '../../../context/NetworkContext';
import { NoticeSnackbar } from '../../../components/NoticeSnackbar';

interface BookRecommendationsScreenProps {
  navigation: any;
}

export default function BookRecommendationsScreen({ navigation }: BookRecommendationsScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { patron } = useAuth();
  const { isOnline } = useNetwork();
  const [recommendations, setRecommendations] = useState<AIBookRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [lastReservation, setLastReservation] = useState<{ id: string; title: string } | null>(null);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  const loadData = async () => {
    const studentCode = patron?.student_code || patron?.studentCode;
    if (!studentCode) {
      setError('Không tìm thấy mã sinh viên');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await aiApi.getBookRecommendations(studentCode);
      setRecommendations(data.recommendations || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể tải gợi ý sách');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [patron?.student_code, patron?.studentCode])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSwipeReserve = async (bookId: string, title: string) => {
    if (!isOnline) {
      Alert.alert('Yêu cầu mạng', 'Bạn cần kết nối internet để đăng ký nhận thông báo.');
      return;
    }

    setReservingId(bookId);
    try {
      const result = await joinWaitlist(bookId);
      setLastReservation({ id: result.id, title });
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || 'Không thể đăng ký nhận thông báo';
      
      if (detail.includes('Already on waitlist')) {
        setSnackMsg('Bạn đã đăng ký nhận thông báo cho sách này rồi');
      } else {
        setSnackMsg(detail);
      }
      setSnackVisible(true);
    } finally {
      setReservingId(null);
    }
  };

  const handleUndoReserve = async () => {
    if (!lastReservation) return;
    try {
      await leaveWaitlist(lastReservation.id);
      setSnackMsg(`Đã hủy nhận thông báo "${lastReservation.title}"`);
      setSnackVisible(true);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || 'Không thể hủy nhận thông báo';
      setSnackMsg(msg);
      setSnackVisible(true);
    } finally {
      setLastReservation(null);
    }
  };

  if (loading) {
    return <LoadingOverlay loading message="Đang tải gợi ý sách..." />;
  }

  if (error) {
    return <EmptyState icon="alert-circle" title="Lỗi" description={error} />;
  }

  const renderItem = ({ item }: { item: AIBookRecommendation }) => {
    const card = <BookRecommendationCard recommendation={item} />;
    return (
      <SwipeReserveRow
        onReserve={() => handleSwipeReserve(item.book_id, item.title)}
        disabled={reservingId === item.book_id}
      >
        {card}
      </SwipeReserveRow>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        data={recommendations}
        renderItem={renderItem}
        keyExtractor={item => item.book_id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <GradientHeader
            title="Gợi ý sách AI"
            subtitle="Được cải thiện dựa trên lịch sử mượn và sở thích của bạn"
            icon="lightbulb"
          />
        }
        ListEmptyComponent={<EmptyState icon="book-off" title="Chưa có gợi ý nào" />}
      />

      <NoticeSnackbar
        visible={snackVisible && !lastReservation}
        message={snackMsg}
        severity={snackMsg.includes('thành công') || snackMsg.includes('hủy') ? 'success' : 'error'}
        onDismiss={() => setSnackVisible(false)}
        bottomOffset={16}
      />

      <UndoBar
        visible={!!lastReservation}
        message={`Đã đăng ký "${lastReservation?.title ?? ''}"`}
        onUndo={handleUndoReserve}
        onDismiss={() => setLastReservation(null)}
        bottomOffset={16}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContent: {
      paddingBottom: 16,
      paddingHorizontal: 12,
    },
    });
}