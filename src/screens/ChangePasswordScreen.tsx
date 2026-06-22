import React, { useState, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Surface, useTheme } from 'react-native-paper';
import { authApi } from '../api/auth';
import { devError } from '../utils/logger';

interface ChangePasswordScreenProps {
  navigation: any;
}

export default function ChangePasswordScreen({ navigation }: ChangePasswordScreenProps) {
  const theme = useTheme();
  const c = theme.colors;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    content: { flexGrow: 1, padding: 16 },
    form: {
      padding: 20,
      borderRadius: 8,
      backgroundColor: c.surface,
      position: 'relative',
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: c.outline,
    },
    formAccent: {
      position: 'absolute',
      left: 0, top: 0, bottom: 0,
      width: 3,
      backgroundColor: c.primary,
      borderTopRightRadius: 2,
      borderBottomRightRadius: 2,
    },
    infoText: {
      color: c.onSurfaceVariant,
      fontSize: 13,
      marginBottom: 16,
      lineHeight: 20,
    },
    input: { marginBottom: 12, backgroundColor: 'transparent' },
    inputOutline: { borderRadius: 6, borderColor: c.outline },
    hint: {
      color: c.onSurfaceVariant,
      fontSize: 11,
      marginTop: -8,
      marginBottom: 12,
      marginLeft: 4,
    },
    button: { marginTop: 8, borderRadius: 6, backgroundColor: c.primary },
    buttonContent: { paddingVertical: 8 },
    buttonLabel: { fontSize: 15, fontWeight: '700' },
    cancelButton: { marginTop: 12 },
    cancelLabel: { fontSize: 14, color: c.onSurfaceVariant },
  }), [c]);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    setIsLoading(true);
    try {
      const patronDataStr = await require('@react-native-async-storage/async-storage').default.getItem('patronData');
      const patronData = JSON.parse(patronDataStr || '{}');
      if (!patronData?.id) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
        return;
      }

      await authApi.changePassword(patronData.id, currentPassword, newPassword);
      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      devError('Change password error:', error);
      let message = 'Không thể đổi mật khẩu';
      if (error.response?.data?.error) {
        message = error.response.data.error;
      }
      Alert.alert('Lỗi', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Surface style={s.form} elevation={0}>
            <View style={s.formAccent} />

            <Text style={s.infoText}>
              Sau khi đổi mật khẩu, bạn sẽ không còn sử dụng mật khẩu mặc định nữa.
            </Text>

            <TextInput
              label="Mật khẩu hiện tại"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              mode="outlined"
              secureTextEntry={!showCurrent}
              style={s.input}
              outlineStyle={s.inputOutline}
              left={<TextInput.Icon icon="lock" color={c.onSurfaceVariant} />}
              right={<TextInput.Icon icon={showCurrent ? 'eye-off' : 'eye'} onPress={() => setShowCurrent(!showCurrent)} color={c.onSurfaceVariant} />}
              activeOutlineColor={c.primary}
            />

            <TextInput
              label="Mật khẩu mới"
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              secureTextEntry={!showNew}
              style={s.input}
              outlineStyle={s.inputOutline}
              left={<TextInput.Icon icon="lock-plus" color={c.onSurfaceVariant} />}
              right={<TextInput.Icon icon={showNew ? 'eye-off' : 'eye'} onPress={() => setShowNew(!showNew)} color={c.onSurfaceVariant} />}
              activeOutlineColor={c.primary}
            />
            <Text style={s.hint}>Tối thiểu 8 ký tự</Text>

            <TextInput
              label="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry={!showConfirm}
              style={s.input}
              outlineStyle={s.inputOutline}
              left={<TextInput.Icon icon="lock-check" color={c.onSurfaceVariant} />}
              right={<TextInput.Icon icon={showConfirm ? 'eye-off' : 'eye'} onPress={() => setShowConfirm(!showConfirm)} color={c.onSurfaceVariant} />}
              activeOutlineColor={c.primary}
            />

            <Button
              mode="contained"
              onPress={handleChangePassword}
              loading={isLoading}
              disabled={isLoading || !newPassword || !confirmPassword}
              style={s.button}
              contentStyle={s.buttonContent}
              labelStyle={s.buttonLabel}
            >
              Đổi mật khẩu
            </Button>

            <Button mode="text" onPress={() => navigation.goBack()} style={s.cancelButton} labelStyle={s.cancelLabel}>
              Hủy
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}