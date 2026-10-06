import React, { useState, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Surface, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { authApi } from '../../../api/auth';
import { useAuth } from '../../../context/AuthContext';
import { devError } from '../../../utils/logger';
import { AppTheme } from '../../../theme/DarkTheme';
import { GradientHeader, SectionCard } from '../../../theme/MobileDesignSystem';

interface ChangePasswordScreenProps {
  navigation: any;
}

export default function ChangePasswordScreen({ navigation }: ChangePasswordScreenProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, mustChangePassword, setMustChangePassword, updateUser } = useAuth();
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
      if (!user?.id) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
        return;
      }

      await authApi.changePassword(user.id, currentPassword, newPassword);
      if (mustChangePassword) {
        setMustChangePassword(false);
        updateUser({ password_auto_generated: false } as any);
      }
      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          },
        },
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <GradientHeader
        title="Đổi mật khẩu"
        subtitle="Cập nhật mật khẩu bảo mật"
        icon="lock-reset"
        right={
          <MaterialCommunityIcons name="shield-lock" size={28} color="rgba(255,255,255,0.3)" />
        }
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SectionCard
            title="Thông tin bảo mật"
            icon="shield-lock"
            accentColor={c.primary}
          >
            <View style={styles.formBody}>
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
                style={styles.input}
                outlineStyle={styles.inputOutline}
                left={<TextInput.Icon icon="lock-plus" color={c.onSurfaceVariant} />}
                right={<TextInput.Icon icon={showNew ? 'eye-off' : 'eye'} onPress={() => setShowNew(!showNew)} color={c.onSurfaceVariant} />}
                activeOutlineColor={c.primary}
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
                left={<TextInput.Icon icon="lock-check" color={c.onSurfaceVariant} />}
                right={<TextInput.Icon icon={showConfirm ? 'eye-off' : 'eye'} onPress={() => setShowConfirm(!showConfirm)} color={c.onSurfaceVariant} />}
                activeOutlineColor={c.primary}
              />

              <Button
                mode="contained"
                onPress={handleChangePassword}
                loading={isLoading}
                disabled={isLoading || !newPassword || !confirmPassword}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                icon="check-circle"
              >
                Đổi mật khẩu
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                style={styles.cancelButton}
                labelStyle={styles.cancelLabel}
                icon="arrow-left"
              >
                Quay lại
              </Button>
            </View>
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      padding: 16,
      gap: 12,
    },
    formBody: {
      padding: 16,
      paddingBottom: 20,
      gap: 4,
    },
    infoText: {
      color: c.onSurfaceVariant,
      fontSize: 13,
      marginBottom: 12,
      lineHeight: 20,
    },
    input: {
      marginBottom: 10,
      backgroundColor: 'transparent',
    },
    inputOutline: {
      borderRadius: 12,
      borderColor: c.outline,
    },
    hint: {
      color: c.onSurfaceVariant,
      fontSize: 11,
      marginTop: -6,
      marginBottom: 10,
      marginLeft: 4,
    },
    button: {
      marginTop: 10,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    buttonContent: {
      paddingVertical: 8,
    },
    buttonLabel: {
      fontSize: 15,
      fontWeight: '700',
    },
    cancelButton: {
      marginTop: 8,
    },
    cancelLabel: {
      fontSize: 14,
      color: c.onSurfaceVariant,
    },
  });
}
