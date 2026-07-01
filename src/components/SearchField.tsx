import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppTheme } from '../theme/DarkTheme';

interface SearchFieldProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export function SearchField({ value, onChange, placeholder, onClear }: SearchFieldProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;

  return (
    <TextInput
      mode="outlined"
      value={value}
      onChangeText={onChange}
      placeholder={placeholder ?? 'Search...'}
      left={<TextInput.Icon icon="magnify" />}
      right={
        value.length > 0 && onClear
          ? (
            <TextInput.Icon
              icon="close-circle"
              onPress={onClear}
            />
          )
          : null
      }
      outlineColor={c.outline}
      activeOutlineColor={c.primary}
      style={sfStyles.input}
      dense
    />
  );
}

const sfStyles = StyleSheet.create({
  input: {
    marginBottom: 12,
  },
});
