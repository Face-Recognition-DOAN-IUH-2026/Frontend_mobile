import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { useAuth } from '../../../context/AuthContext';
import CameraFallback from '../../../components/CameraFallback';
import { NoticeSnackbar } from '../../../components/NoticeSnackbar';
import { AppTheme } from '../../../theme/DarkTheme';
import { useFaceLoginState } from '../../../hooks/useFaceLoginState';

interface FaceLoginScreenProps {
  navigation: any;
}

export default function FaceLoginScreen({ navigation }: FaceLoginScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { faceLogin, staffLogin } = useAuth();
  const cameraHeight = useRef(new Animated.Value(1)).current;

  const { faceAttemptCount, faceFailed, showPasswordForm, attemptFaceLogin, switchToPassword, resetFace } =
    useFaceLoginState(faceLogin);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const captureFace = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    setError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        const success = await attemptFaceLogin(photo.uri);
        if (success) {
          return;
        }
        if (!faceFailed && faceAttemptCount < 2) {
          setError('Không nhận diện được, thử lại');
        }
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Đăng nhập thất bại';
      setError(message);
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoginLoading(true);
    setError('');
    try {
      await staffLogin(email.trim(), password);
    } catch (err: any) {
      const message = err?.response?.data?.detail?.includes('Invalid')
        ? 'Email hoặc mật khẩu không đúng'
        : 'Đăng nhập thất bại, vui lòng thử lại';
      setError(message);
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (faceFailed) {
      Animated.spring(cameraHeight, {
        toValue: 0.4,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.spring(cameraHeight, {
        toValue: 1,
        useNativeDriver: false,
      }).start();
    }
  }, [faceFailed, cameraHeight]);

  if (!permission) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['bottom']}>
        <Card mode="outlined" style={styles.permissionCard}>
          <Card.Content style={styles.permissionContent}>
            <Text variant="titleLarge" style={styles.cardTitle}>Cần quyền camera</Text>
            <Text style={styles.mutedCenterText}>Cho phép camera để đăng nhập bằng khuôn mặt.</Text>
            <Button mode="contained" onPress={requestPermission} icon="camera">
              Cấp quyền
            </Button>
            <Button mode="text" onPress={() => navigation.goBack()}>
              Quay lại đăng nhập bằng mật khẩu
            </Button>
          </Card.Content>
        </Card>
      </SafeAreaView>
    );
  }

  if (cameraError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <CameraFallback
          message="Không thể khởi động camera"
          onRetry={() => setCameraError(false)}
          showManualInput
          manualLabel="Email"
          manualPlaceholder="Nhập email để đăng nhập..."
          onManualSubmit={(value) => {
            navigation.navigate('Login', { prefilledEmail: value });
          }}
          showPickImage={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Animated.View style={{ flex: cameraHeight, overflow: 'hidden' }}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          onMountError={() => setCameraError(true)}
        />
        <View style={styles.overlay}>
          <View style={[styles.faceGuide, faceFailed && styles.faceGuideSmall]}>
            <View style={[styles.guideCorner, styles.topLeft]} />
            <View style={[styles.guideCorner, styles.topRight]} />
            <View style={[styles.guideCorner, styles.bottomLeft]} />
            <View style={[styles.guideCorner, styles.bottomRight]} />
          </View>
          <Text style={styles.instruction}>
            {faceFailed ? 'Không nhận diện được khuôn mặt' : 'Đặt khuôn mặt trong khung hình và giữ yên'}
          </Text>
        </View>
      </Animated.View>

      {!faceFailed && (
        <Card mode="contained" style={styles.controls}>
          <Card.Content style={styles.controlsContent}>
            <Text style={styles.hint}>
              {isCapturing ? 'Đang xử lý...' : 'Nhấn nút để đăng nhập'}
            </Text>
            <Button
              mode="contained"
              onPress={captureFace}
              loading={isCapturing}
              disabled={isCapturing}
              contentStyle={styles.largeButton}
              icon="face-recognition"
            >
              Đăng nhập bằng khuôn mặt
            </Button>
            <Button mode="text" onPress={() => navigation.goBack()}>
              Quay lại đăng nhập bằng mật khẩu
            </Button>
          </Card.Content>
        </Card>
      )}

      {showPasswordForm && (
        <Card mode="contained" style={styles.passwordForm}>
          <Card.Content style={styles.passwordFormContent}>
            <Text style={styles.passwordFormTitle}>Đăng nhập bằng mật khẩu</Text>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
            />
            <Button
              mode="contained"
              onPress={handlePasswordLogin}
              loading={loginLoading}
              disabled={loginLoading}
              contentStyle={styles.largeButton}
            >
              Đăng nhập
            </Button>
            <Button mode="text" onPress={() => { resetFace(); navigation.goBack(); }}>
              Quay lại
            </Button>
          </Card.Content>
        </Card>
      )}

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
      position: 'relative',
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: theme.colors.background,
    },
    permissionCard: {
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    permissionContent: {
      alignItems: 'center',
      gap: 14,
      paddingVertical: 20,
    },
    cardTitle: {
      color: theme.colors.onSurface,
      fontWeight: '800',
    },
    mutedCenterText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    camera: {
      flex: 1,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 120,
    },
    faceGuide: {
      width: 220,
      height: 280,
      borderRadius: 120,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      position: 'relative',
    },
    faceGuideSmall: {
      width: 140,
      height: 180,
      borderRadius: 90,
    },
    guideCorner: {
      position: 'absolute',
      width: 42,
      height: 42,
      borderColor: theme.colors.secondary,
      borderWidth: 2,
    },
    topLeft: {
      top: -2,
      left: -2,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderTopLeftRadius: 110,
    },
    topRight: {
      top: -2,
      right: -2,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
      borderTopRightRadius: 110,
    },
    bottomLeft: {
      bottom: -2,
      left: -2,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomLeftRadius: 110,
    },
    bottomRight: {
      bottom: -2,
      right: -2,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderBottomRightRadius: 110,
    },
    instruction: {
      color: '#FFFFFF',
      marginTop: 24,
      fontSize: 16,
      textAlign: 'center',
      fontWeight: '700',
      paddingHorizontal: 24,
    },
    controls: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
    },
    controlsContent: {
      gap: 10,
    },
    hint: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    largeButton: {
      minHeight: 52,
    },
    passwordForm: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
    },
    passwordFormContent: {
      gap: 12,
    },
    passwordFormTitle: {
      color: theme.colors.onSurface,
      fontWeight: '800',
      textAlign: 'center',
      fontSize: 16,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.colors.onSurface,
      backgroundColor: theme.colors.surface,
      fontSize: 15,
    },
  });
}
