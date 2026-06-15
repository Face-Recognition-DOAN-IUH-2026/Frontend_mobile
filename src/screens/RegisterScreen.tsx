import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Card, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
import api from '../api/client';
import { authApi } from '../api/auth';
import AutoFaceCapture from '../components/AutoFaceCapture';
import { AppTheme } from '../theme/DarkTheme';

interface RegisterScreenProps {
  navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [step, setStep] = useState<'form' | 'choice' | 'face'>('form');
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [className, setClassName] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const showError = (message: string) => setSnackbar(message);

  const validateForm = () => {
    if (!studentCode.trim()) {
      showError('Vui lòng nhập mã sinh viên');
      return false;
    }
    if (studentCode.length < 4) {
      showError('Mã sinh viên phải có ít nhất 4 ký tự');
      return false;
    }
    if (!fullName.trim()) {
      showError('Vui lòng nhập họ tên');
      return false;
    }
    if (!email.trim()) {
      showError('Vui lòng nhập email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showError('Email không hợp lệ');
      return false;
    }
    if (!password) {
      showError('Vui lòng nhập mật khẩu');
      return false;
    }
    if (password.length < 6) {
      showError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    if (password !== confirmPassword) {
      showError('Mật khẩu xác nhận không khớp');
      return false;
    }
    return true;
  };

  const handleRegisterClick = async () => {
    if (!validateForm()) return;

    setIsUploading(true);
    try {
      const response = await authApi.patronRegister({
        student_code: studentCode.trim(),
        password,
        full_name: fullName.trim(),
        email: email.trim(),
        class_name: className.trim() || undefined,
      });
      setRegisteredUser(response.user);
      setStep('choice');
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Đăng ký thất bại';
      showError(message);
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

      setSnackbar('Đăng ký tài khoản và khuôn mặt thành công');
      navigation.replace('Login');
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Đăng ký khuôn mặt thất bại';
      showError(message);
    } finally {
      setIsUploading(false);
    }
  };

  if (step === 'choice') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.choiceContainer}>
          <Card mode="outlined" style={styles.choiceCard}>
            <Card.Content style={styles.choiceContent}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkIcon}>✓</Text>
              </View>
              <Text variant="headlineSmall" style={styles.choiceTitle}>Đăng ký tài khoản thành công</Text>
              <Text style={styles.choiceSubtitle}>
                Bạn có muốn đăng ký khuôn mặt để đăng nhập nhanh tại cổng thư viện không?
              </Text>
              <Button mode="contained" onPress={() => setStep('face')} contentStyle={styles.largeButton}>
                Đăng ký khuôn mặt
              </Button>
              <Button mode="text" onPress={() => navigation.replace('Login')}>
                Bỏ qua
              </Button>
            </Card.Content>
          </Card>
        </View>
        <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={4000}>
          {snackbar}
        </Snackbar>
      </SafeAreaView>
    );
  }

  if (step === 'face') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Card mode="contained" style={styles.faceHeader}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>Đăng ký khuôn mặt</Text>
            <Text style={styles.mutedText}>Chụp khuôn mặt từ 4 góc để đăng nhập nhanh sau này.</Text>
          </Card.Content>
        </Card>

        <View style={styles.captureContainer}>
          <AutoFaceCapture onFilesReady={handleFaceEnroll} onError={showError} />
        </View>

        {!isUploading ? (
          <Card mode="contained" style={styles.faceActions}>
            <Card.Content>
              <Button mode="text" onPress={() => navigation.replace('Login')}>
                Bỏ qua
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        {isUploading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Đang đăng ký khuôn mặt...</Text>
          </View>
        ) : null}

        <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={4000}>
          {snackbar}
        </Snackbar>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Card mode="outlined" style={styles.formContainer}>
          <Card.Content style={styles.formContent}>
            <View>
              <Text variant="headlineSmall" style={styles.formTitle}>Đăng ký tài khoản</Text>
              <Text style={styles.formSubtitle}>Nhập thông tin để tạo tài khoản độc giả mới.</Text>
            </View>

            <TextInput
              label="Mã sinh viên"
              value={studentCode}
              onChangeText={setStudentCode}
              mode="outlined"
              autoCapitalize="none"
              left={<TextInput.Icon icon="account" color={theme.colors.onSurfaceVariant} />}
            />

            <TextInput
              label="Họ và tên"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              left={<TextInput.Icon icon="account-outline" color={theme.colors.onSurfaceVariant} />}
            />

            <TextInput
              label="Lớp (không bắt buộc)"
              value={className}
              onChangeText={setClassName}
              mode="outlined"
              left={<TextInput.Icon icon="school" color={theme.colors.onSurfaceVariant} />}
            />

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              left={<TextInput.Icon icon="email" color={theme.colors.onSurfaceVariant} />}
            />

            <TextInput
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              left={<TextInput.Icon icon="lock" color={theme.colors.onSurfaceVariant} />}
            />

            <TextInput
              label="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              left={<TextInput.Icon icon="lock-check" color={theme.colors.onSurfaceVariant} />}
            />

            <Button
              mode="contained"
              onPress={handleRegisterClick}
              loading={isUploading}
              disabled={isUploading}
              contentStyle={styles.largeButton}
            >
              Đăng ký
            </Button>

            <Button mode="text" onPress={() => navigation.goBack()}>
              Đã có tài khoản? Đăng nhập
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={4000}>
        {snackbar}
      </Snackbar>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const success = theme.dark ? '#4A8C5C' : '#067647';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
      borderRadius: 18,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    formContent: {
      gap: 14,
      paddingVertical: 22,
    },
    formTitle: {
      color: theme.colors.onSurface,
      fontWeight: '900',
    },
    formSubtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    largeButton: {
      minHeight: 52,
    },
    choiceContainer: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    choiceCard: {
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
    },
    choiceContent: {
      alignItems: 'center',
      gap: 14,
      paddingVertical: 24,
    },
    checkCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: `${success}22`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkIcon: {
      fontSize: 42,
      color: success,
      fontWeight: '900',
    },
    choiceTitle: {
      color: theme.colors.onSurface,
      textAlign: 'center',
      fontWeight: '900',
    },
    choiceSubtitle: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
    },
    faceHeader: {
      margin: 12,
      marginBottom: 0,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
    },
    cardTitle: {
      color: theme.colors.onSurface,
      fontWeight: '800',
    },
    mutedText: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    captureContainer: {
      flex: 1,
    },
    faceActions: {
      margin: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: '#FFFFFF',
      fontSize: 15,
      marginTop: 12,
    },
  });
}
