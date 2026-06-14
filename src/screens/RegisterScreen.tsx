import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import AutoFaceCapture from '../components/AutoFaceCapture';
import api from '../api/client';
import { authApi } from '../api/auth';
import { colors } from '../theme/colors';

interface RegisterScreenProps {
  navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [step, setStep] = useState<'form' | 'choice' | 'face'>('form');
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [className, setClassName] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateForm = () => {
    if (!studentCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã sinh viên');
      return false;
    }
    if (studentCode.length < 4) {
      Alert.alert('Lỗi', 'Mã sinh viên phải có ít nhất 4 ký tự');
      return false;
    }
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return false;
    }
    if (!password) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return false;
    }
    return true;
  };

  const handleError = (error: string) => {
    Alert.alert('Lỗi', error);
  };

  const handleRegisterClick = async () => {
    if (!validateForm()) return;

    setIsUploading(true);
    try {
      const response = await authApi.patronRegister({
        student_code: studentCode.trim(),
        password: password,
        full_name: fullName.trim(),
        email: email.trim(),
        class_name: className.trim() || undefined,
      });
      setRegisteredUser(response.user);
      setStep('choice');
    } catch (error: any) {
      console.log('[Register] Error:', error?.response?.data || error?.message || error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Đăng ký thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFaceEnroll = async (images: string[]) => {
    if (!registeredUser?.id || images.length !== 4) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('frontal', {
        uri: `data:image/jpeg;base64,${images[0]}`,
        type: 'image/jpeg',
        name: 'face_frontal.jpg',
      } as any);
      formData.append('right', {
        uri: `data:image/jpeg;base64,${images[1]}`,
        type: 'image/jpeg',
        name: 'face_right.jpg',
      } as any);
      formData.append('left', {
        uri: `data:image/jpeg;base64,${images[2]}`,
        type: 'image/jpeg',
        name: 'face_left.jpg',
      } as any);
      formData.append('down', {
        uri: `data:image/jpeg;base64,${images[3]}`,
        type: 'image/jpeg',
        name: 'face_down.jpg',
      } as any);
      formData.append('consent_given', 'true');

      await api.post(`/patrons/${registeredUser.id}/enroll-batch`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 130000,
      });

      Alert.alert('Thành công', 'Đăng ký tài khoản và khuôn mặt thành công!', [
        { text: 'Đăng nhập ngay', onPress: () => navigation.replace('Login') },
      ]);
    } catch (error: any) {
      console.log('[Register] Enroll error:', error?.response?.data || error?.message || error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Đăng ký khuôn mặt thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setIsUploading(false);
    }
  };

  if (step === 'choice') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.choiceContainer}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.choiceTitle}>Đăng ký tài khoản thành công!</Text>
          <Text style={styles.choiceSubtitle}>
            Bạn có muốn đăng ký khuôn mặt để đăng nhập nhanh tại cổng thư viện không?
          </Text>
          <Button
            mode="contained"
            onPress={() => setStep('face')}
            style={styles.choiceEnrollBtn}
            labelStyle={styles.choiceEnrollBtnLabel}
          >
            Đăng ký khuôn mặt
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.replace('Login')}
            textColor={colors.textSecondary}
            style={styles.choiceSkipBtn}
          >
            Bỏ qua
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'face') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.faceStepHeader}>
          <Text style={styles.faceStepTitle}>Đăng ký khuôn mặt</Text>
          <Text style={styles.faceStepSubtitle}>
            Chụp khuôn mặt từ 4 góc để đăng nhập nhanh sau này
          </Text>
        </View>

        <View style={styles.captureContainer}>
          <AutoFaceCapture onFilesReady={handleFaceEnroll} onError={handleError} />
        </View>

        {!isUploading && (
          <Surface style={styles.faceActions} elevation={0}>
            <Button
              mode="text"
              onPress={() => navigation.replace('Login')}
              textColor={colors.textSecondary}
            >
              Bỏ qua
            </Button>
          </Surface>
        )}

        {isUploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang đăng ký khuôn mặt...</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.formContainer} elevation={0}>
          <View style={styles.formAccent} />
          <Text style={styles.formTitle}>Đăng ký tài khoản</Text>
          <Text style={styles.formSubtitle}>Nhập thông tin để đăng ký tài khoản mới</Text>

          <TextInput
            label="Mã sinh viên"
            value={studentCode}
            onChangeText={setStudentCode}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            autoCapitalize="none"
            left={<TextInput.Icon icon="account" color={colors.textSecondary} />}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Họ và tên"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="account-outline" color={colors.textSecondary} />}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Lớp (không bắt buộc)"
            value={className}
            onChangeText={setClassName}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="school" color={colors.textSecondary} />}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            autoCapitalize="none"
            keyboardType="email-address"
            left={<TextInput.Icon icon="email" color={colors.textSecondary} />}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            secureTextEntry
            left={<TextInput.Icon icon="lock" color={colors.textSecondary} />}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Xác nhận mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            secureTextEntry
            left={<TextInput.Icon icon="lock-check" color={colors.textSecondary} />}
            activeOutlineColor={colors.primary}
          />

          <Button
            mode="contained"
            onPress={handleRegisterClick}
            loading={isUploading}
            disabled={isUploading}
            style={styles.continueButton}
            contentStyle={styles.continueButtonContent}
            labelStyle={styles.continueButtonLabel}
          >
            Đăng ký
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            textColor={colors.textSecondary}
            style={styles.loginLink}
            labelStyle={styles.loginLinkLabel}
          >
            Đã có tài khoản? Đăng nhập
          </Button>
        </Surface>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  formContainer: {
    padding: 24,
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
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  inputOutline: {
    borderRadius: 6,
    borderColor: colors.border,
  },
  continueButton: {
    marginTop: 8,
    borderRadius: 6,
  },
  continueButtonContent: {
    paddingVertical: 10,
  },
  continueButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  loginLink: {
    marginTop: 16,
  },
  loginLinkLabel: {
    fontSize: 13,
  },
  choiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkIcon: {
    fontSize: 40,
    color: colors.success,
    fontWeight: '700',
  },
  choiceTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  choiceSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  choiceEnrollBtn: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: colors.primary,
    marginBottom: 12,
  },
  choiceEnrollBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 4,
  },
  choiceSkipBtn: {
    marginBottom: 0,
  },
  faceStepHeader: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  faceStepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  faceStepSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  captureContainer: {
    flex: 1,
  },
  faceActions: {
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 15,
    marginTop: 12,
  },
});
