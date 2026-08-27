import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AIBookRecommendation } from '../../../types/ai';
import type { AppTheme } from '../../../theme/DarkTheme';

interface BookRecommendationCardProps {
  recommendation: AIBookRecommendation;
  compact?: boolean;
}

export default function BookRecommendationCard({ recommendation, compact = false }: BookRecommendationCardProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const coverSize = compact ? 56 : 70;
  const coverH = compact ? 78 : 98;

  return (
    <View style={[s.card, { backgroundColor: c.surface, borderColor: c.outlineVariant }]}>
      {recommendation.cover_url ? (
        <Image source={{ uri: recommendation.cover_url }} style={[s.cover, { width: coverSize, height: coverH, backgroundColor: c.surfaceVariant }]} />
      ) : (
        <View style={[s.cover, s.coverPlaceholder, { width: coverSize, height: coverH, backgroundColor: c.surfaceVariant }]}>
          <MaterialCommunityIcons name="book" size={compact ? 22 : 28} color={c.primary} />
        </View>
      )}
      <View style={s.info}>
        <Text style={[s.title, { color: c.onSurface }]} numberOfLines={2}>
          {recommendation.title || 'Không có tên'}
        </Text>
        {recommendation.author ? (
          <Text style={[s.author, { color: c.onSurfaceVariant }]} numberOfLines={1}>
            {recommendation.author}
          </Text>
        ) : null}
        {recommendation.category ? (
          <View style={[s.categoryBadge, { backgroundColor: `${c.primary}20` }]}>
            <Text style={[s.categoryText, { color: c.primary }]}>{recommendation.category}</Text>
          </View>
        ) : null}
        {recommendation.reason ? (
          <Text style={[s.reason, { color: c.onSurfaceVariant }]} numberOfLines={2}>
            {recommendation.reason}
          </Text>
        ) : null}
        <View style={s.scoreRow}>
          <View style={[s.progressBarBg, { backgroundColor: c.surfaceVariant }]}>
            <View style={[s.progressBarFill, { backgroundColor: c.primary, width: `${Math.min((recommendation.relevance_score || 0), 100)}%` }]} />
          </View>
          <Text style={[s.scoreText, { color: c.primary }]}>{recommendation.relevance_score}%</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
    marginHorizontal: 4,
    padding: 12,
    gap: 12,
  },
  cover: {
    borderRadius: 8,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  author: {
    fontSize: 13,
    marginTop: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reason: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
});
