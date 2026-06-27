import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Card, ProgressBar, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AIBookRecommendation } from '../../types/ai';
import { AppTheme } from '../../theme/DarkTheme';

interface BookRecommendationCardProps {
  recommendation: AIBookRecommendation;
  compact?: boolean;
}

export default function BookRecommendationCard({ recommendation, compact = false }: BookRecommendationCardProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);

  return (
    <Card style={[styles.card, { backgroundColor: c.surfaceVariant, borderColor: c.outline }]}>
      <Card.Content style={styles.content}>
        {recommendation.cover_url ? (
          <Image source={{ uri: recommendation.cover_url }} style={[styles.cover, { backgroundColor: c.surface }]} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: c.primary + '15' }]}>
            <MaterialCommunityIcons name="book" size={compact ? 22 : 28} color={c.primary} />
          </View>
        )}
        <View style={styles.info}>
          <Text variant="labelMedium" style={[styles.title, { color: c.onSurface }]} numberOfLines={2}>
            {recommendation.title}
          </Text>
          {recommendation.author ? (
            <Text variant="bodySmall" style={[styles.author, { color: c.onSurfaceVariant }]} numberOfLines={1}>
              {recommendation.author}
            </Text>
          ) : null}
          {recommendation.category ? (
            <View style={[styles.categoryBadge, { backgroundColor: c.primary + '20' }]}>
              <Text variant="labelSmall" style={{ color: c.primary }}>{recommendation.category}</Text>
            </View>
          ) : null}
          {recommendation.reason ? (
            <Text variant="bodySmall" style={[styles.reason, { color: c.onSurfaceVariant }]} numberOfLines={2}>
              {recommendation.reason}
            </Text>
          ) : null}
          <View style={styles.scoreRow}>
            <ProgressBar
              progress={Math.min((recommendation.relevance_score || 0) / 100, 1)}
              style={[styles.progressBar, { backgroundColor: c.outline }]}
              color={c.primary}
            />
            <Text variant="labelSmall" style={[styles.scoreText, { color: c.primary }]}>
              {recommendation.relevance_score}%
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

function createStyles(theme: AppTheme, compact: boolean) {
  const coverSize = compact ? { width: 56, height: 78 } : { width: 70, height: 98 };
  return StyleSheet.create({
    card: {
      marginVertical: 4,
      marginHorizontal: 4,
      flex: 1,
      borderRadius: 12,
      borderWidth: 0.5,
      overflow: 'hidden',
    },
    content: {
      flexDirection: 'row',
      padding: compact ? 10 : 14,
      gap: 10,
    },
    cover: {
      ...coverSize,
      borderRadius: 6,
    },
    coverPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
      justifyContent: 'center',
      gap: 3,
    },
    title: {
      fontWeight: '700',
      lineHeight: 18,
    },
    author: {
      marginTop: 1,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginTop: 2,
    },
    reason: {
      marginTop: 2,
      lineHeight: 16,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 8,
    },
    progressBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    scoreText: {
      fontWeight: '700',
      minWidth: 36,
      textAlign: 'right',
    },
  });
}
