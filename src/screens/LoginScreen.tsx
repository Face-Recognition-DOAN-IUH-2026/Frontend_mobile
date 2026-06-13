import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Surface, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { patronLogin } = useAuth();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!studentCode.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã sinh viên và mật khẩu');
      return;
    }

    setIsLoading(true);
    try {
      await patronLogin(studentCode.trim(), password);
    } catch (error: any) {
      console.log('Login error:', error);
      let message = 'Đăng nhập thất bại';
      if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.code === 'ECONNABORTED') {
        message = 'Kết nối quá lâu. Vui lòng thử lại.';
      } else if (!error.response) {
        message = 'Không thể kết nối server. Vui lòng kiểm tra mạng.';
      }
      Alert.alert('Lỗi', message);
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
        <View style={styles.content}>
          <View style={styles.brandSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>TV</Text>
            </View>
            <Text variant="displaySmall" style={styles.title}>
              Thư Viện
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Đăng nhập để tiếp tục
            </Text>
          </View>

          <Surface style={styles.form} elevation={0}>
            <View style={styles.formAccent} />
            <TextInput
              label="Mã sinh viên"
              value={studentCode}
              onChangeText={setStudentCode}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="account" color={colors.textSecondary} />}
              activeOutlineColor={colors.primary}
            />

            <TextInput
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="lock" color={colors.textSecondary} />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                  color={colors.textSecondary}
                />
              }
              activeOutlineColor={colors.primary}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Đăng nhập
            </Button>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text variant="bodySmall" style={styles.dividerText}>
                hoặc
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('FaceLogin')}
              style={styles.faceButton}
              contentStyle={styles.faceButtonContent}
              labelStyle={styles.faceButtonLabel}
              icon="face-recognition"
            >
              Đăng nhập bằng khuôn mặt
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              style={styles.registerButton}
              labelStyle={styles.registerLabel}
            >
              Chưa có tài khoản? Đăng ký ngay
            </Button>
          </Surface>
        </View>
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
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: colors.background,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 32,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 6,
  },
  form: {
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
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  inputOutline: {
    borderRadius: 6,
    borderColor: colors.border,
  },
  button: {
    marginTop: 8,
    borderRadius: 6,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    color: colors.textSecondary,
    marginHorizontal: 16,
    fontSize: 12,
  },
  faceButton: {
    borderColor: colors.primary,
    borderRadius: 6,
  },
  faceButtonContent: {
    paddingVertical: 8,
  },
  faceButtonLabel: {
    fontSize: 14,
  },
  registerButton: {
    marginTop: 16,
  },
  registerLabel: {
    fontSize: 13,
  },
});
