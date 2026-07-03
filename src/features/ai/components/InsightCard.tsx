import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AIInsight, AIInsightExplanation } from '../../../types/ai';
import { AppTheme } from '../../../theme/DarkTheme';

interface InsightCardProps {
  insight: AIInsight;
  onDismiss?: (id: string) => void;
  onExplain?: (id: string) => Promise<AIInsightExplanation | null>;
}

export default function InsightCard({ insight, onDismiss, onExplain }: InsightCardProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState<AIInsightExplanation | null>(null);
  const [explaining, setExplaining] = useState(false);

  const severityConfig = {
    info: { icon: 'information' as const, color: theme.colors.primary, bg: theme.colors.primaryContainer },
    warning: { icon: 'alert' as const, color: '#FF9800', bg: '#FFF3E0' },
    critical: { icon: 'alert-circle' as const, color: theme.colors.error, bg: theme.colors.errorContainer },
  };

  const config = severityConfig[insight.severity];

  const handleExplain = async () => {
    if (!onExplain) return;
    setExplaining(true);
    try {
      const result = await onExplain(insight.id);
      if (result) setExplanation(result);
    } finally {
      setExplaining(false);
    }
  };

  return (
    <Card style={[styles.card, { backgroundColor: config.bg }]}>
      <Card.Content>
        <View style={styles.header}>
          <MaterialCommunityIcons name={config.icon} size={18} color={config.color} />
          <Text variant="titleSmall" style={[styles.title, { color: config.color }]}>
            {insight.title}
          </Text>
          <Chip
            compact
            style={[styles.statusChip, { backgroundColor: insight.status === 'open' ? '#E8F5E9' : '#ECEFF1' }]}
            textStyle={{ fontSize: 10 }}
          >
            {insight.status}
          </Chip>
        </View>
        <Text variant="bodySmall" style={styles.summary}>{insight.summary}</Text>

        {!expanded && insight.reason && (
          <Text variant="bodySmall" style={styles.reason} numberOfLines={2}>
            {insight.reason}
          </Text>
        )}

        {expanded && (
          <View style={styles.details}>
            {insight.evidence.length > 0 && (
              <View style={styles.section}>
                <Text variant="labelSmall" style={styles.sectionTitle}>Chứng cứ:</Text>
                {insight.evidence.map((ev, idx) => (
                  <Text key={idx} variant="bodySmall" style={styles.evidenceItem}>
                    - {ev.label}: {ev.value}
                  </Text>
                ))}
              </View>
            )}
            {insight.recommended_actions.length > 0 && (
              <View style={styles.section}>
                <Text variant="labelSmall" style={styles.sectionTitle}>Đề xuất:</Text>
                {insight.recommended_actions.map((action, idx) => (
                  <Text key={idx} variant="bodySmall" style={styles.actionItem}>
                    - {action}
                  </Text>
                ))}
              </View>
            )}
            {insight.reason && (
              <View style={styles.section}>
                <Text variant="labelSmall" style={styles.sectionTitle}>Lý do:</Text>
                <Text variant="bodySmall">{insight.reason}</Text>
              </View>
            )}
            {insight.alternatives.length > 0 && (
              <View style={styles.section}>
                <Text variant="labelSmall" style={styles.sectionTitle}>Phương án thay thế:</Text>
                {insight.alternatives.map((alt, idx) => (
                  <Text key={idx} variant="bodySmall" style={styles.actionItem}>
                    - {alt}
                  </Text>
                ))}
              </View>
            )}
            {explanation && (
              <View style={styles.section}>
                <Text variant="labelSmall" style={styles.sectionTitle}>Giải thích chi tiết:</Text>
                <Text variant="bodySmall" style={styles.reasoningTrace}>{explanation.reasoning_trace}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <Button compact mode="text" onPress={() => setExpanded(!expanded)} style={styles.actionButton}>
            {expanded ? 'Thu gọn' : 'Xem chi tiết'}
          </Button>
          {onExplain && (
            <Button
              compact
              mode="text"
              onPress={handleExplain}
              loading={explaining}
              disabled={explaining}
              style={styles.actionButton}
            >
              Giải thích
            </Button>
          )}
          {onDismiss && insight.status === 'open' && (
            <Button
              compact
              mode="text"
              onPress={() => onDismiss(insight.id)}
              textColor={theme.colors.error}
              style={styles.actionButton}
            >
              Bỏ qua
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      marginVertical: 4,
      marginHorizontal: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    title: {
      fontWeight: '600',
      marginLeft: 8,
      flex: 1,
    },
    statusChip: {
      height: 22,
    },
    summary: {
      opacity: 0.8,
    },
    reason: {
      marginTop: 4,
      opacity: 0.7,
      fontStyle: 'italic',
    },
    details: {
      marginTop: 10,
    },
    section: {
      marginBottom: 8,
    },
    sectionTitle: {
      fontWeight: '600',
      marginBottom: 4,
    },
    evidenceItem: {
      marginLeft: 8,
      marginBottom: 2,
    },
    actionItem: {
      marginLeft: 8,
      marginBottom: 2,
      fontWeight: '500',
    },
    reasoningTrace: {
      marginTop: 4,
      padding: 8,
      backgroundColor: 'rgba(0,0,0,0.05)',
      borderRadius: 6,
      fontFamily: 'monospace',
      fontSize: 12,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: 4,
    },
    actionButton: {
      marginRight: 4,
    },
  });
}
