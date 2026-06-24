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
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        {recommendation.cover_url ? (
          <Image source={{ uri: recommendation.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <MaterialCommunityIcons name="book" size={24} color={theme.colors.onSurfaceVariant} />
          </View>
        )}
        <View style={styles.info}>
          <Text variant="labelMedium" style={styles.title} numberOfLines={2}>
            {recommendation.title}
          </Text>
          {recommendation.author && (
            <Text variant="bodySmall" style={styles.author} numberOfLines={1}>
              {recommendation.author}
            </Text>
          )}
          <View style={styles.scoreRow}>
            <ProgressBar
              progress={recommendation.relevance_score / 100}
              style={styles.progressBar}
              color={theme.colors.primary}
            />
            <Text variant="labelSmall" style={styles.scoreText}>
              {recommendation.relevance_score}%
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

function createStyles(theme: AppTheme, compact: boolean) {
  const coverSize = compact ? { width: 50, height: 70 } : { width: 60, height: 85 };
  return StyleSheet.create({
    card: {
      marginVertical: 4,
      marginHorizontal: 4,
      backgroundColor: theme.colors.surface,
      flex: 1,
    },
    content: {
      flexDirection: 'row',
      padding: compact ? 8 : 12,
    },
    cover: {
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceVariant,
    },
    coverPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
      marginLeft: 8,
      justifyContent: 'center',
    },
    title: {
      fontWeight: '600',
      lineHeight: 16,
    },
    author: {
      opacity: 0.6,
      marginTop: 2,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 6,
    },
    progressBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    scoreText: {
      opacity: 0.7,
      minWidth: 32,
      textAlign: 'right',
    },
  });
}