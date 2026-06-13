import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Surface } from 'react-native-paper';
import AutoFaceCapture from '../components/AutoFaceCapture';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface FaceCameraScreenProps {
  navigation: any;
}

export default function FaceCameraScreen({ navigation }: FaceCameraScreenProps) {
  const { patron } = useAuth();
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCapture = (base64Image: string) => {
    setCapturedPhoto(base64Image);
  };

  const handleError = (error: string) => {
    Alert.alert('Lỗi', error);
  };

  const uploadPhoto = async () => {
    if (!capturedPhoto || !patron?.id) {
      Alert.alert('Lỗi', 'Không tìm thấy ảnh hoặc thông tin tài khoản');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: `data:image/jpeg;base64,${capturedPhoto}`,
        type: 'image/jpeg',
        name: 'face.jpg',
      } as any);

      const response = await api.post(`/kiosk/enroll-face/${patron.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success || response.status === 200) {
        Alert.alert('Thành công', 'Đăng ký khuôn mặt thành công!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'Đăng ký khuôn mặt thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setIsUploading(false);
    }
  };

  const retake = () => {
    setCapturedPhoto(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {capturedPhoto ? (
          <View style={styles.previewContainer}>
            <View style={styles.photoPreview}>
              <Text style={styles.previewText}>Đã chụp 1 ảnh khuôn mặt</Text>
            </View>

            <Surface style={styles.actions} elevation={0}>
              <Button
                mode="contained"
                onPress={uploadPhoto}
                loading={isUploading}
                disabled={isUploading}
                style={styles.uploadButton}
                labelStyle={styles.uploadButtonLabel}
              >
                Đăng ký khuôn mặt
              </Button>

              <Button
                mode="outlined"
                onPress={retake}
                style={styles.retakeButton}
                labelStyle={styles.retakeButtonLabel}
                disabled={isUploading}
              >
                Chụp lại
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                textColor={colors.textSecondary}
                disabled={isUploading}
              >
                Hủy
              </Button>
            </Surface>
          </View>
        ) : (
          <View style={styles.captureContainer}>
            <AutoFaceCapture
              onCapture={handleCapture}
              onError={handleError}
            />

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Đặt mặt vào khung Oval. Hệ thống sẽ tự động chụp khi nhận diện khuôn mặt ổn định.
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
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
    width: 200,
    height: 260,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.success,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  previewText: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actions: {
    width: '100%',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  uploadButton: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  uploadButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 6,
  },
  retakeButton: {
    width: '100%',
    borderRadius: 8,
    borderColor: colors.primary,
  },
  retakeButtonLabel: {
    fontSize: 14,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});