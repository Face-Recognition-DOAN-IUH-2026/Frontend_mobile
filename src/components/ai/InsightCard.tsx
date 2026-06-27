import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AIInsight } from '../../types/ai';
import { AppTheme } from '../../theme/DarkTheme';

interface InsightCardProps {
  insight: AIInsight;
}

export default function InsightCard({ insight }: InsightCardProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);

  const severityConfig = {
    info: { icon: 'information' as const, color: theme.colors.primary, bg: theme.colors.primaryContainer },
    warning: { icon: 'alert' as const, color: '#FF9800', bg: '#FFF3E0' },
    critical: { icon: 'alert-circle' as const, color: theme.colors.error, bg: theme.colors.errorContainer },
  };

  const config = severityConfig[insight.severity];

  return (
    <Card style={[styles.card, { backgroundColor: config.bg }]}>
      <Card.Content>
        <View style={styles.header}>
          <MaterialCommunityIcons name={config.icon} size={18} color={config.color} />
          <Text variant="titleSmall" style={[styles.title, { color: config.color }]}>
            {insight.title}
          </Text>
        </View>
        <Text variant="bodySmall" style={styles.summary}>{insight.summary}</Text>

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
          </View>
        )}

        <Button
          compact
          mode="text"
          onPress={() => setExpanded(!expanded)}
          style={styles.expandButton}
        >
          {expanded ? 'Thu gọn' : 'Xem chi tiết'}
        </Button>
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
    summary: {
      opacity: 0.8,
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
    expandButton: {
      alignSelf: 'flex-start',
      marginTop: 4,
    },
  });
}
