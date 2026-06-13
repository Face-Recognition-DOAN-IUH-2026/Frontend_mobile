import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
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
  const [step, setStep] = useState<'form' | 'face'>('form');
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
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

  const handleContinueToFace = () => {
    if (validateForm()) {
      setStep('face');
    }
  };

  const handleCapture = (base64Image: string) => {
    setCapturedPhoto(base64Image);
  };

  const handleError = (error: string) => {
    Alert.alert('Lỗi', error);
  };

  const handleRegister = async () => {
    if (!capturedPhoto) {
      Alert.alert('Lỗi', 'Vui lòng chụp ảnh khuôn mặt');
      return;
    }

    setIsUploading(true);
    try {
      const registerResponse = await authApi.patronRegister({
        student_code: studentCode.trim(),
        password: password,
        full_name: fullName.trim(),
        class_name: className.trim() || undefined,
      });

      const { patron } = registerResponse;

      const formData = new FormData();
      formData.append('image', {
        uri: `data:image/jpeg;base64,${capturedPhoto}`,
        type: 'image/jpeg',
        name: 'face.jpg',
      } as any);
      formData.append('angle', 'frontal');

      await api.post(`/kiosk/enroll-face/${patron.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Thành công', 'Đăng ký tài khoản thành công!', [
        { text: 'Đăng nhập ngay', onPress: () => navigation.replace('Login') },
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'Đăng ký thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setIsUploading(false);
    }
  };

  if (step === 'face') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.faceStep}>
          <View style={styles.faceStepHeader}>
            <Text style={styles.faceStepTitle}>Đăng ký khuôn mặt</Text>
            <Text style={styles.faceStepSubtitle}>
              Chụp 1 tấm ảnh khuôn mặt để đăng nhập nhanh sau này
            </Text>
          </View>

          <View style={styles.captureContainer}>
            {capturedPhoto ? (
              <View style={styles.previewContainer}>
                <View style={styles.photoPreview}>
                  <Text style={styles.previewEmoji}>✓</Text>
                  <Text style={styles.previewText}>Đã chụp thành công</Text>
                </View>

                <Button
                  mode="outlined"
                  onPress={() => setCapturedPhoto(null)}
                  style={styles.retakeButton}
                  disabled={isUploading}
                >
                  Chụp lại
                </Button>
              </View>
            ) : (
              <AutoFaceCapture
                onCapture={handleCapture}
                onError={handleError}
              />
            )}
          </View>

          <Surface style={styles.faceActions} elevation={0}>
            <Button
              mode="contained"
              onPress={handleRegister}
              loading={isUploading}
              disabled={isUploading || !capturedPhoto}
              style={styles.registerButton}
              labelStyle={styles.registerButtonLabel}
            >
              Hoàn tất đăng ký
            </Button>

            <Button
              mode="text"
              onPress={() => setStep('form')}
              textColor={colors.textSecondary}
              disabled={isUploading}
            >
              Quay lại
            </Button>
          </Surface>
        </View>
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
            onPress={handleContinueToFace}
            style={styles.continueButton}
            contentStyle={styles.continueButtonContent}
            labelStyle={styles.continueButtonLabel}
          >
            Tiếp tục đăng ký khuôn mặt
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
  faceStep: {
    flex: 1,
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
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  photoPreview: {
    width: 160,
    height: 200,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: colors.success,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  previewEmoji: {
    fontSize: 48,
    color: colors.success,
  },
  previewText: {
    color: colors.text,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retakeButton: {
    borderColor: colors.primary,
  },
  faceActions: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    gap: 8,
  },
  registerButton: {
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  registerButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 6,
  },
});