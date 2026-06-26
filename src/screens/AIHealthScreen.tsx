import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Text, TextInput, IconButton, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { AIHealthSummary, AIInsight } from '../types/ai';
import { aiApi } from '../api/ai';
import { AppTheme } from '../theme/DarkTheme';
import HealthSummaryCard from '../components/ai/HealthSummaryCard';
import InsightCard from '../components/ai/InsightCard';

interface AIHealthScreenProps {
  navigation: any;
}

export default function AIHealthScreen({ navigation }: AIHealthScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [summary, setSummary] = useState<AIHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);

  const loadSummary = async () => {
    try {
      setError(null);
      const data = await aiApi.getHealthSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Khong the tai du lieu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSummary();
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatLoading(true);
    setChatAnswer(null);
    try {
      const res = await aiApi.commandCenterChat(q);
      setChatAnswer(res.answer);
    } catch {
      setChatAnswer('Khong the tra loi cau hoi.');
    } finally {
      setChatLoading(false);
      setChatInput('');
    }
  };

  const insights = summary?.insights || [];

  const listHeader = (
    <View>
      {summary && <HealthSummaryCard summary={summary} />}

      {chatAnswer && (
        <View style={styles.chatAnswer}>
          <Text variant="bodyMedium">{chatAnswer}</Text>
        </View>
      )}

      {insights.length > 0 && (
        <Text variant="titleSmall" style={styles.sectionTitle}>AI Insights ({insights.length})</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Dang tai du lieu...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <IconButton icon="refresh" onPress={loadSummary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={insights}
        renderItem={({ item }) => <InsightCard insight={item} />}
        keyExtractor={item => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={styles.emptyText}>Khong co insight nao</Text>
          </View>
        }
      />

      <View style={styles.chatRow}>
        <TextInput
          style={styles.chatInput}
          placeholder="Hoi ve he thong..."
          value={chatInput}
          onChangeText={setChatInput}
          onSubmitEditing={sendChat}
          returnKeyType="send"
          dense
          mode="outlined"
          disabled={chatLoading}
        />
        <IconButton
          icon="send"
          size={24}
          onPress={sendChat}
          disabled={!chatInput.trim() || chatLoading}
          iconColor={theme.colors.primary}
        />
      </View>
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
    },
    listContent: {
      paddingBottom: 16,
    },
    sectionTitle: {
      fontWeight: '600',
      paddingHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
    },
    chatAnswer: {
      marginHorizontal: 16,
      marginTop: 8,
      padding: 12,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
    },
    emptyContainer: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      opacity: 0.5,
    },
    chatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    chatInput: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
  });
}
