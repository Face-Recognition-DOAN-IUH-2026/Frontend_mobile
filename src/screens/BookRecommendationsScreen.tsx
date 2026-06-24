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
    if (!patron?.student_code) {
      setError('Khong tim thay ma sinh vien');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await aiApi.getBookRecommendations(patron.student_code);
      setRecommendations(data.recommendations || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Khong the tai goi y sach');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [patron?.student_code])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Dang tai goi y sach...</Text>
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

  const renderItem = ({ item, index }: { item: AIBookRecommendation; index: number }) => (
    <View style={[styles.gridItem, index % 2 === 0 && styles.gridItemLeft]}>
      <BookRecommendationCard recommendation={item} compact />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={recommendations}
        renderItem={renderItem}
        keyExtractor={item => item.book_id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="lightbulb" size={24} color={theme.colors.primary} />
            </View>
            <Text variant="titleMedium" style={styles.headerTitle}>Goi y sach AI</Text>
            <Text variant="bodySmall" style={styles.headerSubtitle}>
              Duoc cai thien dua tren lich su muon va so thich cua ban
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="book-off" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={styles.emptyText}>Chua co goi y nao</Text>
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
    },
    columnWrapper: {
      paddingHorizontal: 8,
    },
    gridItem: {
      flex: 1,
      maxWidth: '50%',
    },
    gridItemLeft: {
      paddingRight: 4,
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