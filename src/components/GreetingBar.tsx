import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Surface, Text, Chip, useTheme, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../theme/DarkTheme';

interface GreetingBarProps {
  userName: string;
  onRefresh?: () => void;
  liveConnected?: boolean;
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      text: 'Chào buổi sáng',
      icon: 'white-balance-sunny' as const,
      color: '#F59E0B',
    };
  }
  if (hour >= 12 && hour < 18) {
    return {
      text: 'Chào buổi chiều',
      icon: 'weather-sunset' as const,
      color: '#F97316',
    };
  }
  return {
    text: 'Chào buổi tối',
    icon: 'weather-night' as const,
    color: '#6366F1',
  };
}

export function GreetingBar({ userName, onRefresh, liveConnected = true }: GreetingBarProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const greeting = getTimeGreeting();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Surface
      style={[
        s.container,
        {
          backgroundColor: c.surface,
          borderColor: c.outlineVariant,
        },
      ]}
      elevation={1}
    >
      <View style={s.topRow}>
        <View style={s.greetingWrapper}>
          <View style={[s.iconBadge, { backgroundColor: greeting.color + '20' }]}>
            <MaterialCommunityIcons name={greeting.icon} size={22} color={greeting.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={[s.greetingText, { color: c.onSurface }]}>
              {greeting.text}, {userName}!
            </Text>
            <Text variant="bodySmall" style={[s.dateText, { color: c.onSurfaceVariant }]}>
              {todayStr} {timeStr ? `· ${timeStr}` : ''}
            </Text>
          </View>
        </View>

        {onRefresh && (
          <IconButton
            testID="greeting-refresh-btn"
            icon="refresh"
            size={20}
            iconColor={c.primary}
            style={[s.refreshBtn, { borderColor: c.outlineVariant }]}
            onPress={onRefresh}
          />
        )}
      </View>

      <View style={s.bottomRow}>
        <View
          style={[
            s.statusChip,
            {
              backgroundColor: liveConnected ? 'rgba(16, 185, 129, 0.12)' : c.surfaceVariant,
              borderColor: liveConnected ? 'rgba(16, 185, 129, 0.3)' : c.outlineVariant,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={liveConnected ? 'access-point' : 'sync'}
            size={14}
            color={liveConnected ? '#059669' : c.onSurfaceVariant}
          />
          <Text
            style={[
              s.statusText,
              { color: liveConnected ? '#059669' : c.onSurfaceVariant },
            ]}
          >
            {liveConnected ? 'Dữ liệu thời gian thực' : 'Tự động làm mới'}
          </Text>
        </View>
      </View>
    </Surface>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    fontWeight: '800',
    fontSize: 16,
  },
  dateText: {
    fontSize: 12,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  refreshBtn: {
    margin: 0,
    borderWidth: 1,
    borderRadius: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
export default GreetingBar;
