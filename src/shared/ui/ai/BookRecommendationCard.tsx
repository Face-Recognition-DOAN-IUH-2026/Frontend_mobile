import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AIBookRecommendation } from '../../../types/ai';

interface BookRecommendationCardProps {
  recommendation: AIBookRecommendation;
  compact?: boolean;
}

export default function BookRecommendationCard({ recommendation, compact = false }: BookRecommendationCardProps) {
  const coverSize = compact ? 56 : 70;
  const coverH = compact ? 78 : 98;

  return (
    <View style={s.card}>
      {recommendation.cover_url ? (
        <Image source={{ uri: recommendation.cover_url }} style={[s.cover, { width: coverSize, height: coverH }]} />
      ) : (
        <View style={[s.cover, s.coverPlaceholder, { width: coverSize, height: coverH }]}>
          <MaterialCommunityIcons name="book" size={compact ? 22 : 28} color="#6366f1" />
        </View>
      )}
      <View style={s.info}>
        <Text style={s.title} numberOfLines={2}>
          {recommendation.title || 'Không có tên'}
        </Text>
        {recommendation.author ? (
          <Text style={s.author} numberOfLines={1}>
            {recommendation.author}
          </Text>
        ) : null}
        {recommendation.category ? (
          <View style={s.categoryBadge}>
            <Text style={s.categoryText}>{recommendation.category}</Text>
          </View>
        ) : null}
        {recommendation.reason ? (
          <Text style={s.reason} numberOfLines={2}>
            {recommendation.reason}
          </Text>
        ) : null}
        <View style={s.scoreRow}>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${Math.min((recommendation.relevance_score || 0), 100)}%` }]} />
          </View>
          <Text style={s.scoreText}>{recommendation.relevance_score}%</Text>
        </View>
      </View>
    </View>
  );
}

function Text({ style, children, numberOfLines }: { style?: any; children: any; numberOfLines?: number }) {
  const React = require('react');
  return React.createElement(require('react-native').Text, { style, numberOfLines }, children);
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1e2030',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2d3e',
    marginVertical: 6,
    marginHorizontal: 4,
    padding: 12,
    gap: 12,
  },
  cover: {
    borderRadius: 8,
    backgroundColor: '#2a2d3e',
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
    color: '#e2e8f0',
    lineHeight: 20,
  },
  author: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6366f130',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#818cf8',
  },
  reason: {
    fontSize: 12,
    color: '#94a3b8',
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
    backgroundColor: '#2a2d3e',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#6366f1',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818cf8',
    minWidth: 36,
    textAlign: 'right',
  },
});
