import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Animated, TextInput as RNTextInput, ScrollView } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
const TextInputEdit = RNTextInput as any;
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as SecureStore from 'expo-secure-store';
import { AppTheme } from '../theme/DarkTheme';
import { API_BASE_URL } from '../config/api';
import api from '../api/client';
import { useRadarAnimation } from '../hooks/useRadarAnimation';

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

/**
 * Client-side regex fallback — never block registration when backend is unreachable.
 * Mirrors Backend/ai-service/src/routes/card-parser.ts:regexFallbackParse
 */
function clientFallbackParse(rawText: string): Partial<ScannedCardData> {
  const text = rawText || '';
  let studentCode = '';
  const mssvMatch =
    text.match(/(?:MSSV|MSV|Mã\s*(?:số)?\s*(?:SV|sinh\s*viên)|Ma\s*so\s*SV|Student\s*(?:ID|Code)|ID)\s*[:\-]?\s*(\d{7,13})/i) ||
    text.match(/\b(\d{8,13})\b/);
  if (mssvMatch) studentCode = mssvMatch[1].replace(/[^\d]/g, '');

  let fullName = '';
  const nameMatch =
    text.match(/Họ\s*và\s*tên\s*[:\-]?\s*([A-Za-zÀ-ỹ\s]+)/i) ||
    text.match(/Ho\s*va\s*ten\s*[:\-]?\s*([A-Za-zÀ-ỹ\s]+)/i) ||
    text.match(/Họ\s*tên\s*[:\-]?\s*([A-Za-zÀ-ỹ\s]+)/i) ||
    text.match(/(?:Tên|Ten)\s*[:\-]?\s*([A-Za-zÀ-ỹ\s]{4,40})/i);
  if (nameMatch) {
    const candidate = nameMatch[1].split('\n')[0].trim().split(/Lớp|Class|MSSV|MSV|Mã|Ngày|Khoa|HKTT|Course/i)[0].trim();
    if (candidate.length >= 2 && candidate.length < 50 && !/^\d+$/.test(candidate) && candidate.split(/\s+/).length >= 2) {
      fullName = candidate.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }
  let className: string | null = null;
  const classMatch = text.match(/(?:Lớp|Class)\s*[:\-]?\s*([A-Z0-9\-_.]+)/i);
  if (classMatch) className = classMatch[1].trim().replace(/[.,;]+$/, '');
  let dateOfBirth: string | null = null;
  const dobMatch = text.match(/(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})/);
  if (dobMatch) dateOfBirth = dobMatch[1].replace(/[\-.]/g, '/');
  let course: string | null = null;
  // Prefer explicit "Khoa hoc: 2022 - 2026" from raw text
  const courseRangeMatch = text.match(/(?:Khóa\s*học|Khoa\s*hoc|Khóa học|Khóa|Course)\s*[:\-]?\s*(\d{4}\s*[–-]\s*\d{4})/i);
  if (courseRangeMatch) {
    course = courseRangeMatch[1].replace(/\s+/g, ' ').trim().replace(/\s*[–-]\s*/, ' - ');
  } else {
    const singleYearMatch = text.match(/(?:Khóa\s*học|Khoa\s*hoc|Khóa|Course)\s*[:\-]?\s*(\d{4})/i);
    if (singleYearMatch) course = singleYearMatch[1];
    else if (className) {
      const k = className.match(/K(\d+)/i) || className.match(/\-(\d+)/);
      if (k) course = k[1];
    }
  }
  let faculty: string | null = null;
  const facMatch = text.match(/Khoa\s*[:\-]?\s*([A-Za-zÀ-ỹ\s]+)/i);
  if (facMatch) {
    const f = facMatch[1].split('\n')[0].trim().split(/HKTT|Lớp|MSSV|MSV|Mã|Ngày/i)[0].trim();
    if (f.length >= 2) faculty = f.substring(0, 80);
  }
  let permanentAddress: string | null = null;
  const addrMatch = text.match(/HKTT\s*[:\-]?\s*([^\n]+)/i) || text.match(/(?:Địa chỉ|Dia chi|Address)\s*[:\-]?\s*([^\n]{5,100})/i);
  if (addrMatch) permanentAddress = addrMatch[1].trim().substring(0, 150);

  // If still empty, try loose fallback: first long numeric = MSSV, first 2-4 word title case = name
  if (!studentCode) {
    const looseCode = text.match(/\d{8,13}/);
    if (looseCode) studentCode = looseCode[0];
  }
  if (!fullName) {
    // pick first line with 2-4 Vietnamese words that looks like a name (no digits)
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length >= 5 && l.length < 40 && !/\d/.test(l) && /^[A-Za-zÀ-ỹ\s]+$/.test(l));
    // heuristic: name line often near top, uppercase
    if (lines.length > 0) {
      const upperLines = lines.filter((l) => l === l.toUpperCase() && l.split(/\s+/).length >= 2);
      const candidate = (upperLines[0] || lines[0] || '').trim();
      if (candidate && candidate.split(/\s+/).length >= 2) fullName = candidate;
    }
  }
  return { studentCode, fullName, className, dateOfBirth, course, permanentAddress, faculty, rawText: text };
}

/**
 * Parse raw OCR text into structured card data using the backend LLM endpoint.
 * Falls back to client regex when backend is unreachable or returns non-OK.
 */
async function parseCardText(rawText: string): Promise<Partial<ScannedCardData>> {
  if (!rawText || rawText.trim().length === 0) {
    return { rawText: rawText || '' };
  }

  const fallback = clientFallbackParse(rawText);

  try {
    const response = await api.post('/ai/parse-card-text', { raw_text: rawText }, { timeout: 15000 });
    const parsed = response.data;

    // Merge: backend may return nulls, fill from client fallback
    return {
      studentCode: parsed.student_code || fallback.studentCode || '',
      fullName: parsed.full_name || fallback.fullName || '',
      className: parsed.class_name || fallback.className || null,
      dateOfBirth: parsed.date_of_birth || fallback.dateOfBirth || null,
      course: parsed.course || fallback.course || null,
      permanentAddress: parsed.permanent_address || fallback.permanentAddress || null,
      faculty: parsed.faculty || fallback.faculty || null,
      rawText,
    };
  } catch (err: unknown) {
    console.warn('Card parsing failed, using client fallback:', err);
    return fallback;
  }
}

export default function StudentCardScanner({ onScanned, onError, onSkip }: StudentCardScannerProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    camera: { flex: 1 },
    msgText: { color: c.onSurface, fontSize: 16, textAlign: 'center', marginTop: 24 },
    permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
    permissionBtn: { marginTop: 8 },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 80, justifyContent: 'center', alignItems: 'center' },
    cardFrame: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: FRAME_BORDER_RADIUS, position: 'relative' },
    corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: c.primary },
    cornerTL: { top: -CORNER_WIDTH, left: -CORNER_WIDTH, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: FRAME_BORDER_RADIUS + 4 },
    cornerTR: { top: -CORNER_WIDTH, right: -CORNER_WIDTH, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: FRAME_BORDER_RADIUS + 4 },
    cornerBL: { bottom: -CORNER_WIDTH, left: -CORNER_WIDTH, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: FRAME_BORDER_RADIUS + 4 },
    cornerBR: { bottom: -CORNER_WIDTH, right: -CORNER_WIDTH, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: FRAME_BORDER_RADIUS + 4 },
    scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: c.primary, opacity: 0.8 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(13, 17, 23, 0.85)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, position: 'absolute', top: '40%' },
    statusText: { color: c.onSurface, fontSize: 14, fontWeight: '600' },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: c.outline },
    hintText: { color: c.onSurfaceVariant, fontSize: 13, flex: 1, textAlign: 'center' },
    captureBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    confirmBox: { flex: 1, padding: 20, justifyContent: 'center' },
    checkIconWrap: { alignItems: 'center', marginBottom: 12 },
    confirmTitle: { color: c.onSurface, fontSize: 20, fontWeight: '900', textAlign: 'center' },
    confirmSubtitle: { color: c.onSurfaceVariant, fontSize: 14, textAlign: 'center', marginBottom: 20 },
    fieldList: { backgroundColor: c.surfaceVariant, borderRadius: 12, padding: 16, gap: 10, marginBottom: 20 },
    fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    fieldLabel: { color: c.onSurfaceVariant, fontSize: 13, fontWeight: '600', width: 80 },
    fieldValue: { color: c.onSurface, fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
    confirmActions: { gap: 10 },
    confirmBtn: { borderRadius: 10, backgroundColor: c.custom.success, paddingVertical: 4 },
    retakeBtn: { borderRadius: 10, borderColor: c.outline },
  }), [c]);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<'detecting' | 'capturing' | 'processing' | 'confirm'>('detecting');
  const isMounted = useRef(true);
  const phaseRef = useRef(phase);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ocrResult, setOcrResult] = useState<Partial<ScannedCardData> | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [mlkitAvailable, setMlkitAvailable] = useState<boolean | null>(null);
  const [ocrError, setOcrError] = useState<string>('');
  // Editable fields in confirm phase so user can fix OCR mistakes without retaking
  const [editStudentCode, setEditStudentCode] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editClassName, setEditClassName] = useState('');
  const scanLineY = useRadarAnimation(phase === 'processing');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    };
  }, []);

  // Detect if ML Kit native module is linked (fails in Expo Go)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // TextRecognition.recognize will throw LINKING_ERROR if not in dev-client
        // We test with a dummy call that we expect to fail quickly on invalid path, but NOT linking error
        await TextRecognition.recognize('file:///invalid_test.jpg').catch((e: any) => {
          const msg = String(e?.message || '');
          if (msg.includes("doesn't seem to be linked") || msg.includes('LINKING_ERROR')) throw e;
          // File not found is expected → module is linked
          return null;
        });
        if (!cancelled) setMlkitAvailable(true);
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (msg.includes("doesn't seem to be linked")) {
          console.warn('[StudentCardScanner] ML Kit not linked — running in Expo Go? Use dev-client: npx expo run:android');
          if (!cancelled) {
            setMlkitAvailable(false);
            setOcrError('Thiết bị chưa hỗ trợ quét tự động (cần build dev-client). Vui lòng dùng nút Chụp để quét hoặc Nhập thủ công.');
          }
        } else {
          if (!cancelled) setMlkitAvailable(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const runOcrAndParse = useCallback(async (photoUri: string): Promise<Partial<ScannedCardData> | null> => {
    try {
      console.log('[StudentCardScanner] OCR start:', photoUri);
      const result = await TextRecognition.recognize(photoUri);
      console.log('[StudentCardScanner] OCR raw text len:', result?.text?.length, 'text:', JSON.stringify(result?.text?.slice(0, 400)));
      if (!result?.text || result.text.trim().length < 5) {
        console.warn('[StudentCardScanner] OCR empty or too short');
        setOcrError('Không đọc được chữ trên thẻ, thử chụp gần hơn, đủ sáng và không lóa');
        return { rawText: result?.text || '', studentCode: '', fullName: '' } as any;
      }
      setRawOcrText(result.text);
      setOcrError('');
      const parsed = await parseCardText(result.text);
      console.log('[StudentCardScanner] parsed:', parsed);
      return parsed;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('[StudentCardScanner] OCR error:', msg);
      if (String(msg).includes("doesn't seem to be linked")) {
        setMlkitAvailable(false);
        setOcrError('ML Kit chưa được link — hãy chạy: npx expo run:android (dev-client), không dùng Expo Go');
        onError?.('Cần build dev-client để dùng quét. Vui lòng Nhập thủ công.');
      } else {
        setOcrError('Lỗi nhận dạng thẻ. Vui lòng thử lại hoặc nhập thủ công.');
        onError?.('Lỗi nhận dạng thẻ. Vui lòng thử lại hoặc nhập thủ công.');
      }
      return null;
    }
  }, [onError]);

  const attemptAutoDetect = useCallback(async () => {
    if ((mlkitAvailable as any) === false) return; // don't loop if native module missing
    if (!cameraRef.current || !isMounted.current || phaseRef.current !== 'detecting') return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true, quality: 0.3, skipProcessing: true,
      });
      if (!photo?.uri || !isMounted.current) return;

      const tempPath = `${FileSystem.cacheDirectory}card_detect_${Date.now()}.jpg`;
      try {
        await FileSystem.moveAsync({ from: photo.uri, to: tempPath });
      } catch {
        // fallback: photo.uri may already be usable
        const resultDirect = await TextRecognition.recognize(photo.uri).catch(() => null);
        if (resultDirect?.text && resultDirect.text.trim().length > 15) {
          console.log('[autoDetect] direct OCR text len', resultDirect.text.length);
        }
        if (isMounted.current && phaseRef.current === 'detecting') {
          detectTimerRef.current = setTimeout(attemptAutoDetect, 2500);
        }
        return;
      }

      const result = await TextRecognition.recognize(tempPath);
      await FileSystem.deleteAsync(tempPath, { idempotent: true });

      if (!isMounted.current) return;

      // Lower threshold to 15 and log for debug
      if (result?.text && result.text.trim().length > 15) {
        console.log('[autoDetect] detected text, capturing hi-res', result.text.slice(0,120));
        setPhase('capturing');
        await new Promise((r) => setTimeout(r, 600));
        if (!isMounted.current) return;

        const finalPhoto = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.9, skipProcessing: true,
        });
        if (!finalPhoto?.uri) return;
        setPhase('processing');

        const finalPath = `${FileSystem.cacheDirectory}card_final_${Date.now()}.jpg`;
        try {
          await FileSystem.moveAsync({ from: finalPhoto.uri, to: finalPath });
          const parsed = await runOcrAndParse(finalPath);
          await FileSystem.deleteAsync(finalPath, { idempotent: true });
          if (parsed && isMounted.current) {
            setOcrResult(parsed);
            setEditStudentCode(parsed.studentCode || '');
            setEditFullName(parsed.fullName || '');
            setEditClassName(parsed.className || '');
            setRawOcrText(parsed.rawText || '');
            setPhase('confirm');
            return;
          }
        } catch (e) {
          // fallback to direct uri if move fails
          const parsed = await runOcrAndParse(finalPhoto.uri);
          if (parsed && isMounted.current) {
            setOcrResult(parsed);
            setEditStudentCode(parsed.studentCode || '');
            setEditFullName(parsed.fullName || '');
            setEditClassName(parsed.className || '');
            setRawOcrText(parsed.rawText || '');
            setPhase('confirm');
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[autoDetect] error', e);
    }
    if (isMounted.current && phaseRef.current === 'detecting' && (mlkitAvailable as any) !== false) {
      detectTimerRef.current = setTimeout(attemptAutoDetect, 2500);
    }
  }, [runOcrAndParse, mlkitAvailable]);

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
    setOcrError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true, quality: 0.9, skipProcessing: true,
      });
      if (!photo?.uri) {
        setOcrError('Không chụp được ảnh');
        setPhase('detecting');
        startDetection();
        return;
      }
      setPhase('processing');
      console.log('[manualCapture] photo.uri', photo.uri);
      const parsed = await runOcrAndParse(photo.uri);
      if (parsed && isMounted.current) {
        // Even if parsed is empty, go to confirm so user can see raw text and edit
        setOcrResult(parsed);
        setEditStudentCode(parsed.studentCode || '');
        setEditFullName(parsed.fullName || '');
        setEditClassName(parsed.className || '');
        setRawOcrText(parsed.rawText || '');
        setPhase('confirm');
        if (!parsed.studentCode && !parsed.fullName) {
          setOcrError('Đã chụp nhưng không nhận diện được MSSV/Họ tên — vui lòng nhập tay ở màn hình xác nhận hoặc chụp lại gần hơn');
        }
      } else {
        onError?.('Không thể đọc thông tin từ ảnh, vui lòng thử lại');
        setOcrError('Không đọc được chữ — thử chụp lại gần hơn, đủ sáng');
        setPhase('detecting');
        startDetection();
      }
    } catch (e: any) {
      console.error('[manualCapture] error', e);
      setOcrError('Lỗi chụp: ' + (e?.message || ''));
      setPhase('detecting');
      startDetection();
    }
  };

  const handleConfirm = () => {
    const finalCode = (editStudentCode || ocrResult?.studentCode || '').trim();
    const finalName = (editFullName || ocrResult?.fullName || '').trim();
    const finalClass = (editClassName || ocrResult?.className || '').trim() || null;
    if (!finalCode || !finalName) {
      onError?.('Vui lòng nhập đủ MSSV và Họ tên (có thể sửa tay)');
      setOcrError('Thiếu MSSV/Họ tên — hãy nhập tay trước khi xác nhận');
      return;
    }
    onScanned({
      studentCode: finalCode,
      fullName: finalName,
      className: finalClass,
      dateOfBirth: ocrResult?.dateOfBirth || null,
      course: ocrResult?.course || finalClass?.match(/K(\d+)/i)?.[1] || finalClass?.match(/\-(\d+)/)?.[1] || null,
      permanentAddress: ocrResult?.permanentAddress || null,
      faculty: ocrResult?.faculty || null,
      rawText: ocrResult?.rawText || rawOcrText || '',
    });
  };

  const handleRetake = () => {
    setOcrResult(null);
    setRawOcrText('');
    setOcrError('');
    setEditStudentCode('');
    setEditFullName('');
    setEditClassName('');
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
          <MaterialCommunityIcons name="camera-off" size={48} color={c.onSurfaceVariant} />
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
    const hasData = !!(editStudentCode || ocrResult.studentCode || editFullName || ocrResult.fullName);
    return (
      <View style={styles.container}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.confirmBox, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.checkIconWrap}>
            <MaterialCommunityIcons name={hasData ? "check-circle" : "alert-circle-outline"} size={56} color={hasData ? c.custom.success : c.custom.warning} />
          </View>
          <Text style={styles.confirmTitle}>{hasData ? 'Đọc thẻ thành công' : 'Không nhận diện đủ'}</Text>
          <Text style={styles.confirmSubtitle}>{hasData ? 'Vui lòng kiểm tra và sửa lại nếu cần' : 'Vui lòng nhập tay MSSV/Họ tên'}</Text>

          {ocrError ? (
            <View style={{ backgroundColor: `${c.custom.warning}18`, borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: `${c.custom.warning}40` }}>
              <Text style={{ color: c.custom.warning, fontSize: 13 }}>{ocrError}</Text>
            </View>
          ) : null}

          {/* Editable fields */}
          <View style={{ gap: 10, marginBottom: 12 }}>
            <View style={{ backgroundColor: c.surfaceVariant, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: editStudentCode ? c.outline : `${c.custom.warning}60` }}>
              <Text style={{ color: c.onSurfaceVariant, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>MSSV * {(!editStudentCode && !ocrResult.studentCode) ? '— thiếu' : ''}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 8, borderWidth: 1, borderColor: c.outline, paddingHorizontal: 10 }}>
                <MaterialCommunityIcons name="card-account-details-outline" size={18} color={c.onSurfaceVariant} />
                <TextInputEdit value={editStudentCode} onChangeText={setEditStudentCode} placeholder="Nhập MSSV (VD: 22664321)" placeholderTextColor={c.onSurfaceVariant} style={{ flex: 1, color: c.onSurface, paddingVertical: 10, paddingHorizontal: 8 }} keyboardType="number-pad" />
              </View>
            </View>
            <View style={{ backgroundColor: c.surfaceVariant, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: editFullName ? c.outline : `${c.custom.warning}60` }}>
              <Text style={{ color: c.onSurfaceVariant, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Họ tên * {(!editFullName && !ocrResult.fullName) ? '— thiếu' : ''}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 8, borderWidth: 1, borderColor: c.outline, paddingHorizontal: 10 }}>
                <MaterialCommunityIcons name="account-outline" size={18} color={c.onSurfaceVariant} />
                <TextInputEdit value={editFullName} onChangeText={setEditFullName} placeholder="Nhập họ tên" placeholderTextColor={c.onSurfaceVariant} style={{ flex: 1, color: c.onSurface, paddingVertical: 10, paddingHorizontal: 8 }} />
              </View>
            </View>
            <View style={{ backgroundColor: c.surfaceVariant, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: c.outline }}>
              <Text style={{ color: c.onSurfaceVariant, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Lớp</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 8, borderWidth: 1, borderColor: c.outline, paddingHorizontal: 10 }}>
                <MaterialCommunityIcons name="school-outline" size={18} color={c.onSurfaceVariant} />
                <TextInputEdit value={editClassName} onChangeText={setEditClassName} placeholder="VD: DHKTPM18A" placeholderTextColor={c.onSurfaceVariant} style={{ flex: 1, color: c.onSurface, paddingVertical: 10, paddingHorizontal: 8 }} autoCapitalize="characters" />
              </View>
            </View>
          </View>

          <View style={styles.fieldList}>
            {ocrResult.dateOfBirth ? (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Ngày sinh</Text>
                <Text style={styles.fieldValue}>{ocrResult.dateOfBirth}</Text>
              </View>
            ) : null}
            {ocrResult.faculty ? (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Khoa</Text>
                <Text style={styles.fieldValue}>{ocrResult.faculty}</Text>
              </View>
            ) : null}
            {ocrResult.permanentAddress ? (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>HKTT</Text>
                <Text style={styles.fieldValue}>{ocrResult.permanentAddress}</Text>
              </View>
            ) : null}
            {__DEV__ && rawOcrText ? (
              <View style={{ marginTop: 8, backgroundColor: c.surface, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: c.outlineVariant }}>
                <Text style={{ color: c.onSurfaceVariant, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>RAW OCR (debug)</Text>
                <Text style={{ color: c.onSurfaceVariant, fontSize: 11, lineHeight: 14 }}>{rawOcrText.slice(0, 500)}{rawOcrText.length > 500 ? '...' : ''}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.confirmActions}>
            <Button mode="contained" onPress={handleConfirm} style={styles.confirmBtn} icon="check">
              Xác nhận{!hasData ? ' (nhập tay)' : ''}
            </Button>
            <Button mode="outlined" onPress={handleRetake} style={styles.retakeBtn} icon="camera-retake">
              Chụp lại
            </Button>
            {onSkip && (
              <Button mode="text" onPress={onSkip}>
                Nhập thủ công (bỏ qua quét)
              </Button>
            )}
          </View>
        </ScrollView>
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

          {phase === 'processing' && (
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanLineY.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-CARD_HEIGHT / 2, CARD_HEIGHT / 2],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
        </View>

        {phase === 'detecting' && (mlkitAvailable as any) === false ? (
          <View style={[styles.statusBadge, { maxWidth: 300, flexDirection: 'column', gap: 6 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={c.custom.warning} />
              <Text style={styles.statusText}>Cần dev-client</Text>
            </View>
            <Text style={{ color: c.onSurfaceVariant, fontSize: 11, textAlign: 'center' }}>Chạy npx expo run:android, không dùng Expo Go. Dùng nút Chụp bên dưới.</Text>
          </View>
        ) : phase === 'detecting' ? (
          <View style={styles.statusBadge}>
            <ActivityIndicator size={20} color={c.primary} />
            <Text style={styles.statusText}>Đang phát hiện thẻ...</Text>
          </View>
        ) : null}
        {phase === 'capturing' && (
          <View style={styles.statusBadge}>
            <MaterialCommunityIcons name="camera" size={20} color={c.custom.warning} />
            <Text style={styles.statusText}>Đang chụp...</Text>
          </View>
        )}
        {phase === 'processing' && (
          <View style={styles.statusBadge}>
            <ActivityIndicator size={20} color={c.primary} />
            <Text style={styles.statusText}>Đang xử lý ảnh...</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.hintText}>Đặt thẻ sinh viên vào khung hình</Text>
        <TouchableOpacity style={styles.captureBtn} onPress={handleManualCapture} activeOpacity={0.7}>
          <MaterialCommunityIcons name="camera" size={28} color={c.background} />
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

