import React, { useEffect, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppTheme } from '../theme/DarkTheme';

interface CameraFallbackProps {
  onRetry: () => void;
  onManualSubmit?: (value: string) => void;
  onPickImage?: () => void;
  manualLabel?: string;
  manualPlaceholder?: string;
  showManualInput?: boolean;
  showPickImage?: boolean;
  message?: string;
}

export default function CameraFallback({
  onRetry,
  onManualSubmit,
  onPickImage,
  manualLabel = 'Nhập thông tin thủ công',
  manualPlaceholder = 'Nhập tại đây...',
  showManualInput = false,
  showPickImage = false,
  message = 'Không thể khởi động camera',
}: CameraFallbackProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const inputRef = useRef<TextInput>(null);
  const [manualValue, setManualValue] = React.useState('');

  useEffect(() => {
    if (showManualInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showManualInput]);

  const handleManualSubmit = () => {
    if (manualValue.trim() && onManualSubmit) {
      onManualSubmit(manualValue.trim());
    }
  };

  return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      <View style={[s.iconWrap, { backgroundColor: c.surfaceVariant }]}>
        <MaterialCommunityIcons name="camera-off" size={40} color={c.onSurfaceVariant} />
      </View>
      <Text style={[s.message, { color: c.onSurfaceVariant }]}>{message}</Text>

      {showManualInput && (
        <View style={s.inputRow}>
          <TextInput
            ref={inputRef}
            value={manualValue}
            onChangeText={setManualValue}
            placeholder={manualPlaceholder}
            placeholderTextColor={c.custom.textDisabled}
            style={[s.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outlineVariant }]}
            returnKeyType="done"
            onSubmitEditing={handleManualSubmit}
            autoComplete="off"
          />
          <Button
            mode="contained"
            compact
            onPress={handleManualSubmit}
            disabled={!manualValue.trim()}
            style={s.submitBtn}
          >
            OK
          </Button>
        </View>
      )}

      <View style={s.actions}>
        {showPickImage && onPickImage && (
          <Button
            mode="outlined"
            onPress={onPickImage}
            icon="image"
            style={s.actionBtn}
            labelStyle={s.actionLabel}
            textColor={c.onSurface}
          >
            Chọn ảnh từ thư viện
          </Button>
        )}

        <Button
          mode="contained"
          onPress={onRetry}
          icon="camera-retake"
          style={s.actionBtn}
          labelStyle={s.actionLabel}
        >
          Thử lại camera
        </Button>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitBtn: {
    borderRadius: 8,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  actionBtn: {
    borderRadius: 10,
  },
  actionLabel: {
    fontSize: 14,
  },
});
