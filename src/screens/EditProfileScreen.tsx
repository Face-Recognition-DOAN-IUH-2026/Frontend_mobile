import React, { useState, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Surface, Divider, useTheme } from 'react-native-paper';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { devError } from '../utils/logger';

interface EditProfileScreenProps {
  navigation: any;
}

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const theme = useTheme();
  const c = theme.colors;
  const { user, patron, updateUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(patron?.phone || '');
  const [address, setAddress] = useState(patron?.permanent_address || patron?.permanentAddress || '');
  const [isLoading, setIsLoading] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [emailStep, setEmailStep] = useState<'input' | 'otp'>('input');
  const [emailLoading, setEmailLoading] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    content: { flexGrow: 1, padding: 16, gap: 14 },
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
    sectionTitle: {
      color: c.primary,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 14,
    },
    input: { marginBottom: 12, backgroundColor: 'transparent' },
    inputOutline: { borderRadius: 6, borderColor: c.outline },
    button: { marginTop: 8, borderRadius: 6, backgroundColor: c.primary },
    buttonContent: { paddingVertical: 8 },
    buttonLabel: { fontSize: 15, fontWeight: '700' },
    cancelButton: { marginTop: 12 },
    cancelLabel: { fontSize: 14, color: c.onSurfaceVariant },
    hint: {
      color: c.onSurfaceVariant,
      fontSize: 11,
      marginTop: -8,
      marginBottom: 12,
      marginLeft: 4,
    },
    emailSection: {
      padding: 20,
      borderRadius: 8,
      backgroundColor: c.surface,
      position: 'relative',
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: c.outline,
    },
    currentEmail: {
      color: c.onSurfaceVariant,
      fontSize: 13,
      marginBottom: 12,
      lineHeight: 20,
    },
  }), [c]);

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
    <SafeAreaView style={s.container} edges={['bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {/* Personal Info */}
          <Surface style={s.form} elevation={0}>
            <View style={s.formAccent} />
            <Text style={s.sectionTitle}>Thông tin cá nhân</Text>

            <TextInput
              label="Họ và tên"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              style={s.input}
              outlineStyle={s.inputOutline}
              left={<TextInput.Icon icon="account" color={c.onSurfaceVariant} />}
              activeOutlineColor={c.primary}
            />

            <TextInput
              label="Số điện thoại"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={s.input}
              outlineStyle={s.inputOutline}
              left={<TextInput.Icon icon="phone" color={c.onSurfaceVariant} />}
              activeOutlineColor={c.primary}
            />

            <TextInput
              label="Địa chỉ"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              style={s.input}
              outlineStyle={s.inputOutline}
              left={<TextInput.Icon icon="home" color={c.onSurfaceVariant} />}
              activeOutlineColor={c.primary}
            />

            <Button
              mode="contained"
              onPress={handleSaveProfile}
              loading={isLoading}
              disabled={isLoading}
              style={s.button}
              contentStyle={s.buttonContent}
              labelStyle={s.buttonLabel}
            >
              Lưu thay đổi
            </Button>
          </Surface>

          {/* Email Change */}
          <Surface style={s.emailSection} elevation={0}>
            <View style={s.formAccent} />
            <Text style={s.sectionTitle}>Đổi email</Text>
            <Text style={s.currentEmail}>
              Email hiện tại: <Text style={{ fontWeight: '700', color: c.onSurface }}>{user?.email}</Text>
            </Text>

            {emailStep === 'input' ? (
              <>
                <TextInput
                  label="Email mới"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={s.input}
                  outlineStyle={s.inputOutline}
                  left={<TextInput.Icon icon="email" color={c.onSurfaceVariant} />}
                  activeOutlineColor={c.primary}
                />
                <Button
                  mode="contained"
                  onPress={handleRequestEmailOtp}
                  loading={emailLoading}
                  disabled={emailLoading || !newEmail.trim()}
                  style={s.button}
                  contentStyle={s.buttonContent}
                  labelStyle={s.buttonLabel}
                >
                  Gửi mã OTP
                </Button>
              </>
            ) : (
              <>
                <Text style={s.hint}>Mã OTP đã gửi đến {newEmail}</Text>
                <TextInput
                  label="Mã OTP"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  mode="outlined"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={s.input}
                  outlineStyle={s.inputOutline}
                  left={<TextInput.Icon icon="shield-key" color={c.onSurfaceVariant} />}
                  activeOutlineColor={c.primary}
                />
                <Button
                  mode="contained"
                  onPress={handleChangeEmail}
                  loading={emailLoading}
                  disabled={emailLoading || !otpCode.trim()}
                  style={s.button}
                  contentStyle={s.buttonContent}
                  labelStyle={s.buttonLabel}
                >
                  Xác nhận đổi email
                </Button>
                <Button
                  mode="text"
                  onPress={() => { setEmailStep('input'); setOtpCode(''); }}
                  style={s.cancelButton}
                  labelStyle={s.cancelLabel}
                >
                  Nhập lại email
                </Button>
              </>
            )}
          </Surface>

          <Button mode="text" onPress={() => navigation.goBack()} style={s.cancelButton} labelStyle={s.cancelLabel}>
            Hủy
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
