import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { AIBookRecommendation } from '../types/ai';
import { aiApi } from '../api/ai';
import { useAuth } from '../context/AuthContext';
import { AppTheme } from '../theme/DarkTheme';
import BookRecommendationCard from '../components/ai/BookRecommendationCard';

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
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Đang tải gợi ý sách...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
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
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="lightbulb" size={24} color={theme.colors.primary} />
            </View>
            <Text variant="titleMedium" style={styles.headerTitle}>Gợi ý sách AI</Text>
            <Text variant="bodySmall" style={styles.headerSubtitle}>
              Được cải thiện dựa trên lịch sử mượn và sở thích của bạn
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="book-off" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={styles.emptyText}>Chưa có gợi ý nào</Text>
          </View>
        }
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
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      marginTop: 12,
      opacity: 0.6,
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      paddingHorizontal: 32,
      marginTop: 8,
    },
    listContent: {
      paddingBottom: 16,
      paddingHorizontal: 12,
    },
    header: {
      padding: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerTitle: {
      fontWeight: '700',
      flex: 1,
    },
    headerSubtitle: {
      width: '100%',
      opacity: 0.6,
      marginTop: 4,
      paddingLeft: 52,
    },
    emptyContainer: {
      padding: 48,
      alignItems: 'center',
    },
    emptyText: {
      opacity: 0.5,
      marginTop: 12,
    },
  });
}