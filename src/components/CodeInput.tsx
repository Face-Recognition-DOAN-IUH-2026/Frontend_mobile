import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import type { AppTheme } from '../theme/DarkTheme';

interface CodeInputProps {
  value: string;
  onChange: (v: string) => void;
  length: number;
  theme: AppTheme;
}

export default function CodeInput({ value, onChange, length, theme }: CodeInputProps) {
  const inputRefs = useRef<any[]>([]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newValue = value.split('');
    while (newValue.length < length) newValue.push('');
    newValue[index] = digit;
    const result = newValue.join('').slice(0, length);
    onChange(result);

    if (digit && index < length - 1) {
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 50);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      setTimeout(() => inputRefs.current[index - 1]?.focus(), 50);
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            {
              borderColor: value[i]
                ? theme.colors.primary
                : theme.colors.outlineVariant,
              backgroundColor: value[i]
                ? `${theme.colors.primary}10`
                : theme.colors.surface,
            },
          ]}
        >
          <TextInput
            ref={(ref: any) => (inputRefs.current[i] = ref)}
            value={value[i] || ''}
            onChangeText={(text) => handleChange(text, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            style={[styles.input, { color: theme.colors.onSurface }]}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            outlineColor="transparent"
            activeOutlineColor="transparent"
            textColor={theme.colors.onSurface}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  cell: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  input: {
    fontSize: 24,
    fontWeight: '800',
    height: 52,
  },
});
