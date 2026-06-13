import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { CameraView, useCameraPermissions, FaceDetectionResult } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const OVAL_WIDTH = SCREEN_WIDTH * 0.7;
const OVAL_HEIGHT = OVAL_WIDTH * 1.3;
const COUNTDOWN_SECONDS = 3;
const FACE_STABLE_THRESHOLD = 1500;

interface AutoFaceCaptureProps {
  onCapture: (base64Image: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

type CaptureState = 'waiting' | 'ready' | 'countdown' | 'captured' | 'error';

export default function AutoFaceCapture({
  onCapture,
  onError,
  disabled = false,
}: AutoFaceCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<CaptureState>('waiting');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [faceBounds, setFaceBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceStableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFaceTimeRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (faceStableTimerRef.current) {
      clearTimeout(faceStableTimerRef.current);
      faceStableTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const handleFacesDetected = useCallback(({ faces }: FaceDetectionResult) => {
    if (disabled || state === 'captured' || state === 'countdown') return;

    if (faces.length === 1) {
      const face = faces[0];
      const bounds = face.bounds;

      const centerX = bounds.origin.x + bounds.size.width / 2;
      const centerY = bounds.origin.y + bounds.size.height / 2;

      const ovalCenterX = SCREEN_WIDTH / 2;
      const ovalCenterY = 200;

      const distanceX = Math.abs(centerX - ovalCenterX) / (OVAL_WIDTH / 2);
      const distanceY = Math.abs(centerY - ovalCenterY) / (OVAL_HEIGHT / 2);
      const isInsideOval = distanceX < 0.8 && distanceY < 0.8;

      if (isInsideOval && bounds.size.width > 80) {
        setFaceBounds({
          x: bounds.origin.x,
          y: bounds.origin.y,
          width: bounds.size.width,
          height: bounds.size.height,
        });

        const now = Date.now();
        if (now - lastFaceTimeRef.current > FACE_STABLE_THRESHOLD) {
          startCountdown();
        }
        lastFaceTimeRef.current = now;
      } else {
        setFaceBounds(null);
        if (state !== 'waiting') {
          clearTimers();
          setState('waiting');
          setCountdown(null);
        }
      }
    } else {
      setFaceBounds(null);
      if (state !== 'waiting') {
        clearTimers();
        setState('waiting');
        setCountdown(null);
      }
    }
  }, [disabled, state, clearTimers]);

  const startCountdown = () => {
    if (state === 'countdown' || state === 'captured') return;

    clearTimers();
    setState('countdown');
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
        quality: 0.9,
        skipProcessing: true,
      });

      if (photo?.base64) {
        setState('captured');
        onCapture(photo.base64);
      } else {
        setState('error');
        onError?.('Không thể chụp ảnh');
      }
    } catch (error: any) {
      console.error('Capture error:', error);
      setState('error');
      onError?.(error?.message || 'Lỗi khi chụp ảnh');
    }
  };

  const resetCapture = () => {
    clearTimers();
    setState('waiting');
    setCountdown(null);
    setFaceBounds(null);
    lastFaceTimeRef.current = 0;
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>Đang tải camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>Cần quyền camera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.none,
          minDetectionInterval: 100,
          tracking: true,
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.ovalContainer}>
            <View style={styles.ovalFrame}>
              {state === 'waiting' && (
                <Text style={styles.guideText}>Đặt mặt vào khung</Text>
              )}
              {state === 'ready' && (
                <Text style={styles.guideText}>Giữ nguyên...</Text>
              )}
            </View>

            {faceBounds && state !== 'captured' && (
              <View
                style={[
                  styles.faceOutline,
                  {
                    left: faceBounds.x,
                    top: faceBounds.y,
                    width: faceBounds.width,
                    height: faceBounds.height,
                  },
                ]}
              />
            )}
          </View>

          {state === 'countdown' && countdown !== null && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}

          {state === 'captured' && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>✓</Text>
            </View>
          )}

          <Text style={styles.hintText}>
            {state === 'waiting' && 'Nhìn thẳng vào camera'}
            {state === 'ready' && 'Đang ổn định...'}
            {state === 'countdown' && 'Giữ nguyên tư thế!'}
            {state === 'captured' && 'Đã chụp thành công'}
            {state === 'error' && 'Có lỗi xảy ra'}
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  ovalContainer: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovalFrame: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_HEIGHT / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  faceOutline: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.success,
    borderRadius: 8,
  },
  countdownContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  countdownText: {
    color: colors.primary,
    fontSize: 96,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  successContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  successText: {
    color: colors.success,
    fontSize: 72,
  },
  hintText: {
    position: 'absolute',
    bottom: 60,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  messageText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});