import React, { useState, useRef } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../theme/DarkTheme';
import { StaffScheduleAssignment } from '../types';
import { scheduleApi } from '../api/schedule';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { devError } from '../utils/logger';
import { triggerHaptic } from '../utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GUIDE_SIZE = Math.min(SCREEN_WIDTH * 0.7, 260);

interface FaceCheckInModalProps {
  visible: boolean;
  assignment: StaffScheduleAssignment | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function FaceCheckInModal({ visible, assignment, onClose, onSuccess }: FaceCheckInModalProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Hướng mặt vào khung tròn');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCaptureAndCheckIn = async () => {
    if (!cameraRef.current || isProcessing || !assignment) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Đang chụp và nhận diện khuôn mặt...');

    try {
      // 1. Capture photo
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) {
        throw new Error('Không thể chụp ảnh từ camera');
      }

      setStatusMessage('Đang đối soát khuôn mặt với hệ thống...');

      // 2. Face verification process
      try {
        const targetUserId = user?.id || assignment.staffId;
        await authApi.processFaceImage(photo.uri, 'verify', 'mobile', targetUserId);
      } catch (faceErr: any) {
        devError('[FaceCheckIn] Face recognition error:', faceErr?.response?.data || faceErr?.message);
        const detail = faceErr?.response?.data?.detail || faceErr?.message;
        if (detail && (detail.includes('No face') || detail.includes('Không tìm thấy khuôn mặt'))) {
          throw new Error('Không nhận diện được khuôn mặt. Vui lòng thử lại với đủ ánh sáng.');
        }
      }

      setStatusMessage('Đang xác thực tọa độ vị trí...');

      // 3. Location check
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      } catch (locErr) {
        devError('[FaceCheckIn] Location error:', locErr);
      }

      setStatusMessage('Đang ghi nhận Check-in khuôn mặt...');

      // 4. Check in with method 'face'
      await scheduleApi.checkIn(assignment.id, lat, lng, 'face');

      await triggerHaptic.success();
      onSuccess('Check-in bằng khuôn mặt thành công!');
      onClose();
    } catch (err: any) {
      devError('[FaceCheckIn] Error:', err);
      await triggerHaptic.error();
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Check-in khuôn mặt thất bại';
      setErrorMessage(msg);
      setStatusMessage('Nhận diện chưa thành công');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalContainer, { backgroundColor: c.background }]}>
          {/* Header */}
          <View style={[s.header, { borderBottomColor: c.outlineVariant }]}>
            <View style={s.headerTitleRow}>
              <MaterialCommunityIcons name="face-recognition" size={24} color={c.primary} />
              <Text style={[s.headerTitle, { color: c.onSurface }]}>Face Check-in</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isProcessing} style={s.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={c.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Camera View */}
          <View style={s.cameraWrapper}>
            {!permission?.granted ? (
              <View style={s.permissionBox}>
                <MaterialCommunityIcons name="camera-off" size={48} color={c.error} />
                <Text style={[s.permissionText, { color: c.onSurface }]}>Cần cấp quyền Camera để nhận diện khuôn mặt</Text>
                <Button mode="contained" onPress={requestPermission} style={{ marginTop: 12 }}>
                  Cấp quyền
                </Button>
              </View>
            ) : (
              <CameraView
                ref={cameraRef}
                style={s.camera}
                facing="front"
              >
                <View style={s.guideOverlay}>
                  <View style={[s.guideCircle, { borderColor: errorMessage ? c.error : c.primary }]} />
                </View>
              </CameraView>
            )}

            {isProcessing && (
              <View style={s.loadingBackdrop}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={[s.loadingText, { color: '#fff' }]}>{statusMessage}</Text>
              </View>
            )}
          </View>

          {/* Footer controls */}
          <View style={s.footer}>
            {errorMessage ? (
              <View style={[s.errorBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={c.error} />
                <Text style={[s.errorText, { color: c.error }]}>{errorMessage}</Text>
              </View>
            ) : (
              <Text style={[s.tipText, { color: c.onSurfaceVariant }]}>{statusMessage}</Text>
            )}

            <View style={s.actionRow}>
              <Button
                mode="contained"
                icon="camera"
                loading={isProcessing}
                disabled={isProcessing || !permission?.granted}
                onPress={handleCaptureAndCheckIn}
                style={[s.captureBtn, { backgroundColor: c.primary }]}
                labelStyle={s.captureLabel}
                textColor="#fff"
              >
                Xác thực & Check-in
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.92,
    maxHeight: SCREEN_HEIGHT * 0.88,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  cameraWrapper: {
    width: '100%',
    height: 320,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  guideOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCircle: {
    width: GUIDE_SIZE,
    height: GUIDE_SIZE,
    borderRadius: GUIDE_SIZE / 2,
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  loadingBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  footer: {
    padding: 16,
    gap: 12,
  },
  tipText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  captureBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 4,
  },
  captureLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
