import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Divider, SegmentedButtons, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { AppTheme } from '../theme/DarkTheme';

interface LoginScreenProps {
  navigation: any;
}

type LoginMode = 'patron' | 'staff';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loginMode, setLoginMode] = useState<LoginMode>('patron');
  const [studentCode, setStudentCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { patronLogin, staffLogin } = useAuth();

  const handleLogin = async () => {
    const identifier = loginMode === 'staff' ? email.trim() : studentCode.trim();
    if (!identifier || !password.trim()) {
      setError(loginMode === 'staff'
        ? 'Vui lòng nhập email và mật khẩu'
        : 'Vui lòng nhập mã sinh viên và mật khẩu');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      if (loginMode === 'staff') {
        await staffLogin(email.trim(), password);
      } else {
        await patronLogin(studentCode.trim(), password);
      }
    } catch (err: any) {
      let message = 'Đăng nhập thất bại';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string' && data.trim()) {
          message = data;
        } else if (data.error) {
          const backendError = data.error;
          if (backendError === 'Invalid credentials') {
            message = 'Sai tài khoản hoặc mật khẩu';
          } else if (backendError === 'Account is disabled') {
            message = 'Tài khoản đã bị khóa';
          } else if (backendError === 'Membership has expired') {
            message = 'Thẻ thư viện đã hết hạn';
          } else if (typeof backendError === 'string' && backendError.trim()) {
            message = backendError;
          }
        } else if (data.detail) {
          message = typeof data.detail === 'string' ? data.detail : data.detail[0] || 'Lỗi từ server';
        } else if (Array.isArray(data.message)) {
          message = data.message[0];
        } else if (data.message) {
          message = data.message;
        }
      } else if (err.code === 'ECONNABORTED') {
        message = 'Kết nối quá lâu. Vui lòng thử lại.';
      } else if (err.message) {
        message = err.message;
      } else if (!err.response) {
        message = 'Không thể kết nối server. Vui lòng kiểm tra mạng.';
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>TV</Text>
            </View>
            <Text variant="displaySmall" style={styles.title}>Thư Viện</Text>
            <Text variant="bodyLarge" style={styles.subtitle}>Đăng nhập để tiếp tục</Text>
          </View>

          <Card mode="outlined" style={styles.form}>
            <Card.Content style={styles.formContent}>
              <SegmentedButtons
                value={loginMode}
                onValueChange={(value) => setLoginMode(value as LoginMode)}
                buttons={[
                  { value: 'patron', label: 'Độc giả', icon: 'account' },
                  { value: 'staff', label: 'Nhân viên', icon: 'shield-account' },
                ]}
              />

              {loginMode === 'staff' ? (
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  left={<TextInput.Icon icon="email" color={theme.colors.onSurfaceVariant} />}
                />
              ) : (
                <TextInput
                  label="Mã sinh viên"
                  value={studentCode}
                  onChangeText={setStudentCode}
                  mode="outlined"
                  autoCapitalize="none"
                  autoCorrect={false}
                  left={<TextInput.Icon icon="account" color={theme.colors.onSurfaceVariant} />}
                />
              )}

              <TextInput
                label="Mật khẩu"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                left={<TextInput.Icon icon="lock" color={theme.colors.onSurfaceVariant} />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                    color={theme.colors.onSurfaceVariant}
                  />
                }
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                contentStyle={styles.largeButton}
              >
                {loginMode === 'staff' ? 'Đăng nhập nhân viên' : 'Đăng nhập'}
              </Button>

              <Button mode="text" onPress={() => navigation.navigate('ForgotPassword')} compact style={{ marginTop: -4 }}>
                Quên mật khẩu?
              </Button>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text variant="bodySmall" style={styles.dividerText}>hoặc</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                mode="outlined"
                onPress={() => navigation.navigate('FaceLogin')}
                icon="face-recognition"
                contentStyle={styles.mediumButton}
              >
                Đăng nhập bằng khuôn mặt
              </Button>

              {loginMode === 'patron' ? (
                <Button mode="text" onPress={() => navigation.navigate('Register')}>
                  Chưa có tài khoản? Đăng ký ngay
                </Button>
              ) : null}
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
      gap: 28,
    },
    brandSection: {
      alignItems: 'center',
      gap: 8,
    },
    logoCircle: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    logoText: {
      color: theme.colors.onPrimary,
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: 2,
    },
    title: {
      color: theme.colors.onBackground,
      fontWeight: '900',
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
    },
    form: {
      borderRadius: 18,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    formContent: {
      gap: 16,
      paddingVertical: 22,
    },
    largeButton: {
      minHeight: 52,
    },
    mediumButton: {
      minHeight: 48,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 4,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
    },
    dividerText: {
      color: theme.colors.onSurfaceVariant,
    },
  });
}
