import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Surface } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface FaceLoginScreenProps {
  navigation: any;
}

export default function FaceLoginScreen({ navigation }: FaceLoginScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { faceLogin } = useAuth();

  const captureFace = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo?.uri) {
        await faceLogin(photo.uri);
      }
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Đăng nhập thất bại';
      Alert.alert('Lỗi', message);
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
        <Text style={styles.permissionText}>Cần quyền camera để đăng nhập bằng khuôn mặt</Text>
        <Button mode="contained" onPress={requestPermission} style={styles.permissionButton}>
          Cấp quyền
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()} style={styles.backButton}>
          Quay lại đăng nhập bằng mật khẩu
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
      >
        <View style={styles.overlay}>
          <View style={styles.faceGuide}>
            <View style={[styles.guideCorner, styles.topLeft]} />
            <View style={[styles.guideCorner, styles.topRight]} />
            <View style={[styles.guideCorner, styles.bottomLeft]} />
            <View style={[styles.guideCorner, styles.bottomRight]} />
          </View>
          <Text style={styles.instruction}>
            Đặt khuôn mặt trong khung hình và giữ yên
          </Text>
        </View>
      </CameraView>

      <Surface style={styles.controls} elevation={0}>
        <Text style={styles.hint}>
          {isCapturing ? 'Đang xử lý...' : 'Nhấn nút để đăng nhập'}
        </Text>
        <Button
          mode="contained"
          onPress={captureFace}
          loading={isCapturing}
          disabled={isCapturing}
          style={styles.captureButton}
          contentStyle={styles.captureButtonContent}
          labelStyle={styles.captureButtonLabel}
          icon="face-recognition"
        >
          Đăng nhập bằng khuôn mặt
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          textColor={colors.textSecondary}
          style={styles.backLink}
          labelStyle={styles.backLinkLabel}
        >
          Quay lại đăng nhập bằng mật khẩu
        </Button>
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  permissionText: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionButton: {
    borderRadius: 6,
  },
  backButton: {
    marginTop: 16,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: colors.primary,
    position: 'relative',
  },
  guideCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.secondary,
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
    color: colors.text,
    marginTop: 24,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  controls: {
    padding: 24,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  hint: {
    color: colors.textSecondary,
    marginBottom: 16,
    fontSize: 14,
  },
  captureButton: {
    width: '100%',
    marginBottom: 8,
    borderRadius: 6,
  },
  captureButtonContent: {
    paddingVertical: 10,
  },
  captureButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  backLink: {
    marginTop: 4,
  },
  backLinkLabel: {
    fontSize: 13,
  },
});
