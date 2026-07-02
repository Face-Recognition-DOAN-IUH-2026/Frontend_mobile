import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { EmptyState, GradientHeader } from '../../../theme/MobileDesignSystem';
import { useFocusEffect } from '@react-navigation/native';
import { AIBookRecommendation } from '../../../types/ai';
import { aiApi } from '../../../api/ai';
import { useAuth } from '../../../context/AuthContext';
import { AppTheme } from '../../../theme/DarkTheme';
import BookRecommendationCard from '../../../components/ai/BookRecommendationCard';

interface BookRecommendationsScreenProps {
  navigation: any;
}

export default function BookRecommendationsScreen({ navigation }: BookRecommendationsScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { patron } = useAuth();
  const [recommendations, setRecommendations] = useState<AIBookRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <LoadingOverlay loading message="Đang tải gợi ý sách..." />;
  }

  if (error) {
    return <EmptyState icon="alert-circle" title="Lỗi" description={error} />;
  }

  const renderItem = ({ item }: { item: AIBookRecommendation }) => (
    <BookRecommendationCard recommendation={item} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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