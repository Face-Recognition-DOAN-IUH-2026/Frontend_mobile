import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, Text, TextInput, IconButton, useTheme, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { AICommandCenterSummary, AIInsight, AIInsightCategory, AIInsightSeverity, AIInsightExplanation } from '../../../types/ai';
import { aiApi } from '../../../api/ai';
import { AppTheme } from '../../../theme/DarkTheme';
import HealthSummaryCard from '../components/HealthSummaryCard';
import InsightCard from '../components/InsightCard';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { EmptyState } from '../../../theme/MobileDesignSystem';

interface AIHealthScreenProps {
  navigation: any;
}

type FilterMode = 'all' | 'open' | 'critical' | 'warning';

export default function AIHealthScreen({ navigation }: AIHealthScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [summary, setSummary] = useState<AICommandCenterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const loadSummary = async () => {
    try {
      setError(null);
      const data = await aiApi.getHealthSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Không thể tải dữ liệu');
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
      setChatAnswer('Không thể trả lời câu hỏi.');
    } finally {
      setChatLoading(false);
      setChatInput('');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await aiApi.dismissInsight(id);
      loadSummary();
    } catch {
    }
  };

  const handleExplain = async (id: string): Promise<AIInsightExplanation | null> => {
    try {
      return await aiApi.explainInsight(id);
    } catch {
      return null;
    }
  };

  let insights = summary?.insights || [];
  if (filterMode === 'open') {
    insights = insights.filter(i => i.status === 'open');
  } else if (filterMode === 'critical') {
    insights = insights.filter(i => i.severity === 'critical');
  } else if (filterMode === 'warning') {
    insights = insights.filter(i => i.severity === 'warning');
  }

  const listHeader = (
    <View>
      {summary ? <HealthSummaryCard summary={summary} /> : null}

      {chatAnswer ? (
        <View style={styles.chatAnswer}>
          <Text variant="bodyMedium">{chatAnswer}</Text>
        </View>
      ) : null}

      <SegmentedButtons
        value={filterMode}
        onValueChange={(val) => setFilterMode(val as FilterMode)}
        buttons={[
          { value: 'all', label: `Tất cả (${summary?.insights?.length || 0})` },
          { value: 'open', label: `Mở (${summary?.insights?.filter(i => i.status === 'open').length || 0})` },
          { value: 'critical', label: `Nghiêm trọng (${summary?.insights?.filter(i => i.severity === 'critical').length || 0})` },
        ]}
        style={styles.filterBar}
      />

      {insights.length > 0 ? (
        <Text variant="titleSmall" style={styles.sectionTitle}>AI Insights ({insights.length})</Text>
      ) : null}
    </View>
  );

  if (loading) {
    return <LoadingOverlay loading message="Đang tải dữ liệu..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Text style={styles.errorText}>{error}</Text>
        <IconButton icon="refresh" onPress={loadSummary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={insights}
        renderItem={({ item }) => (
          <InsightCard
            insight={item}
            onDismiss={handleDismiss}
            onExplain={handleExplain}
          />
        )}
        keyExtractor={item => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState icon="lightbulb-outline" title="Không có insight nào" />
        }
      />

      <View style={styles.chatRow}>
        <TextInput
          style={styles.chatInput}
          placeholder="Hỏi về hệ thống..."
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
    filterBar: {
      marginHorizontal: 16,
      marginTop: 8,
    },
    chatAnswer: {
      marginHorizontal: 16,
      marginTop: 8,
      padding: 12,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
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
