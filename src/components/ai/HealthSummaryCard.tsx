import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AIHealthSummary } from '../../types/ai';
import { AppTheme } from '../../theme/DarkTheme';

interface HealthSummaryCardProps {
  summary: AIHealthSummary;
}

export default function HealthSummaryCard({ summary }: HealthSummaryCardProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const scoreColor =
    summary.operational_score >= 80 ? '#4CAF50' :
    summary.operational_score >= 60 ? '#FF9800' :
    theme.colors.error;

  const grade =
    summary.operational_score >= 80 ? 'Tốt' :
    summary.operational_score >= 60 ? 'Bình thường' :
    summary.operational_score >= 40 ? 'Cảnh báo' : 'Nguy hiểm';

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.scoreRow}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text variant="headlineMedium" style={[styles.scoreText, { color: scoreColor }]}>
              {summary.operational_score}
            </Text>
            <Text variant="labelSmall" style={styles.scoreUnit}>/100</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text variant="titleMedium" style={[styles.grade, { color: scoreColor }]}>{grade}</Text>
            <Text variant="bodySmall" style={styles.headline} numberOfLines={2}>{summary.headline}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatItem icon="account-multiple" label="Đang trong" value={summary.snapshot.active_patrons} theme={theme} />
          <StatItem icon="login" label="Vào hôm nay" value={summary.snapshot.today_entries} theme={theme} />
          <StatItem icon="book-check" label="Đang mượn" value={summary.snapshot.active_borrows} theme={theme} />
          <StatItem icon="alert-circle" label="Trễ hạn" value={summary.snapshot.overdue_borrows} theme={theme} />
          <StatItem icon="calendar-clock" label="Đang trực" value={summary.snapshot.scheduled_staff_today} theme={theme} />
          <StatItem icon="logout" label="Ra hôm nay" value={summary.snapshot.today_exits} theme={theme} />
        </View>
      </Card.Content>
    </Card>
  );
}

function StatItem({ icon, label, value, theme }: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: number;
  theme: AppTheme;
}) {
  return (
    <View style={statStyles.container}>
      <MaterialCommunityIcons name={icon} size={18} color={theme.colors.primary} />
      <Text variant="titleMedium" style={statStyles.value}>{value}</Text>
      <Text variant="labelSmall" style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '33%',
    paddingVertical: 8,
  },
  value: {
    fontWeight: '700',
    marginTop: 4,
  },
  label: {
    opacity: 0.6,
    marginTop: 2,
    textAlign: 'center',
  },
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      margin: 16,
      backgroundColor: theme.colors.surface,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    scoreCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreText: {
      fontWeight: '800',
    },
    scoreUnit: {
      opacity: 0.5,
    },
    scoreInfo: {
      flex: 1,
      marginLeft: 16,
    },
    grade: {
      fontWeight: '700',
    },
    headline: {
      opacity: 0.7,
      marginTop: 4,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
  });
}
