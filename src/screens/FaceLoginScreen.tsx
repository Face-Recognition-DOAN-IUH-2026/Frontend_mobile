import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Snackbar, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { AppTheme } from '../theme/DarkTheme';

interface FaceLoginScreenProps {
  navigation: any;
}

export default function FaceLoginScreen({ navigation }: FaceLoginScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState('');
  const cameraRef = useRef<CameraView>(null);
  const { faceLogin } = useAuth();

  const captureFace = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    setError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        await faceLogin(photo.uri);
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Đăng nhập thất bại';
      setError(message);
    } finally {
      setIsCapturing(false);
    }
  };

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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" />
      <View style={styles.overlay}>
        <View style={styles.faceGuide}>
          <View style={[styles.guideCorner, styles.topLeft]} />
          <View style={[styles.guideCorner, styles.topRight]} />
          <View style={[styles.guideCorner, styles.bottomLeft]} />
          <View style={[styles.guideCorner, styles.bottomRight]} />
        </View>
        <Text style={styles.instruction}>Đặt khuôn mặt trong khung hình và giữ yên</Text>
      </View>

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
  });
}
