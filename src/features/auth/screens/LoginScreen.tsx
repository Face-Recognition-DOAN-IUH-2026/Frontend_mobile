import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HelperText, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { NoticeSnackbar } from '../../../components/NoticeSnackbar';
import { useAuth } from '../../../context/AuthContext';
import { AppTheme } from '../../../theme/DarkTheme';
import { mapAuthError } from '../../../utils/mapAuthError';

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
      const message = mapAuthError(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerSection}>
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.decorCircle3} />
            <View style={styles.brandRow}>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>TV</Text>
              </View>
              <View>
                <Text variant="headlineMedium" style={styles.brandTitle}>Thư Viện</Text>
                <Text variant="bodyMedium" style={styles.brandSubtitle}>Thư viện số thông minh</Text>
              </View>
            </View>
            <Text variant="bodyLarge" style={styles.welcomeText}>Đăng nhập để tiếp tục</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.accentBar} />
            <View style={styles.formInner}>
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
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
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
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
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
                outlineStyle={styles.inputOutline}
                style={styles.input}
              />
              <HelperText type="error" visible={!!error} testID="helper-error" style={styles.helperError}>
                {error}
              </HelperText>

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                contentStyle={styles.loginBtn}
                labelStyle={styles.loginBtnLabel}
                style={styles.loginBtnWrapper}
              >
                {loginMode === 'staff' ? 'Đăng nhập nhân viên' : 'Đăng nhập'}
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.navigate('ForgotPassword')}
                compact
                labelStyle={styles.forgotLabel}
              >
                Quên mật khẩu?
              </Button>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text variant="bodySmall" style={styles.dividerText}>hoặc</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                mode="outlined"
                onPress={() => navigation.navigate('FaceLogin')}
                icon="face-recognition"
                contentStyle={styles.faceBtn}
                labelStyle={styles.faceBtnLabel}
                style={styles.faceBtnWrapper}
              >
                Đăng nhập bằng khuôn mặt
              </Button>

              {loginMode === 'patron' ? (
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Register')}
                  labelStyle={styles.registerLabel}
                >
                  Chưa có tài khoản? Đăng ký ngay
                </Button>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <NoticeSnackbar
        visible={!!error}
        message={error}
        severity="error"
        onDismiss={() => setError('')}
      />
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
    scrollContent: {
      flexGrow: 1,
    },
    headerSection: {
      backgroundColor: theme.colors.primary,
      paddingTop: 28,
      paddingBottom: 40,
      paddingHorizontal: 24,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      position: 'relative',
      overflow: 'hidden',
    },
    decorCircle1: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 130,
      height: 130,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    decorCircle2: {
      position: 'absolute',
      bottom: -40,
      left: 60,
      width: 170,
      height: 170,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    decorCircle3: {
      position: 'absolute',
      top: 20,
      left: -50,
      width: 100,
      height: 100,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      zIndex: 1,
    },
    logoBox: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: 2,
    },
    brandTitle: {
      color: '#FFFFFF',
      fontWeight: '900',
    },
    brandSubtitle: {
      color: 'rgba(255,255,255,0.75)',
      marginTop: 2,
    },
    welcomeText: {
      color: 'rgba(255,255,255,0.85)',
      marginTop: 16,
      zIndex: 1,
      fontWeight: '500',
    },
    formCard: {
      marginHorizontal: 16,
      marginTop: -20,
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 0.5,
      borderColor: theme.colors.outlineVariant,
      position: 'relative',
      overflow: 'hidden',
    },
    accentBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: theme.colors.primary,
    },
    formInner: {
      padding: 20,
      gap: 14,
    },
    input: {
      backgroundColor: 'transparent',
    },
    inputOutline: {
      borderRadius: 6,
    },
    helperError: {
      marginTop: -8,
      fontSize: 13,
    },
    loginBtn: {
      minHeight: 50,
      borderRadius: 8,
    },
    loginBtnLabel: {
      fontWeight: '700',
      fontSize: 15,
    },
    loginBtnWrapper: {
      borderRadius: 8,
      marginTop: 4,
    },
    forgotLabel: {
      fontSize: 13,
      color: theme.colors.primary,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 2,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
    },
    dividerText: {
      color: theme.colors.onSurfaceVariant,
    },
    faceBtn: {
      minHeight: 48,
      borderRadius: 8,
    },
    faceBtnLabel: {
      fontWeight: '600',
      fontSize: 14,
    },
    faceBtnWrapper: {
      borderRadius: 8,
      borderColor: theme.colors.outline,
    },
    registerLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
