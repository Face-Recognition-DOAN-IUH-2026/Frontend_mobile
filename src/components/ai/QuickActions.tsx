import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../../theme/DarkTheme';

interface QuickAction {
  label: string;
  message: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

interface QuickActionsProps {
  onSelect: (message: string) => void;
  isStaff?: boolean;
}

const patronActions: QuickAction[] = [
  { label: 'Tim sach', message: 'tim kiem sach', icon: 'book-search' },
  { label: 'Lich su muon', message: 'xem lich su muon sach cua toi', icon: 'history' },
  { label: 'Goi y sach', message: 'goi y sach phu hop', icon: 'lightbulb-outline' },
  { label: 'The thu vien', message: 'tra cuu thong tin the', icon: 'card-account-details-outline' },
];

const staffActions: QuickAction[] = [
  { label: 'Tim sach', message: 'tim kiem sach', icon: 'book-search' },
  { label: 'Lich truc', message: 'xem lich truc hom nay', icon: 'calendar-clock-outline' },
  { label: 'Sach tre han', message: 'kiem tra sach tre han', icon: 'alert-circle-outline' },
  { label: 'The thu vien', message: 'tra cuu thong tin the', icon: 'card-account-details-outline' },
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
          <View key={idx} style={styles.chip} onTouchEnd={() => onSelect(action.message)}>
            <MaterialCommunityIcons name={action.icon} size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.chipText}>{action.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant,
    },
    container: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
    },
    chipText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
      fontWeight: '500',
    },
  });
}
