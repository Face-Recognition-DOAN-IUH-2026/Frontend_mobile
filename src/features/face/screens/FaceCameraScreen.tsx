import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AutoFaceCapture from '../../../components/AutoFaceCapture';
import CameraFallback from '../../../components/CameraFallback';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { GradientHeader } from '../../../theme/MobileDesignSystem';
import api from '../../../api/client';
import { waitForEnrollment } from '../../../api/enrollment';
import { blurScoreForBase64, isImageBlurry } from '../../../utils/faceQuality';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '../../../theme/DarkTheme';
import { devError } from '../../../utils/logger';
import {
  extractFailedAngles,
  mapEnrollError,
  buildAngleErrorMessage,
  FailedAngle,
} from '../../../utils/faceEnrollErrors';

interface FaceCameraScreenProps {
  navigation: any;
}

export default function FaceCameraScreen({ navigation }: FaceCameraScreenProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const { patron } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [failedAngles, setFailedAngles] = useState<FailedAngle[]>([]);

  const handleFilesReady = async (images: string[]) => {
    const patronId = patron?.id;
    if (!patronId || images.length !== 4) {
      Alert.alert('Lỗi', 'Chưa chụp đủ 4 góc khuôn mặt');
      return;
    }

    setFailedAngles([]);
    setIsUploading(true);
    try {
      // Kiểm tra độ mờ từng ảnh trước khi upload (góc frontal là bắt buộc check blur
      // theo quy tắc của worker). Tránh upload 4 ảnh rồi worker rollback toàn bộ
      // vì 1 góc lỗi MOTION_BLUR.
      const angleLabels: Record<number, string> = {
        0: 'Nhìn thẳng',
        1: 'Nghiêng phải',
        2: 'Nghiêng trái',
        3: 'Cúi xuống',
      };
      for (let i = 0; i < images.length; i++) {
        const score = await blurScoreForBase64(images[i]);
        if (isImageBlurry(score, 25)) {
          Alert.alert(
            'Ảnh quá mờ',
            `Góc ${angleLabels[i]} bị mờ hoặc thiếu sáng. Vui lòng giữ yên, ánh sáng tốt và chụp lại góc này.`,
            [{ text: 'OK' }],
          );
          setIsUploading(false);
          return;
        }
      }

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
      // Ưu tiên chi tiết từng góc từ worker (giống web), thay vì câu chung "N angle(s) failed"
      const rawResults =
        error?.angleResults ??
        error?.response?.data?.result?.results ??
        error?.response?.data?.results;
      const failed = extractFailedAngles(rawResults ? { results: rawResults } : error?.response?.data?.result);
      const fallback = mapEnrollError(
        error?.response?.data?.detail || error?.response?.data?.error || error?.message,
        'Đăng ký khuôn mặt thất bại',
      );
      const message =
        failed.length > 0
          ? `${buildAngleErrorMessage(failed, fallback)}\nCác góc đạt chuẩn đã được lưu tạm. Bạn chỉ cần chụp lại các góc chưa đạt để hoàn tất.`
          : fallback;
      setFailedAngles(failed);
      Alert.alert('Đăng ký chưa đạt', message);
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
            onCancel={() => navigation.goBack()}
            failedAngles={failedAngles}
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
