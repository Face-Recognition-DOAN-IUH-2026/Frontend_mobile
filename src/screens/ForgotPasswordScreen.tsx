import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../theme/DarkTheme';
import { authApi } from '../api/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ForgotPasswordScreenProps {
  navigation: StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
}

type Step = 1 | 2 | 3 | 4;

const STEP_COUNT = 3;

function StepIndicator({ current, total, theme }: { current: number; total: number; theme: AppTheme }) {
  return (
    <View style={stepStyles.container}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <React.Fragment key={i}>
            <View
              style={[
                stepStyles.dot,
                {
                  backgroundColor: isDone
                    ? theme.colors.primary
                    : isActive
                      ? theme.colors.primary
                      : theme.colors.outlineVariant,
                  width: isActive ? 32 : 10,
                },
              ]}
            />
            {i < total - 1 && (
              <View
                style={[
                  stepStyles.line,
                  {
                    backgroundColor: isDone ? theme.colors.primary : theme.colors.outlineVariant,
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  line: {
    height: 2,
    width: 24,
    borderRadius: 1,
  },
});

import CodeInput from '../components/CodeInput';

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const animateStep = (toStep: Step) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(toStep);
      setError('');
      setSuccess('');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSuccess('Mã xác minh đã được gửi đến email của bạn');
      setResendCooldown(60);
      setTimeout(() => animateStep(2), 800);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Không thể gửi mã xác minh');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.verifyResetCode(email.trim(), code);
      setSuccess('');
      animateStep(3);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Mã xác minh không đúng');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ mật khẩu');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(email.trim(), code, newPassword);
      animateStep(4);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = step === 1
    ? 'Quên mật khẩu'
    : step === 2
      ? 'Xác minh mã'
      : step === 3
        ? 'Đặt mật khẩu mới'
        : 'Thành công';

  const stepDescription = step === 1
    ? 'Nhập email đã đăng ký để nhận mã xác minh'
    : step === 2
      ? `Mã 6 chữ số đã được gửi đến ${email}`
      : step === 3
        ? 'Tạo mật khẩu mới cho tài khoản của bạn'
        : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Button
            mode="text"
            icon="arrow-left"
            onPress={() => {
              if (step === 1) navigation.goBack();
              else if (step === 2) animateStep(1);
              else if (step === 3) animateStep(2);
              else navigation.goBack();
            }}
            compact
            style={styles.backBtn}
          >
            {step === 1 ? 'Quay lại' : 'Bước trước'}
          </Button>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <StepIndicator current={step} total={STEP_COUNT} theme={theme} />

          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {step === 4 ? (
              <View style={styles.successContainer}>
                <View style={[styles.successIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={72}
                    color={theme.colors.primary}
                  />
                </View>
                <Text variant="headlineSmall" style={styles.successTitle}>
                  Đặt lại thành công!
                </Text>
                <Text variant="bodyMedium" style={styles.successDesc}>
                  Mật khẩu của bạn đã được thay đổi.{'\n'}Vui lòng đăng nhập với mật khẩu mới.
                </Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.goBack()}
                  contentStyle={styles.largeButton}
                  style={styles.successButton}
                >
                  Đăng nhập
                </Button>
              </View>
            ) : (
              <View style={styles.stepContainer}>
                <View style={styles.stepIconContainer}>
                  <MaterialCommunityIcons
                    name={
                      step === 1
                        ? 'email-outline'
                        : step === 2
                          ? 'shield-key-outline'
                          : 'lock-reset'
                    }
                    size={48}
                    color={theme.colors.primary}
                  />
                </View>

                <Text variant="headlineSmall" style={styles.stepTitle}>
                  {stepTitle}
                </Text>
                <Text variant="bodyMedium" style={styles.stepDescription}>
                  {stepDescription}
                </Text>

                {error ? (
                  <View style={[styles.messageBox, { backgroundColor: `${theme.colors.error}12` }]}>
                    <MaterialCommunityIcons name="alert-circle" size={18} color={theme.colors.error} />
                    <Text style={[styles.messageText, { color: theme.colors.error }]}>{error}</Text>
                  </View>
                ) : null}

                {success ? (
                  <View style={[styles.messageBox, { backgroundColor: `${theme.colors.primary}12` }]}>
                    <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.primary} />
                    <Text style={[styles.messageText, { color: theme.colors.primary }]}>{success}</Text>
                  </View>
                ) : null}

                <View style={styles.stepForm}>
                {step === 1 && (
                  <>
                    <TextInput
                      label="Email"
                      value={email}
                      onChangeText={setEmail}
                      mode="outlined"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      left={<TextInput.Icon icon="email" color={theme.colors.onSurfaceVariant} />}
                      style={styles.input}
                    />
                    <Button
                      mode="contained"
                      onPress={handleSendCode}
                      loading={loading}
                      disabled={loading}
                      contentStyle={styles.largeButton}
                      style={styles.primaryButton}
                    >
                      Gửi mã xác minh
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <CodeInput value={code} onChange={setCode} length={6} theme={theme} />
                    <Button
                      mode="contained"
                      onPress={handleVerifyCode}
                      loading={loading}
                      disabled={loading || code.length !== 6}
                      contentStyle={styles.largeButton}
                      style={styles.primaryButton}
                    >
                      Xác minh mã
                    </Button>
                    <Button
                      mode="text"
                      onPress={handleSendCode}
                      disabled={loading || resendCooldown > 0}
                      style={styles.resendBtn}
                    >
                      {resendCooldown > 0 ? `Gửi lại mã (${resendCooldown}s)` : 'Gửi lại mã'}
                    </Button>
                  </>
                )}

                {step === 3 && (
                  <>
                    <TextInput
                      label="Mật khẩu mới"
                      value={newPassword}
                      onChangeText={setNewPassword}
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
                      style={styles.input}
                    />
                    <TextInput
                      label="Xác nhận mật khẩu"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      mode="outlined"
                      secureTextEntry={!showPassword}
                      left={<TextInput.Icon icon="lock-check" color={theme.colors.onSurfaceVariant} />}
                      style={styles.input}
                    />
                    <Button
                      mode="contained"
                      onPress={handleResetPassword}
                      loading={loading}
                      disabled={loading}
                      contentStyle={styles.largeButton}
                      style={styles.primaryButton}
                    >
                      Đặt lại mật khẩu
                    </Button>
                  </>
                )}
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    header: {
      paddingHorizontal: 8,
    },
    backBtn: {
      alignSelf: 'flex-start',
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 40,
      gap: 8,
    },
    stepContainer: {
      alignItems: 'center',
      gap: 12,
    },
    stepForm: {
      width: '100%',
    },
    stepIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: `${theme.colors.primary}12`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    stepTitle: {
      fontWeight: '800',
      textAlign: 'center',
    },
    stepDescription: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: 8,
    },
    input: {
      marginBottom: 12,
    },
    primaryButton: {
      marginTop: 8,
    },
    largeButton: {
      minHeight: 52,
    },
    resendBtn: {
      marginTop: 4,
    },
    messageBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
    },
    messageText: {
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    successContainer: {
      alignItems: 'center',
      gap: 16,
      paddingTop: 40,
    },
    successIcon: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    successTitle: {
      fontWeight: '800',
      textAlign: 'center',
    },
    successDesc: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 22,
    },
    successButton: {
      marginTop: 16,
      minWidth: 200,
    },
  });
}
