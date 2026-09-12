import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AutoFaceCapture from '../../../components/AutoFaceCapture';
import CameraFallback from '../../../components/CameraFallback';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { GradientHeader } from '../../../theme/MobileDesignSystem';
import api from '../../../api/client';
import { waitForEnrollment } from '../../../api/enrollment';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '../../../theme/DarkTheme';
import { devError } from '../../../utils/logger';

interface FaceCameraScreenProps {
  navigation: any;
}

export default function FaceCameraScreen({ navigation }: FaceCameraScreenProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const { patron } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleFilesReady = async (images: string[]) => {
    const patronId = patron?.id;
    if (!patronId || images.length !== 4) {
      Alert.alert('Lỗi', 'Chưa chụp đủ 4 góc khuôn mặt');
      return;
    }

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

      const { data } = await api.post(`/patrons/${patronId}/enroll-batch`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 130000,
      });

      await waitForEnrollment(data.job_id);
      Alert.alert('Thành công', 'Đăng ký khuôn mặt thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      devError('[FaceCamera] enroll error:', error?.response?.data || error?.message || error);
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Đăng ký khuôn mặt thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['bottom']}>
      <GradientHeader title="Đăng ký khuôn mặt" icon="face-recognition" />
      <View style={{ flex: 1 }}>
        {cameraError ? (
          <CameraFallback
            message={cameraError}
            onRetry={() => setCameraError(null)}
            showManualInput={false}
            showPickImage={false}
          />
        ) : (
          <AutoFaceCapture
            onFilesReady={handleFilesReady}
            onError={(msg) => setCameraError(msg)}
          />
        )}
        {isUploading ? (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}>
            <LoadingOverlay loading message="Đang đăng ký khuôn mặt..." />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
