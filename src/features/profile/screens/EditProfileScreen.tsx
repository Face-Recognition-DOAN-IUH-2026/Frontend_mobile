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

interface EditProfileScreenProps {
  navigation: any;
}

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, patron, updateUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(patron?.phone || '');
  const [address, setAddress] = useState(patron?.permanent_address || patron?.permanentAddress || '');
  const [isLoading, setIsLoading] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [emailStep, setEmailStep] = useState<'input' | 'otp'>('input');
  const [emailLoading, setEmailLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Họ tên không được để trống');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        permanent_address: address.trim() || undefined,
      });
      updateUser({ full_name: fullName.trim() });
      Alert.alert('Thành công', 'Cập nhật thông tin thành công', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      devError('Update profile error:', error);
      Alert.alert('Lỗi', error?.response?.data?.error || 'Không thể cập nhật thông tin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestEmailOtp = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hợp lệ');
      return;
    }
    setEmailLoading(true);
    try {
      await authApi.requestEmailChangeOtp(newEmail.trim());
      setEmailStep('otp');
      Alert.alert('Thành công', 'Mã OTP đã được gửi đến email mới');
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.error || 'Không thể gửi mã OTP');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!otpCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP');
      return;
    }
    setEmailLoading(true);
    try {
      await authApi.verifyAndChangeEmail(newEmail.trim(), otpCode.trim());
      updateUser({ email: newEmail.trim() });
      Alert.alert('Thành công', 'Đổi email thành công', [
        { text: 'OK', onPress: () => {
          setEmailStep('input');
          setNewEmail('');
          setOtpCode('');
        }},
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.error || 'Mã OTP không hợp lệ');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <GradientHeader
        title="Chỉnh sửa hồ sơ"
        subtitle="Cập nhật thông tin cá nhân"
        icon="account-edit"
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SectionCard
            title="Thông tin cá nhân"
            icon="account-details"
            accentColor={c.primary}
          >
            <View style={styles.formBody}>
              <TextInput
                label="Họ và tên"
                value={fullName}
                onChangeText={setFullName}
                mode="outlined"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                left={<TextInput.Icon icon="account" color={c.onSurfaceVariant} />}
                activeOutlineColor={c.primary}
              />

              <TextInput
                label="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                left={<TextInput.Icon icon="phone" color={c.onSurfaceVariant} />}
                activeOutlineColor={c.primary}
              />

              <TextInput
                label="Địa chỉ"
                value={address}
                onChangeText={setAddress}
                mode="outlined"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                left={<TextInput.Icon icon="home" color={c.onSurfaceVariant} />}
                activeOutlineColor={c.primary}
              />

              <Button
                mode="contained"
                onPress={handleSaveProfile}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                icon="content-save"
              >
                Lưu thay đổi
              </Button>
            </View>
          </SectionCard>

          <SectionCard
            title="Đổi email"
            icon="email-edit"
            accentColor={c.primary}
          >
            <View style={styles.formBody}>
              <View style={styles.currentEmailRow}>
                <MaterialCommunityIcons name="email-check" size={16} color={c.primary} />
                <Text style={styles.currentEmailLabel}>Email hiện tại: </Text>
                <Text style={styles.currentEmailValue}>{user?.email}</Text>
              </View>

              {emailStep === 'input' ? (
                <>
                  <TextInput
                    label="Email mới"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    left={<TextInput.Icon icon="email" color={c.onSurfaceVariant} />}
                    activeOutlineColor={c.primary}
                  />
                  <Button
                    mode="contained"
                    onPress={handleRequestEmailOtp}
                    loading={emailLoading}
                    disabled={emailLoading || !newEmail.trim()}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                    icon="send"
                  >
                    Gửi mã OTP
                  </Button>
                </>
              ) : (
                <>
                  <Surface style={styles.otpBanner} elevation={0}>
                    <MaterialCommunityIcons name="email-check" size={18} color={c.primary} />
                    <Text style={styles.otpBannerText}>Mã OTP đã gửi đến {newEmail}</Text>
                  </Surface>

                  <TextInput
                    label="Mã OTP"
                    value={otpCode}
                    onChangeText={setOtpCode}
                    mode="outlined"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    left={<TextInput.Icon icon="shield-key" color={c.onSurfaceVariant} />}
                    activeOutlineColor={c.primary}
                  />
                  <Button
                    mode="contained"
                    onPress={handleChangeEmail}
                    loading={emailLoading}
                    disabled={emailLoading || !otpCode.trim()}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                    icon="check-circle"
                  >
                    Xác nhận đổi email
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => { setEmailStep('input'); setOtpCode(''); }}
                    style={styles.cancelButton}
                    labelStyle={styles.cancelLabel}
                    icon="arrow-left"
                  >
                    Nhập lại email
                  </Button>
                </>
              )}
            </View>
          </SectionCard>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
            labelStyle={styles.cancelLabel}
            icon="arrow-left"
          >
            Quay lại
          </Button>
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
    sectionTitle: {
      color: c.primary,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 14,
    },
    input: {
      marginBottom: 10,
      backgroundColor: 'transparent',
    },
    inputOutline: {
      borderRadius: 12,
      borderColor: c.outline,
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
      marginTop: 4,
    },
    cancelLabel: {
      fontSize: 14,
      color: c.onSurfaceVariant,
    },
    currentEmailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: c.surfaceVariant + '60',
      borderRadius: 10,
    },
    currentEmailLabel: {
      color: c.onSurfaceVariant,
      fontSize: 13,
    },
    currentEmailValue: {
      color: c.onSurface,
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
    },
    otpBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      marginBottom: 12,
      backgroundColor: c.primaryContainer + '40',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.primary + '30',
    },
    otpBannerText: {
      color: c.onSurface,
      fontSize: 13,
      flex: 1,
    },
  });
}
