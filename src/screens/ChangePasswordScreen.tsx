import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { colors } from '../theme/colors';
import { authApi } from '../api/auth';

interface ChangePasswordScreenProps {
  navigation: any;
}

export default function ChangePasswordScreen({ navigation }: ChangePasswordScreenProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

      await authApi.changePassword(patronData.id, newPassword);
      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.log('Change password error:', error);
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Surface style={styles.form} elevation={0}>
            <View style={styles.formAccent} />

            <Text style={styles.infoText}>
              Sau khi đổi mật khẩu, bạn sẽ không còn sử dụng mật khẩu mặc định nữa.
            </Text>

            <TextInput
              label="Mật khẩu hiện tại"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              mode="outlined"
              secureTextEntry={!showCurrent}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="lock" color={colors.textSecondary} />}
              right={
                <TextInput.Icon
                  icon={showCurrent ? 'eye-off' : 'eye'}
                  onPress={() => setShowCurrent(!showCurrent)}
                  color={colors.textSecondary}
                />
              }
              activeOutlineColor={colors.primary}
            />

            <TextInput
              label="Mật khẩu mới"
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              secureTextEntry={!showNew}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="lock-plus" color={colors.textSecondary} />}
              right={
                <TextInput.Icon
                  icon={showNew ? 'eye-off' : 'eye'}
                  onPress={() => setShowNew(!showNew)}
                  color={colors.textSecondary}
                />
              }
              activeOutlineColor={colors.primary}
            />
            <Text style={styles.hint}>Tối thiểu 8 ký tự</Text>

            <TextInput
              label="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry={!showConfirm}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="lock-check" color={colors.textSecondary} />}
              right={
                <TextInput.Icon
                  icon={showConfirm ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirm(!showConfirm)}
                  color={colors.textSecondary}
                />
              }
              activeOutlineColor={colors.primary}
            />

            <Button
              mode="contained"
              onPress={handleChangePassword}
              loading={isLoading}
              disabled={isLoading || !newPassword || !confirmPassword}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Đổi mật khẩu
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              labelStyle={styles.cancelLabel}
            >
              Hủy
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  form: {
    padding: 20,
    borderRadius: 8,
    backgroundColor: colors.surface,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  formAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  inputOutline: {
    borderRadius: 6,
    borderColor: colors.border,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  button: {
    marginTop: 8,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 12,
  },
  cancelLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});