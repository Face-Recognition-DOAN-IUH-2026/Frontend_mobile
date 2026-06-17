import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 0.62;

export interface ScannedCardData {
  studentCode: string;
  fullName: string;
  className: string | null;
  dateOfBirth: string | null;
  course: string | null;
  permanentAddress: string | null;
  faculty: string | null;
  rawText: string;
}

interface StudentCardScannerProps {
  onScanned: (data: ScannedCardData) => void;
  onError?: (error: string) => void;
  onSkip?: () => void;
}

const SURNAMES = [
  'nguyễn', 'trần', 'lê', 'phạm', 'huỳnh', 'hoàng', 'phan',
  'vũ', 'võ', 'đặng', 'bùi', 'đỗ', 'hồ', 'ngô', 'dương', 'lý',
  'cao', 'đinh', 'tạ', 'châu', 'mai', 'tô', 'hà', 'vương',
];

const HEADER_KEYWORDS = [
  'bộ công thương', 'trường đại học công nghiệp', 'thẻ sinh viên',
  'trường đại học', 'đại học công nghiệp', 'thành phố hồ chí minh',
  'student card', 'student id', 'the sinh vien', 'cong thuong',
  'sinh viên', 'ngày sinh', 'khóa học', 'hktt',
  'hộ khẩu', 'khoa', 'lớp', 'ngành', 'msv', 'mssv',
];

function parseCardText(text: string): Partial<ScannedCardData> {
  const result: Partial<ScannedCardData> = { rawText: text };
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const studentCodeRegex = /(?:MSSV|Mã SV|Mã Số SV|Student Code|Mã số sinh viên|MSV)[:\s]*(\S{4,})/i;
  const fullNameRegex = /(?:Họ\s*và\s*tên|Full Name|Họ tên|HỌ TÊN|HỌ VÀ TÊN)[:\s]*([A-ZÀ-ỸĂÂĐÊÔƠƯ][A-ZÀ-ỸĂÂĐÊÔƠƯa-zà-ỹăâđêôơưừếệấ]+(?:\s+[A-ZÀ-ỸĂÂĐÊÔƠƯ][A-ZÀ-ỸĂÂĐÊÔƠƯa-zà-ỹăâđêôơưừếệấ]+)+)/i;
  const classNameRegex = /(?:Lớp|Class|LỚP)[:\s]*(\S+)/i;
  const dobRegex = /(?:Ngày sinh|DOB|Birth|Ngày tháng năm sinh|NGÀY SINH|Sinh)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i;
  const courseRegex = /(?:Khóa\s*h[oọô]c|Course|Khóa|KHÓA)[:\s]*(.+)/i;
  const addressRegex = /(?:HKTT|Hộ khẩu|Địa chỉ|Address|Hộ khẩu thường trú)[:\s]*(.+)/i;
  const facultyRegex = /(?:Khoa|Faculty|Department|KHOA)[:\s]*(.+)/i;

  for (const line of lines) {
    if (!result.studentCode) {
      const m = line.match(studentCodeRegex);
      if (m) result.studentCode = m[1].replace(/[^A-Za-z0-9]/g, '');
    }
    if (!result.fullName) {
      const m = line.match(fullNameRegex);
      if (m) result.fullName = m[1].trim();
    }
    if (!result.className) {
      const m = line.match(classNameRegex);
      if (m) result.className = m[1].trim();
    }
    if (!result.dateOfBirth) {
      const m = line.match(dobRegex);
      if (m) result.dateOfBirth = m[1].trim();
    }
    if (!result.course) {
      const m = line.match(courseRegex);
      if (m) result.course = m[1].trim();
    }
    if (!result.permanentAddress) {
      const m = line.match(addressRegex);
      if (m) result.permanentAddress = m[1].trim();
    }
    if (!result.faculty) {
      const m = line.match(facultyRegex);
      if (m) result.faculty = m[1].trim();
    }
  }

  if (!result.studentCode) {
    const strictMatch = text.match(/\b(\d{8})\b/);
    if (strictMatch) {
      result.studentCode = strictMatch[1];
    } else {
      const looseMatch = text.match(/\b(\d{7,13})\b/);
      if (looseMatch) result.studentCode = looseMatch[1];
    }
  }

  if (!result.fullName) {
    const candidateLines = lines.filter((line) => {
      const lower = line.toLowerCase();
      if (HEADER_KEYWORDS.some((k) => lower.includes(k))) return false;
      if (/^\d+$/.test(line.trim())) return false;
      if (line.trim().length < 5) return false;
      if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(line.trim())) return false;
      return true;
    });

    const nameBySurname = candidateLines.find((l) => {
      const lower = l.toLowerCase().trim();
      return SURNAMES.some(
        (s) => lower.startsWith(s) || lower.startsWith(`${s} `),
      );
    });
    if (nameBySurname) {
      result.fullName = nameBySurname.replace(/^[\d:\s]+/, '').trim();
    }

    if (!result.fullName) {
      const nameByCase = candidateLines.find((l) => {
        const words = l.trim().split(/\s+/);
        if (words.length < 2 || words.length > 6) return false;
        if (!/^[A-ZÀ-ỸĂÂĐÊÔƠƯ]/.test(l.trim())) return false;
        if (/^[A-Z0-9]{4,}$/.test(words[0])) return false;
        return true;
      });
      if (nameByCase) {
        result.fullName = nameByCase.replace(/^[\d:\s]+/, '').trim();
      }
    }
  }

  if (!result.course) {
    const yearMatch = text.match(/\b(20\d{2}\s*[-–]\s*20\d{2})\b/);
    if (yearMatch) result.course = yearMatch[1];
  }

  if (!result.course) {
    const khoaMatch = text.match(/Khóa\s+(\d{4}(?:\s*[-–]\s*\d{4})?)/i);
    if (khoaMatch) result.course = khoaMatch[1];
  }

  if (!result.className) {
    const classMatch = text.match(/\b(DH[A-Z]{2,}\d{2,}[A-Z]?)\b/i);
    if (classMatch) result.className = classMatch[1].toUpperCase();
  }

  return result;
}

export default function StudentCardScanner({ onScanned, onError, onSkip }: StudentCardScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<'detecting' | 'capturing' | 'processing' | 'confirm'>('detecting');
  const isMounted = useRef(true);
  const phaseRef = useRef(phase);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ocrResult, setOcrResult] = useState<Partial<ScannedCardData> | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    };
  }, []);

  const runOcrAndParse = useCallback(async (photoUri: string): Promise<Partial<ScannedCardData> | null> => {
    try {
      const result = await TextRecognition.recognize(photoUri);
      if (!result?.text) return null;
      return parseCardText(result.text);
    } catch (err: any) {
      onError?.('Lỗi nhận dạng văn bản: ' + (err.message || ''));
      return null;
    }
  }, [onError]);

  const attemptAutoDetect = useCallback(async () => {
    if (!cameraRef.current || !isMounted.current || phaseRef.current !== 'detecting') return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true, quality: 0.3, skipProcessing: true,
      });
      if (!photo?.uri || !isMounted.current) return;

      const tempPath = `${FileSystem.cacheDirectory}card_detect_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: photo.uri, to: tempPath });

      const result = await TextRecognition.recognize(tempPath);
      await FileSystem.deleteAsync(tempPath, { idempotent: true });

      if (!isMounted.current) return;

      if (result?.text && result.text.length > 30) {
        setPhase('capturing');
        await new Promise((r) => setTimeout(r, 600));
        if (!isMounted.current) return;

        const finalPhoto = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.9, skipProcessing: true,
        });
        if (!finalPhoto?.uri) return;
        setPhase('processing');

        const finalPath = `${FileSystem.cacheDirectory}card_final_${Date.now()}.jpg`;
        await FileSystem.moveAsync({ from: finalPhoto.uri, to: finalPath });

        const parsed = await runOcrAndParse(finalPath);
        await FileSystem.deleteAsync(finalPath, { idempotent: true });

        if (parsed && isMounted.current) {
          setOcrResult(parsed);
          setPhase('confirm');
          return;
        }
      }
    } catch {
      // Auto-detect attempt failed, will retry
    }
    if (isMounted.current && phaseRef.current === 'detecting') {
      detectTimerRef.current = setTimeout(attemptAutoDetect, 2500);
    }
  }, [runOcrAndParse]);

  const startDetection = useCallback(() => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    detectTimerRef.current = setTimeout(attemptAutoDetect, 1000);
  }, [attemptAutoDetect]);

  useEffect(() => {
    if (permission?.granted) {
      startDetection();
    }
    return () => {
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    };
  }, [permission?.granted, startDetection]);

  const handleManualCapture = async () => {
    if (!cameraRef.current) return;
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    setPhase('capturing');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true, quality: 0.9, skipProcessing: true,
      });
      if (!photo?.uri) return;
      setPhase('processing');
      const parsed = await runOcrAndParse(photo.uri);
      if (parsed && isMounted.current) {
        setOcrResult(parsed);
        setPhase('confirm');
      } else {
        onError?.('Không thể đọc thông tin từ ảnh, vui lòng thử lại');
        setPhase('detecting');
        startDetection();
      }
    } catch {
      setPhase('detecting');
      startDetection();
    }
  };

  const handleConfirm = () => {
    if (!ocrResult?.studentCode || !ocrResult?.fullName) {
      onError?.('Thiếu thông tin bắt buộc (MSSV, Họ tên). Vui lòng thử lại.');
      return;
    }
    onScanned({
      studentCode: ocrResult.studentCode!,
      fullName: ocrResult.fullName!,
      className: ocrResult.className || null,
      dateOfBirth: ocrResult.dateOfBirth || null,
      course: ocrResult.course || null,
      permanentAddress: ocrResult.permanentAddress || null,
      faculty: ocrResult.faculty || null,
      rawText: ocrResult.rawText || '',
    });
  };

  const handleRetake = () => {
    setOcrResult(null);
    setPhase('detecting');
    startDetection();
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.msgText}>Đang tải camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <MaterialCommunityIcons name="camera-off" size={48} color={colors.textSecondary} />
          <Text style={styles.msgText}>Cần quyền camera để quét thẻ</Text>
          <Button mode="contained" onPress={requestPermission} style={styles.permissionBtn}>
            Cấp quyền
          </Button>
          {onSkip && (
            <Button mode="text" onPress={onSkip}>
              Nhập thủ công
            </Button>
          )}
        </View>
      </View>
    );
  }

  if (phase === 'confirm' && ocrResult) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmBox}>
          <View style={styles.checkIconWrap}>
            <MaterialCommunityIcons name="check-circle" size={56} color={colors.success} />
          </View>
          <Text style={styles.confirmTitle}>Đọc thẻ thành công</Text>
          <Text style={styles.confirmSubtitle}>Vui lòng kiểm tra lại thông tin</Text>

          <View style={styles.fieldList}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>MSSV</Text>
              <Text style={styles.fieldValue}>{ocrResult.studentCode || '-'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Họ tên</Text>
              <Text style={styles.fieldValue}>{ocrResult.fullName || '-'}</Text>
            </View>
            {ocrResult.className ? (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Lớp</Text>
                <Text style={styles.fieldValue}>{ocrResult.className}</Text>
              </View>
            ) : null}
            {ocrResult.course ? (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Khóa học</Text>
                <Text style={styles.fieldValue}>{ocrResult.course}</Text>
              </View>
            ) : null}
            {ocrResult.permanentAddress ? (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>HKTT</Text>
                <Text style={styles.fieldValue}>{ocrResult.permanentAddress}</Text>
              </View>
            ) : null}
            {ocrResult.dateOfBirth ? (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Ngày sinh</Text>
                <Text style={styles.fieldValue}>{ocrResult.dateOfBirth}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.confirmActions}>
            <Button mode="contained" onPress={handleConfirm} style={styles.confirmBtn}>
              Xác nhận
            </Button>
            <Button mode="outlined" onPress={handleRetake} style={styles.retakeBtn}>
              Chụp lại
            </Button>
            {onSkip && (
              <Button mode="text" onPress={onSkip}>
                Nhập thủ công
              </Button>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <View style={styles.overlay}>
        <View style={styles.cardFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {phase === 'detecting' && (
          <View style={styles.statusBadge}>
            <ActivityIndicator size={20} color={colors.primary} />
            <Text style={styles.statusText}>Đang phát hiện thẻ...</Text>
          </View>
        )}
        {phase === 'capturing' && (
          <View style={styles.statusBadge}>
            <MaterialCommunityIcons name="camera" size={20} color={colors.warning} />
            <Text style={styles.statusText}>Đang chụp...</Text>
          </View>
        )}
        {phase === 'processing' && (
          <View style={styles.statusBadge}>
            <ActivityIndicator size={20} color={colors.primary} />
            <Text style={styles.statusText}>Đang xử lý ảnh...</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.hintText}>Đặt thẻ sinh viên vào khung hình</Text>
        <TouchableOpacity style={styles.captureBtn} onPress={handleManualCapture} activeOpacity={0.7}>
          <MaterialCommunityIcons name="camera" size={28} color={colors.background} />
        </TouchableOpacity>
        {onSkip && (
          <Button mode="text" onPress={onSkip} compact>
            Nhập thủ công
          </Button>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_WIDTH = 3;
const FRAME_BORDER_RADIUS = 12;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
  },
  msgText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  permissionBtn: {
    marginTop: 8,
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFrame: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: FRAME_BORDER_RADIUS,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: -CORNER_WIDTH,
    left: -CORNER_WIDTH,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: FRAME_BORDER_RADIUS + 4,
  },
  cornerTR: {
    top: -CORNER_WIDTH,
    right: -CORNER_WIDTH,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: FRAME_BORDER_RADIUS + 4,
  },
  cornerBL: {
    bottom: -CORNER_WIDTH,
    left: -CORNER_WIDTH,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: FRAME_BORDER_RADIUS + 4,
  },
  cornerBR: {
    bottom: -CORNER_WIDTH,
    right: -CORNER_WIDTH,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: FRAME_BORDER_RADIUS + 4,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(13, 17, 23, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    position: 'absolute',
    top: '40%',
  },
  statusText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
  },
  captureBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmBox: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  checkIconWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  confirmSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  fieldList: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    width: 80,
  },
  fieldValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  confirmActions: {
    gap: 10,
  },
  confirmBtn: {
    borderRadius: 10,
    backgroundColor: colors.success,
    paddingVertical: 4,
  },
  retakeBtn: {
    borderRadius: 10,
    borderColor: colors.border,
  },
});
