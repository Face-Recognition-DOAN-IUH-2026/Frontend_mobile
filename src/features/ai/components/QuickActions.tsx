import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../../../theme/DarkTheme';

interface QuickAction {
  label: string;
  message: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}

interface QuickActionsProps {
  onSelect: (message: string) => void;
  isStaff?: boolean;
}

const patronActions: QuickAction[] = [
  { label: 'Tìm sách', message: 'tìm kiếm sách', icon: 'book-search', color: '#6366F1' },
  { label: 'Lịch sử mượn', message: 'xem lịch sử mượn sách của tôi', icon: 'history', color: '#3B82F6' },
  { label: 'Gợi ý sách', message: 'gợi ý sách phù hợp', icon: 'lightbulb-outline', color: '#F59E0B' },
  { label: 'Thẻ thư viện', message: 'tra cứu thông tin thẻ', icon: 'card-account-details-outline', color: '#10B981' },
];

const staffActions: QuickAction[] = [
  { label: 'Tìm sách', message: 'tìm kiếm sách', icon: 'book-search', color: '#6366F1' },
  { label: 'Lịch trực', message: 'xem lịch trực hôm nay', icon: 'calendar-clock-outline', color: '#8B5CF6' },
  { label: 'Sách trễ hạn', message: 'kiểm tra sách trễ hạn', icon: 'alert-circle-outline', color: '#EF4444' },
  { label: 'Thẻ thư viện', message: 'tra cứu thông tin thẻ', icon: 'card-account-details-outline', color: '#10B981' },
];

export default function QuickActions({ onSelect, isStaff }: QuickActionsProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const actions = isStaff ? staffActions : patronActions;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {actions.map((action, idx) => (
          <View
            key={idx}
            style={styles.chip}
            onTouchEnd={() => onSelect(action.message)}
          >
            <View style={[styles.chipIconBg, { backgroundColor: action.color + '18' }]}>
              <MaterialCommunityIcons name={action.icon} size={14} color={action.color} />
            </View>
            <Text style={styles.chipText}>{action.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  const isDark = theme.dark;

  return StyleSheet.create({
    wrapper: {
      backgroundColor: isDark ? '#121212' : '#F9FAFB',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? '#2A2A3C' : '#E5E7EB',
    },
    container: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1C1C2E' : '#FFFFFF',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#2A2A3C' : '#E5E7EB',
      paddingHorizontal: 12,
      paddingVertical: 7,
      gap: 6,
    },
    chipIconBg: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipText: {
      color: theme.colors.onSurface,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
