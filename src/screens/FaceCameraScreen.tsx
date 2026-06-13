import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Surface, ProgressBar, Avatar } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const ANGLES = ['frontal', 'right', 'left', 'down'] as const;
const ANGLE_LABELS: Record<string, string> = {
  frontal: 'Mặt thẳng',
  right: 'Quay phải',
  left: 'Quay trái',
  down: 'Cuối xuống',
};
const ANGLE_INSTRUCTIONS: Record<string, string> = {
  frontal: 'Nhìn thẳng vào camera',
  right: 'Từ từ quay đầu sang phải',
  left: 'Từ từ quay đầu sang trái',
  down: 'Cuối nhẹ đầu xuống',
};
const COUNTDOWN_SECONDS = 3;

interface FaceCameraScreenProps {
  navigation: any;
}

export default function FaceCameraScreen({ navigation }: FaceCameraScreenProps) {
  const { patron } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentAngle = ANGLES[currentAngleIndex];
  const progress = Object.keys(capturedPhotos).length / ANGLES.length;
  const allCaptured = Object.keys(capturedPhotos).length === ANGLES.length;

  const clearTimers = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (permission?.granted && !capturedPhotos[ANGLES[currentAngleIndex]]) {
      startCountdown();
    }
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [permission, currentAngleIndex, capturedPhotos]);

  const startCountdown = () => {
    clearTimers();
    setCountdown(COUNTDOWN_SECONDS);
    let count = COUNTDOWN_SECONDS;
    countdownRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearTimers();
        setCountdown(0);
        capturePhoto();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });
      if (photo?.base64) {
        setCapturedPhotos((prev) => ({
          ...prev,
          [currentAngle]: photo.base64!,
        }));
        if (currentAngleIndex < ANGLES.length - 1) {
          setIsAutoAdvancing(true);
          advanceTimerRef.current = setTimeout(() => {
            setIsAutoAdvancing(false);
            setCurrentAngleIndex((prev) => prev + 1);
          }, 800);
        }
      }
    } catch (error) {
      console.error('Capture error:', error);
    }
  };

  const retakeAngle = (angle: string) => {
    clearTimers();
    setCapturedPhotos((prev) => {
      const updated = { ...prev };
      delete updated[angle];
      return updated;
    });
    const idx = ANGLES.indexOf(angle as typeof ANGLES[number]);
    if (idx >= 0) setCurrentAngleIndex(idx);
  };

  const uploadAllPhotos = async () => {
    if (Object.keys(capturedPhotos).length !== ANGLES.length) {
      Alert.alert('Thiếu ảnh', 'Vui lòng chụp đủ 4 góc khuôn mặt');
      return;
    }

    if (!patron?.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin tài khoản');
      return;
    }

    setIsUploading(true);
    try {
      for (const angle of ANGLES) {
        const formData = new FormData();
        formData.append('image_data', capturedPhotos[angle]);
        formData.append('angle', angle);
        await api.post(`/patrons/${patron.id}/enroll-face`, formData);
      }
      Alert.alert('Thành công', 'Đăng ký khuôn mặt thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Đăng ký khuôn mặt thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!permission) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['bottom']}>
        <Text style={styles.permissionText}>Cần quyền camera để đăng ký khuôn mặt</Text>
        <Button mode="contained" onPress={requestPermission} style={styles.permissionButton}>
          Cấp quyền
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()} style={styles.backButton}>
          Quay lại
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.progressContainer}>
        <ProgressBar progress={progress} color={colors.primary} style={styles.progressBar} />
        <Text style={styles.progressText}>
          {Object.keys(capturedPhotos).length} / {ANGLES.length} góc
        </Text>
      </View>

      <View style={styles.angleTabs}>
        {ANGLES.map((angle, index) => (
          <View
            key={angle}
            style={[
              styles.angleTab,
              index === currentAngleIndex && !capturedPhotos[angle] && styles.angleTabActive,
              capturedPhotos[angle] && styles.angleTabDone,
            ]}
          >
            <Text
              style={[
                styles.angleTabText,
                index === currentAngleIndex && !capturedPhotos[angle] && styles.angleTabTextActive,
              ]}
            >
              {ANGLE_LABELS[angle]}
            </Text>
            {capturedPhotos[angle] && (
              <Avatar.Icon size={16} icon="check" style={styles.angleCheck} />
            )}
          </View>
        ))}
      </View>

      <CameraView ref={cameraRef} style={styles.camera} facing="front">
        <View style={styles.overlay}>
          <View style={styles.faceGuide}>
            <View style={[styles.guideCorner, styles.topLeft]} />
            <View style={[styles.guideCorner, styles.topRight]} />
            <View style={[styles.guideCorner, styles.bottomLeft]} />
            <View style={[styles.guideCorner, styles.bottomRight]} />
          </View>
          <Text style={styles.instruction}>
            {capturedPhotos[currentAngle]
              ? 'Đã chụp'
              : ANGLE_INSTRUCTIONS[currentAngle]}
          </Text>

          {countdown !== null && countdown > 0 && !capturedPhotos[currentAngle] && (
            <View style={styles.countdownOverlay}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}

          {allCaptured && (
            <Button
              mode="contained"
              onPress={uploadAllPhotos}
              loading={isUploading}
              disabled={isUploading}
              style={styles.submitOverlayButton}
              labelStyle={styles.submitOverlayLabel}
            >
              Hoàn tất
            </Button>
          )}
        </View>
      </CameraView>

      <Surface style={styles.controls} elevation={0}>
        <View style={styles.anglePreviewRow}>
          {ANGLES.map((angle) => (
            <View key={angle} style={styles.anglePreviewItem}>
              <View
                style={[
                  styles.anglePreviewDot,
                  capturedPhotos[angle]
                    ? styles.anglePreviewDone
                    : angle === currentAngle
                    ? styles.anglePreviewActive
                    : styles.anglePreviewPending,
                ]}
              />
              <Text
                style={[
                  styles.anglePreviewLabel,
                  angle === currentAngle && styles.anglePreviewLabelActive,
                ]}
                numberOfLines={1}
              >
                {ANGLE_LABELS[angle]}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.controlActions}>
          {allCaptured ? (
            <Button
              mode="contained"
              onPress={uploadAllPhotos}
              loading={isUploading}
              disabled={isUploading}
              style={styles.submitButton}
              labelStyle={styles.submitButtonLabel}
            >
              Hoàn tất
            </Button>
          ) : (
            <>
              <Button
                mode="outlined"
                onPress={() => retakeAngle(currentAngle)}
                style={styles.retakeButton}
                labelStyle={styles.retakeButtonLabel}
                disabled={!capturedPhotos[currentAngle] || isAutoAdvancing}
              >
                Chụp lại
              </Button>
              <Button
                mode="text"
                onPress={() => {
                  clearTimers();
                  navigation.goBack();
                }}
                textColor={colors.textSecondary}
                style={styles.cancelButton}
                labelStyle={styles.cancelButtonLabel}
              >
                Hủy
              </Button>
            </>
          )}
        </View>
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
  progressContainer: {
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceVariant,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  angleTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  angleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
    gap: 4,
  },
  angleTabActive: {
    backgroundColor: colors.primary,
  },
  angleTabDone: {
    backgroundColor: colors.success,
  },
  angleTabText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  angleTabTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  angleCheck: {
    backgroundColor: 'transparent',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
    marginTop: 20,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  countdownText: {
    color: colors.primary,
    fontSize: 72,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  submitOverlayButton: {
    marginTop: 24,
    borderRadius: 6,
  },
  submitOverlayLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  controls: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  anglePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  anglePreviewItem: {
    alignItems: 'center',
    gap: 4,
  },
  anglePreviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  anglePreviewPending: {
    backgroundColor: colors.border,
  },
  anglePreviewActive: {
    backgroundColor: colors.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  anglePreviewDone: {
    backgroundColor: colors.success,
  },
  anglePreviewLabel: {
    color: colors.textDisabled,
    fontSize: 9,
  },
  anglePreviewLabelActive: {
    color: colors.text,
    fontWeight: '600',
  },
  controlActions: {
    alignItems: 'center',
    gap: 6,
  },
  submitButton: {
    width: '100%',
    borderRadius: 6,
  },
  submitButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  retakeButton: {
    borderRadius: 6,
  },
  retakeButtonLabel: {
    fontSize: 13,
  },
  cancelButton: {
    marginTop: 2,
  },
  cancelButtonLabel: {
    fontSize: 13,
  },
});
