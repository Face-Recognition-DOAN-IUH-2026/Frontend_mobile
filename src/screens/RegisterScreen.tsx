import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Surface, ProgressBar, Avatar } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '../api/client';
import { authApi } from '../api/auth';
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

interface RegisterScreenProps {
  navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [step, setStep] = useState<'form' | 'face'>('form');
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
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
    if (step === 'face' && permission?.granted && !capturedPhotos[ANGLES[currentAngleIndex]]) {
      startCountdown();
    }
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [step, permission, currentAngleIndex, capturedPhotos]);

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

  const validateForm = () => {
    if (!studentCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã sinh viên');
      return false;
    }
    if (studentCode.length < 4) {
      Alert.alert('Lỗi', 'Mã sinh viên phải có ít nhất 4 ký tự');
      return false;
    }
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
      return false;
    }
    if (!password) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return false;
    }
    return true;
  };

  const handleContinueToFace = () => {
    if (validateForm()) {
      setStep('face');
    }
  };

  const handleRegister = async () => {
    if (Object.keys(capturedPhotos).length !== ANGLES.length) {
      Alert.alert('Thiếu ảnh', 'Vui lòng chụp đủ 4 góc khuôn mặt');
      return;
    }

    setIsUploading(true);
    try {
      const registerResponse = await authApi.patronRegister({
        student_code: studentCode.trim(),
        password: password,
        full_name: fullName.trim(),
        class_name: className.trim() || undefined,
      });

      const { patron } = registerResponse;

      for (const angle of ANGLES) {
        const formData = new FormData();
        formData.append('image_data', capturedPhotos[angle]);
        formData.append('angle', angle);
        await api.post(`/patrons/${patron.id}/enroll-face`, formData);
      }

      Alert.alert('Thành công', 'Đăng ký tài khoản thành công!', [
        { text: 'Đăng nhập ngay', onPress: () => navigation.replace('Login') },
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Đăng ký thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setIsUploading(false);
    }
  };

  if (step === 'face') {
    if (!permission) {
      return <SafeAreaView style={styles.container} />;
    }

    if (!permission.granted) {
      return (
        <SafeAreaView style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Cần quyền camera để đăng ký khuôn mặt</Text>
          <Button mode="contained" onPress={requestPermission} style={styles.permissionButton}>
            Cấp quyền
          </Button>
          <Button mode="text" onPress={() => setStep('form')} style={styles.backButton}>
            Quay lại
          </Button>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
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
                onPress={handleRegister}
                loading={isUploading}
                disabled={isUploading}
                style={styles.submitOverlayButton}
                labelStyle={styles.submitOverlayLabel}
              >
                Hoàn tất đăng ký
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
                onPress={handleRegister}
                loading={isUploading}
                disabled={isUploading}
                style={styles.submitButton}
                labelStyle={styles.submitButtonLabel}
              >
                Hoàn tất đăng ký
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
                    setStep('form');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.formContainer} elevation={0}>
          <View style={styles.formAccent} />
          <Text style={styles.formTitle}>Đăng ký tài khoản</Text>
          <Text style={styles.formSubtitle}>Nhập thông tin để đăng ký tài khoản mới</Text>

          <TextInput
            label="Mã sinh viên"
            value={studentCode}
            onChangeText={setStudentCode}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            autoCapitalize="none"
            left={<TextInput.Icon icon="account" color={colors.textSecondary} />}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Họ và tên"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="account-outline" color={colors.textSecondary} />}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Lớp (không bắt buộc)"
            value={className}
            onChangeText={setClassName}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="school" color={colors.textSecondary} />}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            secureTextEntry
            left={<TextInput.Icon icon="lock" color={colors.textSecondary} />}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Xác nhận mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            secureTextEntry
            left={<TextInput.Icon icon="lock-check" color={colors.textSecondary} />}
            activeOutlineColor={colors.primary}
          />

          <Button
            mode="contained"
            onPress={handleContinueToFace}
            style={styles.continueButton}
            contentStyle={styles.continueButtonContent}
            labelStyle={styles.continueButtonLabel}
          >
            Tiếp tục đăng ký khuôn mặt
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            textColor={colors.textSecondary}
            style={styles.loginLink}
            labelStyle={styles.loginLinkLabel}
          >
            Đã có tài khoản? Đăng nhập
          </Button>
        </Surface>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
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
  formContainer: {
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
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  inputOutline: {
    borderRadius: 6,
    borderColor: colors.border,
  },
  continueButton: {
    marginTop: 8,
    borderRadius: 6,
  },
  continueButtonContent: {
    paddingVertical: 10,
  },
  continueButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  loginLink: {
    marginTop: 16,
  },
  loginLinkLabel: {
    fontSize: 13,
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
