import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
} from "react-native";
import { Text, Button, ProgressBar, ActivityIndicator, useTheme } from "react-native-paper";
import { CameraView, useCameraPermissions } from "expo-camera";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  FaceDetectionProvider,
  useFacesInPhoto,
} from "@infinitered/react-native-mlkit-face-detection";
import type { RNMLKitFace } from "@infinitered/react-native-mlkit-face-detection";
import { AppTheme } from "../theme/DarkTheme";
import { MotionHaptics } from "../theme/motion";
import { assessPose } from "../utils/facePose";

interface AutoFaceCaptureProps {
  onFilesReady: (images: string[]) => Promise<void> | void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  /** Các góc worker báo lỗi (để viền đỏ + badge lý do ở màn xem lại) */
  failedAngles?: { id: string; label: string; error: string | null }[];
}

interface Angle {
  id: "frontal" | "right" | "left" | "down";
  label: string;
  instruction: string;
  tip: string;
  icon: string;
}

const ANGLES: Angle[] = [
  {
    id: "frontal",
    label: "Chính diện",
    instruction: "Nhìn thẳng vào camera",
    tip: "Giữ mặt thẳng, mắt mở tự nhiên",
    icon: "face-recognition",
  },
  {
    id: "right",
    label: "Nghiêng phải",
    instruction: "Xoay đầu sang phải",
    tip: "Xoay khoảng 30 độ, giữ vai yên",
    icon: "rotate-right",
  },
  {
    id: "left",
    label: "Nghiêng trái",
    instruction: "Xoay đầu sang trái",
    tip: "Xoay khoảng 30 độ, giữ vai yên",
    icon: "rotate-left",
  },
  {
    id: "down",
    label: "Cúi nhẹ",
    instruction: "Cúi nhẹ cằm xuống",
    tip: "Mắt vẫn hướng vào camera",
    icon: "chevron-down",
  },
];

const COUNTDOWN = 3;
const DIM = "rgba(0,0,0,0.62)";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const OVAL_W = Math.min(SCREEN_WIDTH * 0.7, 300);
const OVAL_H = OVAL_W * 1.34;

function AutoFaceCaptureInner({
  onFilesReady,
  onError,
  onCancel,
  failedAngles = [],
}: AutoFaceCaptureProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const [permission, requestPermission] = useCameraPermissions();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: "#000" },
        lightContainer: { flex: 1, backgroundColor: c.background },
        centerBox: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        },
        msgText: {
          color: c.onSurface,
          fontSize: 16,
          textAlign: "center",
          marginTop: 12,
        },
        msgSub: {
          color: c.onSurfaceVariant,
          fontSize: 14,
          textAlign: "center",
          marginTop: 6,
        },
        // ---- Top bar + steps ----
        topBar: {
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: 10,
          backgroundColor: "#000",
        },
        topRow: {
          flexDirection: "row",
          alignItems: "center",
        },
        closeBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.14)",
          alignItems: "center",
          justifyContent: "center",
        },
        topCenter: { flex: 1, alignItems: "center" },
        stepText: {
          color: "rgba(255,255,255,0.65)",
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1.5,
          textTransform: "uppercase",
        },
        topTitle: {
          color: "#fff",
          fontSize: 18,
          fontWeight: "800",
          marginTop: 2,
        },
        segments: {
          flexDirection: "row",
          gap: 6,
          marginTop: 12,
        },
        segment: {
          flex: 1,
          height: 4,
          borderRadius: 2,
          backgroundColor: "rgba(255,255,255,0.22)",
        },
        // ---- Camera + oval mask ----
        cameraArea: { flex: 1, backgroundColor: "#000" },
        camera: { ...StyleSheet.absoluteFill },
        maskFill: { ...StyleSheet.absoluteFill },
        maskCenterRow: {
          flexDirection: "row",
          height: OVAL_H,
        },
        maskSide: { flex: 1, backgroundColor: DIM },
        maskTopBottom: { flex: 1, backgroundColor: DIM },
        ovalHole: { width: OVAL_W, height: OVAL_H },
        ovalCenter: {
          ...StyleSheet.absoluteFill,
          alignItems: "center",
          justifyContent: "center",
        },
        ovalBorder: {
          width: OVAL_W,
          height: OVAL_H,
          borderRadius: OVAL_W / 2,
          borderWidth: 3,
        },
        ovalClip: {
          width: OVAL_W,
          height: OVAL_H,
          borderRadius: OVAL_W / 2,
          overflow: "hidden",
        },
        scanLine: {
          marginHorizontal: 14,
          height: 3,
          borderRadius: 2,
          backgroundColor: "#fff",
          shadowColor: "#fff",
          shadowOpacity: 0.9,
          shadowRadius: 8,
          elevation: 4,
        },
        ghostIcon: { opacity: 0.28 },
        successBadge: {
          width: 68,
          height: 68,
          borderRadius: 34,
          backgroundColor: c.custom.success,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 6,
        },
        successPill: {
          marginTop: 12,
          backgroundColor: "rgba(0,0,0,0.72)",
          borderColor: c.custom.success,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 20,
        },
        successPillText: {
          color: "#fff",
          fontSize: 13,
          fontWeight: "700",
        },
        // ---- Bottom sheet ----
        sheet: {
          backgroundColor: c.background,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 20,
        },
        sheetRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        },
        angleIconWrap: {
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: "center",
          justifyContent: "center",
        },
        sheetTexts: { flex: 1 },
        sheetTitle: {
          color: c.onSurface,
          fontSize: 17,
          fontWeight: "800",
        },
        sheetTip: {
          color: c.onSurfaceVariant,
          fontSize: 13,
          marginTop: 2,
        },
        countNum: {
          fontSize: 40,
          fontWeight: "900",
          color: c.primary,
          minWidth: 56,
          textAlign: "center",
        },
        sheetProgress: {
          height: 6,
          borderRadius: 3,
          marginTop: 14,
          backgroundColor: c.surfaceVariant,
        },
        sheetFooter: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
        },
        sheetHint: {
          color: c.onSurfaceVariant,
          fontSize: 12,
          flex: 1,
        },
        // ---- Start screen ----
        startScroll: { flex: 1, backgroundColor: c.background },
        startInner: { padding: 24, alignItems: "center" },
        ovalMock: {
          width: 190,
          height: 250,
          borderRadius: 95,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: c.primary,
          backgroundColor: c.primary + "12",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 8,
        },
        mockPill: {
          position: "absolute",
          bottom: -14,
          backgroundColor: c.primary,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 16,
        },
        mockPillText: { color: "#fff", fontSize: 12, fontWeight: "800" },
        startTitle: {
          color: c.onSurface,
          fontSize: 22,
          fontWeight: "800",
          marginTop: 28,
          textAlign: "center",
        },
        startDesc: {
          color: c.onSurfaceVariant,
          fontSize: 14,
          textAlign: "center",
          marginTop: 6,
          lineHeight: 20,
        },
        stepsCard: {
          width: "100%",
          backgroundColor: c.surfaceVariant,
          borderRadius: 16,
          padding: 8,
          marginTop: 20,
        },
        stepRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 10,
        },
        stepNum: {
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        stepNumText: { fontSize: 14, fontWeight: "800" },
        stepTexts: { flex: 1 },
        stepLabel: { color: c.onSurface, fontSize: 15, fontWeight: "700" },
        stepInstr: { color: c.onSurfaceVariant, fontSize: 12, marginTop: 1 },
        tipsCard: {
          width: "100%",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.outlineVariant,
          padding: 14,
          marginTop: 14,
        },
        tipsTitle: {
          color: c.primary,
          fontSize: 13,
          fontWeight: "800",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        tipRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 4,
        },
        tipRowText: { color: c.onSurfaceVariant, fontSize: 13, flex: 1 },
        consentRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 14,
          backgroundColor: c.surfaceVariant,
          borderRadius: 12,
          marginTop: 14,
          width: "100%",
        },
        checkbox: {
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: c.outlineVariant,
          alignItems: "center",
          justifyContent: "center",
        },
        checkboxChecked: {
          backgroundColor: c.primary,
          borderColor: c.primary,
        },
        consentText: {
          color: c.onSurfaceVariant,
          fontSize: 13,
          flex: 1,
          lineHeight: 18,
        },
        cta: {
          width: "100%",
          borderRadius: 12,
          marginTop: 18,
          paddingVertical: 5,
        },
        ctaLabel: { fontSize: 16, fontWeight: "800" },
        // ---- Review screen ----
        reviewScroll: { flex: 1, backgroundColor: c.background },
        reviewInner: { padding: 20 },
        reviewTitle: {
          color: c.onSurface,
          fontSize: 20,
          fontWeight: "800",
          textAlign: "center",
        },
        reviewSub: {
          color: c.onSurfaceVariant,
          fontSize: 13,
          textAlign: "center",
          marginTop: 4,
          marginBottom: 16,
        },
        reviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
        reviewCard: {
          width: "48%",
          flexGrow: 1,
          borderRadius: 14,
          overflow: "hidden",
          borderWidth: 2,
          borderColor: c.custom.success,
          backgroundColor: "#000",
        },
        reviewImg: { width: "100%", aspectRatio: 3 / 4 },
        reviewBadge: {
          position: "absolute",
          top: 8,
          left: 8,
          backgroundColor: "rgba(0,0,0,0.72)",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
        },
        reviewBadgeText: {
          color: "#fff",
          fontSize: 11,
          fontWeight: "800",
        },
        reviewErrorBadge: {
          top: 34,
          backgroundColor: c.error,
        },
        retakeOverlay: {
          position: "absolute",
          bottom: 8,
          right: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: "rgba(0,0,0,0.72)",
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 12,
        },
        retakeOverlayText: {
          color: "#fff",
          fontSize: 11,
          fontWeight: "700",
        },
        noteCard: {
          flexDirection: "row",
          gap: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.outlineVariant,
          padding: 12,
          marginTop: 16,
          alignItems: "center",
        },
        noteText: { color: c.onSurfaceVariant, fontSize: 12, flex: 1, lineHeight: 17 },
      }),
    [c],
  );

  const cameraRef = useRef<CameraView>(null);
  const [captured, setCaptured] = useState<(string | null)[]>([null, null, null, null]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [countdownVal, setCountdownVal] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [consent, setConsent] = useState(false);
  const capturedRef = useRef<(string | null)[]>([null, null, null, null]);
  const idxRef = useRef(-1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poseRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const pendingBase64Ref = useRef<string | null>(null);
  const commitCaptureRef = useRef<(base64: string, idx: number) => void>(() => {});
  const cancelledRef = useRef(false);
  // Pose-gate: verify tư thế bằng ML Kit trước khi chấp nhận ảnh
  const [verifyUri, setVerifyUri] = useState<string | null>(null);
  const [poseFeedback, setPoseFeedback] = useState<string | null>(null);
  const { faces, status: faceStatus } = useFacesInPhoto(verifyUri ?? undefined);
  const verifying = verifyUri !== null;
  const MAX_POSE_ATTEMPTS = 3;
  /**
   * Camera trước lật ảnh selfie nên dấu Euler Y của ML Kit bị đảo so với
   * hướng quay thực của người dùng. Nhân -1 để khớp ngưỡng image-space
   * trong utils/facePose. Đã kiểm chứng: góc chính diện (đối xứng) luôn
   * qua, còn nghiêng trái/phải không bao giờ qua trước khi đảo dấu.
   */
  const MIRROR_YAW = -1;
  // Debug overlay: hiện Y/X/attempt để kiểm chứng thực tế trên máy
  const [poseDebug, setPoseDebug] = useState<string | null>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (poseRetryRef.current) clearTimeout(poseRetryRef.current);
    };
  }, []);

  const clearVerifyState = useCallback(() => {
    if (poseRetryRef.current) clearTimeout(poseRetryRef.current);
    poseRetryRef.current = null;
    pendingBase64Ref.current = null;
    attemptRef.current = 0;
    setVerifyUri(null);
    setPoseFeedback(null);
    setPoseDebug(null);
  }, []);

  useEffect(() => {
    if (!isRunning || countdownVal === null) return;
    scanAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isRunning, countdownVal, currentIdx, scanAnim]);

  const scanY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, OVAL_H - 14],
  });

  // Chụp lại 1 frame để verify tư thế (dùng khi sai hướng, không đếm ngược lại)
  const snapForVerify = useCallback(async () => {
    if (!cameraRef.current || cancelledRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.9,
        skipProcessing: true,
      });
      if (cancelledRef.current) return;
      if (!photo?.base64 || !photo?.uri) {
        onError?.('Không thể chụp ảnh');
        return;
      }
      pendingBase64Ref.current = photo.base64;
      setVerifyUri(photo.uri);
    } catch {
      onError?.('Lỗi khi chụp ảnh');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onError]);

  const retryPoseAttempt = useCallback(
    (hint: string) => {
      attemptRef.current += 1;
      if (attemptRef.current >= MAX_POSE_ATTEMPTS) {
        // Quá nhiều lần sai: chấp nhận ảnh cuối để backend chấm (tránh kẹt vô hạn)
        const fallback = pendingBase64Ref.current;
        clearVerifyState();
        if (fallback) commitCaptureRef.current(fallback, idxRef.current);
        return;
      }
      setPoseFeedback(`${hint} — giữ yên để chụp lại (lần ${attemptRef.current}/${MAX_POSE_ATTEMPTS})...`);
      if (poseRetryRef.current) clearTimeout(poseRetryRef.current);
      poseRetryRef.current = setTimeout(() => {
        snapForVerify();
      }, 1200);
    },
    [clearVerifyState, snapForVerify],
  );

  // Xử lý kết quả detect ML Kit cho frame vừa chụp
  useEffect(() => {
    if (!verifyUri) return;
    // Chờ detect xong (done) hoặc lỗi hẳn (error); các trạng thái giữa thì bỏ qua
    if (faceStatus !== 'done' && faceStatus !== 'error') return;
    const base64 = pendingBase64Ref.current;
    if (!base64) {
      clearVerifyState();
      return;
    }
    const idx = idxRef.current;
    if (faceStatus === 'error' || !faces || faces.length === 0) {
      if (faceStatus === 'error') {
        // Detector lỗi: rớt về hành vi cũ (chấp nhận ảnh)
        clearVerifyState();
        commitCaptureRef.current(base64, idx);
        return;
      }
      retryPoseAttempt('Không thấy khuôn mặt trong khung hình');
      return;
    }
    if (faces.length > 1) {
      retryPoseAttempt('Chỉ giữ 1 khuôn mặt trong khung hình');
      return;
    }
    const face: RNMLKitFace = faces[0];
    const rawY = face.headEulerAngleY ?? null;
    const rawX = face.headEulerAngleX ?? null;
    setPoseDebug(
      `Y:${rawY === null ? '-' : rawY.toFixed(0)} X:${rawX === null ? '-' : rawX.toFixed(0)} · lần ${attemptRef.current + 1}/${MAX_POSE_ATTEMPTS}`,
    );
    const verdict = assessPose(
      rawY === null ? null : rawY * MIRROR_YAW,
      rawX,
      ANGLES[idx].id,
    );
    if (verdict.ok) {
      clearVerifyState();
      MotionHaptics.success();
      commitCaptureRef.current(base64, idx);
    } else {
      retryPoseAttempt(verdict.hint);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyUri, faceStatus, faces]);

  const runCountdown = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= ANGLES.length) return;
      if (timerRef.current) clearInterval(timerRef.current);
      idxRef.current = idx;
      let n = COUNTDOWN;
      setCountdownVal(n);
      timerRef.current = setInterval(async () => {
        n--;
        if (cancelledRef.current) {
          clearInterval(timerRef.current!);
          return;
        }
        if (n <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setCountdownVal(null);
          if (!cameraRef.current) return;
          try {
            const photo = await cameraRef.current.takePictureAsync({
              base64: true,
              quality: 0.9,
              skipProcessing: true,
            });
            if (cancelledRef.current) return;
            if (!photo?.base64 || !photo?.uri) {
              onError?.("Không thể chụp ảnh");
              return;
            }
            // Pose-gate: verify tư thế bằng ML Kit trước khi chấp nhận ảnh
            pendingBase64Ref.current = photo.base64;
            attemptRef.current = 0;
            setPoseFeedback("Đang kiểm tra tư thế...");
            setVerifyUri(photo.uri);
          } catch {
            onError?.("Lỗi khi chụp ảnh");
          }
        } else {
          setCountdownVal(n);
        }
      }, 1000);
    },
    [onError],
  );

  const commitCapture = useCallback(
    (base64: string, idx: number) => {
      MotionHaptics.success();
      const slots = [...capturedRef.current];
      slots[idx] = base64;
      capturedRef.current = slots;
      setCaptured([...slots]);
      // Góc tiếp theo = ô trống đầu tiên (chụp lại 1 góc không xóa các góc đã đạt)
      const nextIdx = slots.findIndex((v) => v === null);
      if (nextIdx === -1) {
        setIsRunning(false);
        setCurrentIdx(-1);
      } else {
        setTimeout(() => {
          if (!cancelledRef.current) {
            setCurrentIdx(nextIdx);
            runCountdown(nextIdx);
          }
        }, 900);
      }
    },
    [runCountdown],
  );
  commitCaptureRef.current = commitCapture;

  const resetCaptures = useCallback(() => {
    const empty: (string | null)[] = [null, null, null, null];
    capturedRef.current = empty;
    setCaptured([...empty]);
  }, []);

  const startSequence = useCallback(() => {
    if (!consent) return;
    MotionHaptics.tap();
    clearVerifyState();
    resetCaptures();
    cancelledRef.current = false;
    setIsRunning(true);
    setCurrentIdx(0);
    runCountdown(0);
  }, [runCountdown, consent, clearVerifyState, resetCaptures]);

  const cancelSequence = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    clearVerifyState();
    resetCaptures();
    setIsRunning(false);
    setCurrentIdx(-1);
    setCountdownVal(null);
    cancelledRef.current = false;
  }, [clearVerifyState, resetCaptures]);

  const retakeAngle = useCallback(
    (idx: number) => {
      MotionHaptics.tap();
      clearVerifyState();
      // Chỉ xóa đúng ô góc đó, giữ nguyên các góc đã đạt
      const slots = [...capturedRef.current];
      slots[idx] = null;
      capturedRef.current = slots;
      setCaptured([...slots]);
      cancelledRef.current = false;
      setIsRunning(true);
      setCurrentIdx(idx);
      runCountdown(idx);
    },
    [runCountdown, clearVerifyState],
  );

  const retakeAll = useCallback(() => {
    MotionHaptics.tap();
    clearVerifyState();
    resetCaptures();
    cancelledRef.current = false;
    setIsRunning(true);
    setCurrentIdx(0);
    runCountdown(0);
  }, [runCountdown, clearVerifyState, resetCaptures]);

  const allCaptured = captured.every((v) => v !== null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!allCaptured || isSubmitting) return;
    MotionHaptics.tap();
    setIsSubmitting(true);
    try {
      const images = captured.filter((v): v is string => v !== null);
      if (images.length !== ANGLES.length) return;
      await onFilesReady(images);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.lightContainer}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={styles.msgText}>Đang tải camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.lightContainer}>
        <View style={styles.centerBox}>
          <View style={[styles.angleIconWrap, { backgroundColor: c.error + "18" }]}>
            <MaterialCommunityIcons name="camera-off" size={30} color={c.error} />
          </View>
          <Text style={styles.msgText}>Cần quyền camera để chụp khuôn mặt</Text>
          <Text style={styles.msgSub}>Ứng dụng dùng camera để xác thực danh tính tại cổng thư viện</Text>
          <Button
            mode="contained"
            onPress={() => requestPermission()}
            style={[styles.cta, { marginTop: 20 }]}
            labelStyle={styles.ctaLabel}
            icon="camera"
          >
            Cấp quyền camera
          </Button>
        </View>
      </View>
    );
  }

  if (allCaptured) {
    return (
      <ScrollView style={styles.reviewScroll} contentContainerStyle={styles.reviewInner}>
        <Text style={styles.reviewTitle}>Xem lại ảnh đã chụp</Text>
        <Text style={styles.reviewSub}>
          {failedAngles.length > 0
            ? 'Các góc viền đỏ chưa đạt yêu cầu, chạm "Chụp lại" để chụp riêng góc đó'
            : 'Chạm vào nút chụp lại nếu ảnh chưa rõ nét'}
        </Text>
        <View style={styles.reviewGrid}>
          {ANGLES.map((a, i) => {
            const failed = failedAngles.find((f) => f.id === a.id);
            return (
            <View key={a.id} style={[styles.reviewCard, failed && { borderColor: c.error }]}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${captured[i] ?? ''}` }}
                style={styles.reviewImg}
                resizeMode="cover"
              />
              <View style={styles.reviewBadge}>
                <Text style={styles.reviewBadgeText}>{a.label}</Text>
              </View>
              {failed ? (
                <View style={[styles.reviewBadge, styles.reviewErrorBadge]}>
                  <Text style={styles.reviewBadgeText}>Lỗi, cần chụp lại</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={styles.retakeOverlay}
                activeOpacity={0.7}
                onPress={() => retakeAngle(i)}
              >
                <MaterialCommunityIcons name="refresh" size={14} color="#fff" />
                <Text style={styles.retakeOverlayText}>Chụp lại</Text>
              </TouchableOpacity>
            </View>
            );
          })}
        </View>
        <View style={styles.noteCard}>
          <MaterialCommunityIcons name="shield-check" size={20} color={c.custom.success} />
          <Text style={styles.noteText}>
            Ảnh được mã hóa và chỉ dùng để nhận diện tại cổng thư viện.
          </Text>
        </View>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={isSubmitting}
          loading={isSubmitting}
          style={styles.cta}
          labelStyle={styles.ctaLabel}
          icon="check"
        >
          Xác nhận và hoàn tất
        </Button>
        <Button
          mode="outlined"
          onPress={retakeAll}
          style={[styles.cta, { marginTop: 10 }]}
          labelStyle={styles.ctaLabel}
          icon="camera-retake"
        >
          Chụp lại tất cả
        </Button>
      </ScrollView>
    );
  }

  if (!isRunning && currentIdx < 0) {
    return (
      <ScrollView style={styles.startScroll} contentContainerStyle={styles.startInner}>
        <View style={styles.ovalMock}>
          <MaterialCommunityIcons name="face-recognition" size={64} color={c.primary} />
          <View style={styles.mockPill}>
            <Text style={styles.mockPillText}>4 góc chụp</Text>
          </View>
        </View>
        <Text style={styles.startTitle}>Xác thực khuôn mặt</Text>
        <Text style={styles.startDesc}>
          Đưa khuôn mặt vào khung oval và làm theo hướng dẫn từng bước để đăng nhập nhanh tại cổng
        </Text>
        <View style={styles.stepsCard}>
          {ANGLES.map((a, i) => (
            <View key={a.id} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: c.primary + "1A" }]}>
                <Text style={[styles.stepNumText, { color: c.primary }]}>{i + 1}</Text>
              </View>
              <View style={styles.stepTexts}>
                <Text style={styles.stepLabel}>{a.label}</Text>
                <Text style={styles.stepInstr}>{a.instruction}</Text>
              </View>
              <MaterialCommunityIcons name={a.icon as never} size={22} color={c.onSurfaceVariant} />
            </View>
          ))}
        </View>
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Lưu ý khi chụp</Text>
          <View style={styles.tipRow}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={c.primary} />
            <Text style={styles.tipRowText}>Nơi đủ sáng, tránh ngược sáng</Text>
          </View>
          <View style={styles.tipRow}>
            <MaterialCommunityIcons name="cellphone" size={18} color={c.primary} />
            <Text style={styles.tipRowText}>Giữ điện thoại ngang tầm mắt</Text>
          </View>
          <View style={styles.tipRow}>
            <MaterialCommunityIcons name="glasses" size={18} color={c.primary} />
            <Text style={styles.tipRowText}>Tháo kính râm và khẩu trang</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.consentRow}
          activeOpacity={0.7}
          onPress={() => setConsent(!consent)}
        >
          <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
            {consent ? (
              <MaterialCommunityIcons name="check" size={14} color="#fff" />
            ) : null}
          </View>
          <Text style={styles.consentText}>
            Tôi đồng ý cho hệ thống xử lý dữ liệu khuôn mặt để nhận diện tại cổng thư viện
          </Text>
        </TouchableOpacity>
        <Button
          mode="contained"
          onPress={startSequence}
          disabled={!consent}
          style={styles.cta}
          labelStyle={styles.ctaLabel}
          icon="camera"
        >
          Bắt đầu xác thực
        </Button>
      </ScrollView>
    );
  }

  const activeAngle = ANGLES[Math.max(0, currentIdx)];
  const isCounting = countdownVal !== null;
  const showSuccess = isRunning && !isCounting;
  const ovalColor = showSuccess
    ? c.custom.success
    : isCounting
      ? c.primary
      : "rgba(255,255,255,0.85)";
  const progress = isCounting ? (COUNTDOWN - countdownVal) / COUNTDOWN : showSuccess ? 1 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          {onCancel ? (
            <TouchableOpacity style={styles.closeBtn} onPress={onCancel} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.closeBtn} />
          )}
          <View style={styles.topCenter}>
            <Text style={styles.stepText}>
              Bước {Math.min(currentIdx + 1, ANGLES.length)} / {ANGLES.length}
            </Text>
            <Text style={styles.topTitle}>{activeAngle.instruction}</Text>
          </View>
          <View style={styles.closeBtn} />
        </View>
        <View style={styles.segments}>
          {ANGLES.map((a, i) => (
            <View
              key={a.id}
              style={[
                styles.segment,
                i < captured.length && captured[i] !== null && { backgroundColor: c.custom.success },
                i === currentIdx && { backgroundColor: c.primary },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.cameraArea}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.maskFill} pointerEvents="none">
          <View style={styles.maskTopBottom} />
          <View style={styles.maskCenterRow}>
            <View style={styles.maskSide} />
            <View style={styles.ovalHole} />
            <View style={styles.maskSide} />
          </View>
          <View style={styles.maskTopBottom} />
        </View>
        <View style={styles.ovalCenter} pointerEvents="none">
          <View style={[styles.ovalBorder, { borderColor: ovalColor }]} />
        </View>
        {poseDebug ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 10,
              bottom: 10,
              backgroundColor: 'rgba(0,0,0,0.65)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'monospace' }}>{poseDebug}</Text>
          </View>
        ) : null}
        <View style={styles.ovalCenter} pointerEvents="none">
          <View style={styles.ovalClip}>
            {!isCounting && !showSuccess ? (
              <View style={[styles.ovalClip, { alignItems: "center", justifyContent: "center" }]}>
                <MaterialCommunityIcons
                  name="face-recognition"
                  size={76}
                  color="#fff"
                  style={styles.ghostIcon}
                />
              </View>
            ) : null}
            {isCounting ? (
              <Animated.View style={{ transform: [{ translateY: scanY }] }}>
                <View style={styles.scanLine} />
              </Animated.View>
            ) : null}
            {showSuccess ? (
              <View style={[styles.ovalClip, { alignItems: "center", justifyContent: "center" }]}>
                <View style={styles.successBadge}>
                  <MaterialCommunityIcons name="check" size={36} color="#fff" />
                </View>
                <View style={styles.successPill}>
                  <Text style={styles.successPillText}>Hoàn tất góc chụp</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetRow}>
          <View style={[styles.angleIconWrap, { backgroundColor: c.primary + "18" }]}>
            <MaterialCommunityIcons
              name={activeAngle.icon as never}
              size={26}
              color={c.primary}
            />
          </View>
          <View style={styles.sheetTexts}>
            <Text style={styles.sheetTitle}>{activeAngle.label}</Text>
            <Text style={styles.sheetTip}>{activeAngle.tip}</Text>
          </View>
          {showSuccess ? (
            <MaterialCommunityIcons name="check-circle" size={40} color={c.custom.success} />
          ) : (
            <Text style={styles.countNum}>{isCounting ? countdownVal : ""}</Text>
          )}
        </View>
        <ProgressBar
          progress={progress}
          color={showSuccess ? c.custom.success : c.primary}
          style={styles.sheetProgress}
        />
        <View style={styles.sheetFooter}>
          <Text style={styles.sheetHint}>
            {verifying
              ? poseFeedback ?? 'Đang kiểm tra tư thế...'
              : showSuccess
                ? 'Đang chuyển sang góc tiếp theo...'
                : 'Giữ yên điện thoại khi đếm ngược'}
          </Text>
          <Button mode="text" compact onPress={cancelSequence} textColor={c.error}>
            Hủy
          </Button>
        </View>
      </View>
    </View>
  );
}

export default function AutoFaceCapture(props: AutoFaceCaptureProps) {
  return (
    <FaceDetectionProvider>
      <AutoFaceCaptureInner {...props} />
    </FaceDetectionProvider>
  );
}
