import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Animated, TextInput as RNTextInput, ScrollView, Platform } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const TextInputEdit = RNTextInput as any;
import { CameraView, useCameraPermissions } from 'expo-camera';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { AppTheme } from '../theme/DarkTheme';
import api from '../api/client';
import { useRadarAnimation } from '../hooks/useRadarAnimation';
import { triggerHaptic } from '../utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.88), 340);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.63);

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
  onBack?: () => void;
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

  if (!studentCode) {
    const looseCode = text.match(/\d{8,13}/);
    if (looseCode) studentCode = looseCode[0];
  }
  if (!fullName) {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length >= 5 && l.length < 40 && !/\d/.test(l) && /^[A-Za-zÀ-ỹ\s]+$/.test(l));
    if (lines.length > 0) {
      const upperLines = lines.filter((l) => l === l.toUpperCase() && l.split(/\s+/).length >= 2);
      const candidate = (upperLines[0] || lines[0] || '').trim();
      if (candidate && candidate.split(/\s+/).length >= 2) fullName = candidate;
    }
  }
  return { studentCode, fullName, className, dateOfBirth, course, permanentAddress, faculty, rawText: text };
}

/**
 * Parse raw OCR text into structured card data using backend AI endpoint.
 */
async function parseCardText(rawText: string): Promise<Partial<ScannedCardData>> {
  if (!rawText || rawText.trim().length === 0) {
    return { rawText: rawText || '' };
  }

  const fallback = clientFallbackParse(rawText);

  try {
    const response = await api.post('/ai/parse-card-text', { raw_text: rawText }, { timeout: 15000 });
    const parsed = response.data;

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

export default function StudentCardScanner({ onScanned, onError, onSkip, onBack }: StudentCardScannerProps) {
  const theme = useTheme<AppTheme>();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await TextRecognition.recognize('file:///invalid_test.jpg').catch((e: any) => {
          const msg = String(e?.message || '');
          if (msg.includes("doesn't seem to be linked") || msg.includes('LINKING_ERROR')) throw e;
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
        setOcrError('Chức năng OCR tự động cần build dev-client. Vui lòng bấm Nhập thủ công.');
      } else {
        setOcrError('Lỗi đọc ảnh: ' + msg);
      }
      return null;
    }
  }, []);

  const attemptAutoDetect = useCallback(async () => {
    if (!isMounted.current || phaseRef.current !== 'detecting' || !cameraRef.current) return;
    if ((mlkitAvailable as any) === false) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: false, quality: 0.7, skipProcessing: true,
      });
      if (photo?.uri && isMounted.current && phaseRef.current === 'detecting') {
        const parsed = await runOcrAndParse(photo.uri);
        if (parsed && (parsed.studentCode || parsed.fullName) && isMounted.current) {
          triggerHaptic.success();
          setPhase('confirm');
          setOcrResult(parsed);
          setEditStudentCode(parsed.studentCode || '');
          setEditFullName(parsed.fullName || '');
          setEditClassName(parsed.className || '');
          setRawOcrText(parsed.rawText || '');
          return;
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
    triggerHaptic.medium();
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
        triggerHaptic.success();
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
        triggerHaptic.warning();
        onError?.('Không thể đọc thông tin từ ảnh, vui lòng thử lại');
        setOcrError('Không đọc được chữ — thử chụp lại gần hơn, đủ sáng');
        setPhase('detecting');
        startDetection();
      }
    } catch (e: any) {
      triggerHaptic.error();
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
      triggerHaptic.error();
      onError?.('Vui lòng nhập đủ MSSV và Họ tên (có thể sửa tay)');
      setOcrError('Thiếu MSSV/Họ tên — hãy nhập tay trước khi xác nhận');
      return;
    }
    triggerHaptic.success();
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
    triggerHaptic.selection();
    setOcrResult(null);
    setRawOcrText('');
    setOcrError('');
    setEditStudentCode('');
    setEditFullName('');
    setEditClassName('');
    setPhase('detecting');
    startDetection();
  };

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  if (!permission) {
    return (
      <View style={styles.stateCenterContainer}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={styles.msgText}>Đang khởi tạo camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.stateCenterContainer}>
        <View style={styles.permissionBox}>
          <View style={styles.permissionIconCircle}>
            <MaterialCommunityIcons name="camera-off" size={40} color={c.onSurfaceVariant} />
          </View>
          <Text style={styles.permissionTitle}>Cần quyền truy cập Camera</Text>
          <Text style={styles.permissionDesc}>
            Ứng dụng cần quyền Camera để chụp và quét thẻ sinh viên tự động điền hồ sơ.
          </Text>
          <Button mode="contained" onPress={requestPermission} style={styles.primaryActionBtn}>
            Cấp quyền Camera
          </Button>
          {onSkip && (
            <Button mode="text" onPress={onSkip} style={{ marginTop: 8 }}>
              Nhập thông tin thủ công
            </Button>
          )}
        </View>
      </View>
    );
  }

  if (phase === 'confirm' && ocrResult) {
    const hasData = !!(editStudentCode || ocrResult.studentCode || editFullName || ocrResult.fullName);
    return (
      <View style={[styles.confirmContainer, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.confirmHeader}>
          <TouchableOpacity onPress={handleRetake} style={styles.confirmBackBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={c.onSurface} />
          </TouchableOpacity>
          <Text style={styles.confirmHeaderTitle}>Kiểm Tra Thông Tin Thẻ</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.confirmScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.statusHeroCard, { borderColor: hasData ? `${c.custom.success}40` : `${c.custom.warning}40` }]}>
            <MaterialCommunityIcons
              name={hasData ? 'check-decagram' : 'alert-circle'}
              size={36}
              color={hasData ? c.custom.success : c.custom.warning}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.statusHeroTitle, { color: hasData ? c.custom.success : c.custom.warning }]}>
                {hasData ? 'Đã nhận diện thẻ sinh viên' : 'Chưa đọc đủ thông tin'}
              </Text>
              <Text style={styles.statusHeroDesc}>
                {hasData
                  ? 'Vui lòng kiểm tra lại thông tin và chỉnh sửa nếu cần.'
                  : 'Hãy nhập bổ sung MSSV và Họ tên bên dưới để tiếp tục.'}
              </Text>
            </View>
          </View>

          {ocrError ? (
            <View style={styles.errorAlertBox}>
              <MaterialCommunityIcons name="information-outline" size={18} color={c.custom.warning} />
              <Text style={styles.errorAlertText}>{ocrError}</Text>
            </View>
          ) : null}

          {/* Editable Form Inputs */}
          <View style={styles.inputGroupContainer}>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>
                MÃ SỐ SINH VIÊN (MSSV) <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={styles.inputFieldWrap}>
                <MaterialCommunityIcons name="card-account-details-outline" size={20} color={c.primary} />
                <TextInputEdit
                  value={editStudentCode}
                  onChangeText={setEditStudentCode}
                  placeholder="Nhập MSSV (VD: 20123456)"
                  placeholderTextColor={c.onSurfaceVariant}
                  style={[styles.textInputStyle, { color: c.onSurface }]}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>
                HỌ VÀ TÊN <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={styles.inputFieldWrap}>
                <MaterialCommunityIcons name="account-outline" size={20} color={c.primary} />
                <TextInputEdit
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Nhập họ và tên đầy đủ"
                  placeholderTextColor={c.onSurfaceVariant}
                  style={[styles.textInputStyle, { color: c.onSurface }]}
                />
              </View>
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>LỚP HỌC</Text>
              <View style={styles.inputFieldWrap}>
                <MaterialCommunityIcons name="school-outline" size={20} color={c.onSurfaceVariant} />
                <TextInputEdit
                  value={editClassName}
                  onChangeText={setEditClassName}
                  placeholder="VD: DHKTPM18A"
                  placeholderTextColor={c.onSurfaceVariant}
                  style={[styles.textInputStyle, { color: c.onSurface }]}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>

          {/* Additional details preview */}
          {(ocrResult.dateOfBirth || ocrResult.faculty || ocrResult.permanentAddress) && (
            <View style={styles.extraDetailsCard}>
              <Text style={styles.extraDetailsTitle}>Thông tin bổ sung từ thẻ</Text>
              {ocrResult.dateOfBirth ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày sinh:</Text>
                  <Text style={styles.detailValue}>{ocrResult.dateOfBirth}</Text>
                </View>
              ) : null}
              {ocrResult.faculty ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Khoa:</Text>
                  <Text style={styles.detailValue}>{ocrResult.faculty}</Text>
                </View>
              ) : null}
              {ocrResult.permanentAddress ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>HKTT:</Text>
                  <Text style={styles.detailValue}>{ocrResult.permanentAddress}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Actions */}
          <View style={styles.confirmActionGroup}>
            <Button
              mode="contained"
              onPress={handleConfirm}
              style={styles.confirmPrimaryBtn}
              contentStyle={{ height: 48 }}
              icon="check-bold"
            >
              Xác nhận thông tin
            </Button>
            <Button
              mode="outlined"
              onPress={handleRetake}
              style={styles.confirmSecondaryBtn}
              contentStyle={{ height: 44 }}
              icon="camera-retake"
            >
              Chụp lại thẻ khác
            </Button>
            {onSkip && (
              <Button mode="text" onPress={onSkip} textColor={c.onSurfaceVariant}>
                Nhập thủ công toàn bộ
              </Button>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Top Glassmorphic Navigation Header */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={onBack || onSkip}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Quét Thẻ Sinh Viên</Text>
          <Text style={styles.headerSubtitle}>Tự động nhận diện hồ sơ đăng ký</Text>
        </View>
        {onSkip ? (
          <TouchableOpacity style={styles.skipHeaderBtn} onPress={onSkip} activeOpacity={0.7}>
            <Text style={styles.skipHeaderText}>Bỏ qua</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Symmetrical Masked Viewfinder */}
      <View style={styles.viewfinderMaskContainer}>
        {/* Top Dark Mask */}
        <View style={styles.maskTopArea} />

        {/* Center Cutout Row */}
        <View style={styles.maskMiddleRow}>
          <View style={styles.maskSideArea} />

          {/* Central Card Viewfinder Box */}
          <View style={styles.cardFrameBox}>
            {/* Glowing Corner Accents */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Centered Watermark Guide */}
            <View style={styles.watermarkGuide}>
              <MaterialCommunityIcons name="card-account-details-outline" size={44} color="rgba(255,255,255,0.3)" />
              <Text style={styles.watermarkGuideText}>ĐẶT THẺ SINH VIÊN VÀO KHUNG</Text>
            </View>

            {phase === 'processing' && (
              <Animated.View
                style={[
                  styles.scanLineAnim,
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

          <View style={styles.maskSideArea} />
        </View>

        {/* Bottom Mask with Centered Status & Guides */}
        <View style={styles.maskBottomArea}>
          {phase === 'detecting' && (mlkitAvailable as any) === false ? (
            <View style={styles.statusPill}>
              <MaterialCommunityIcons name="information-outline" size={16} color="#FBBF24" />
              <Text style={styles.statusPillText}>Nhấn nút chụp tròn bên dưới để quét thẻ</Text>
            </View>
          ) : phase === 'detecting' ? (
            <View style={styles.statusPill}>
              <ActivityIndicator size={14} color="#38BDF8" />
              <Text style={styles.statusPillText}>Đang tự động phát hiện thẻ...</Text>
            </View>
          ) : phase === 'capturing' ? (
            <View style={styles.statusPill}>
              <MaterialCommunityIcons name="camera" size={16} color="#FBBF24" />
              <Text style={styles.statusPillText}>Đang chụp thẻ...</Text>
            </View>
          ) : phase === 'processing' ? (
            <View style={styles.statusPill}>
              <ActivityIndicator size={14} color="#38BDF8" />
              <Text style={styles.statusPillText}>Đang đọc thông tin từ thẻ...</Text>
            </View>
          ) : null}

          <Text style={styles.cameraGuideText}>
            Giữ thẻ nằm ngang, đủ ánh sáng và tránh bị bóng lóa
          </Text>
        </View>
      </View>

      {/* Grounded Bottom Controls */}
      <View style={[styles.bottomControlBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.shutterContainer}>
          <TouchableOpacity
            style={styles.shutterOuterRing}
            onPress={handleManualCapture}
            activeOpacity={0.7}
          >
            <View style={[styles.shutterInnerCircle, { backgroundColor: c.primary }]}>
              <MaterialCommunityIcons name="camera" size={28} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {onSkip && (
          <TouchableOpacity style={styles.manualEntryLink} onPress={onSkip} activeOpacity={0.7}>
            <MaterialCommunityIcons name="square-edit-outline" size={18} color="rgba(255,255,255,0.85)" />
            <Text style={styles.manualEntryLinkText}>Nhập thông tin thủ công</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3.5;
const FRAME_RADIUS = 16;

function createStyles(theme: AppTheme, insets: { top: number; bottom: number; left: number; right: number }) {
  const c = theme.colors;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0F172A',
    },
    stateCenterContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.background,
      padding: 24,
    },
    msgText: {
      color: c.onSurface,
      fontSize: 15,
      marginTop: 16,
      textAlign: 'center',
    },
    permissionBox: {
      alignItems: 'center',
      gap: 12,
      maxWidth: 320,
    },
    permissionIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    permissionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.onSurface,
      textAlign: 'center',
    },
    permissionDesc: {
      fontSize: 13,
      color: c.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 8,
    },
    primaryActionBtn: {
      borderRadius: 12,
      width: '100%',
    },

    /* Top Navigation Header */
    topHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
    },
    headerIconBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleWrap: {
      alignItems: 'center',
      flex: 1,
    },
    headerTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    headerSubtitle: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 11,
      marginTop: 2,
    },
    skipHeaderBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    skipHeaderText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },

    /* Viewfinder Mask */
    viewfinderMaskContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2,
    },
    maskTopArea: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
    },
    maskMiddleRow: {
      flexDirection: 'row',
      height: CARD_HEIGHT,
    },
    maskSideArea: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
    },
    cardFrameBox: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: FRAME_RADIUS,
      position: 'relative',
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.3)',
      backgroundColor: 'transparent',
      overflow: 'hidden',
    },
    corner: {
      position: 'absolute',
      width: CORNER_SIZE,
      height: CORNER_SIZE,
      borderColor: '#38BDF8',
    },
    cornerTL: {
      top: 0,
      left: 0,
      borderTopWidth: CORNER_WIDTH,
      borderLeftWidth: CORNER_WIDTH,
      borderTopLeftRadius: FRAME_RADIUS,
    },
    cornerTR: {
      top: 0,
      right: 0,
      borderTopWidth: CORNER_WIDTH,
      borderRightWidth: CORNER_WIDTH,
      borderTopRightRadius: FRAME_RADIUS,
    },
    cornerBL: {
      bottom: 0,
      left: 0,
      borderBottomWidth: CORNER_WIDTH,
      borderLeftWidth: CORNER_WIDTH,
      borderBottomLeftRadius: FRAME_RADIUS,
    },
    cornerBR: {
      bottom: 0,
      right: 0,
      borderBottomWidth: CORNER_WIDTH,
      borderRightWidth: CORNER_WIDTH,
      borderBottomRightRadius: FRAME_RADIUS,
    },
    watermarkGuide: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    watermarkGuideText: {
      color: 'rgba(255, 255, 255, 0.35)',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },
    scanLineAnim: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: '#38BDF8',
      shadowColor: '#38BDF8',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 8,
    },
    maskBottomArea: {
      flex: 1.4,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      alignItems: 'center',
      paddingTop: 16,
      gap: 10,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(30, 41, 59, 0.9)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statusPillText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    cameraGuideText: {
      color: 'rgba(255, 255, 255, 0.75)',
      fontSize: 12,
      textAlign: 'center',
    },

    /* Bottom Control Bar */
    bottomControlBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      alignItems: 'center',
      gap: 12,
      paddingTop: 8,
    },
    shutterContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    shutterOuterRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 3,
      borderColor: 'rgba(255, 255, 255, 0.8)',
      padding: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
    },
    shutterInnerCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    manualEntryLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    manualEntryLinkText: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 12,
      fontWeight: '600',
    },

    /* Confirmation Phase Styles */
    confirmContainer: {
      flex: 1,
      backgroundColor: c.background,
    },
    confirmHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.outlineVariant,
    },
    confirmBackBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmHeaderTitle: {
      color: c.onSurface,
      fontSize: 16,
      fontWeight: '700',
    },
    confirmScrollContent: {
      padding: 16,
      gap: 14,
    },
    statusHeroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surfaceVariant,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
    },
    statusHeroTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    statusHeroDesc: {
      fontSize: 12,
      color: c.onSurfaceVariant,
      lineHeight: 16,
    },
    errorAlertBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: `${c.custom.warning}15`,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: `${c.custom.warning}40`,
    },
    errorAlertText: {
      color: c.custom.warning,
      fontSize: 12,
      flex: 1,
    },
    inputGroupContainer: {
      gap: 10,
    },
    inputCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: c.outlineVariant,
      gap: 6,
    },
    inputLabel: {
      color: c.onSurfaceVariant,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    inputFieldWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceVariant,
      borderRadius: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: c.outline,
    },
    textInputStyle: {
      flex: 1,
      fontSize: 14,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      paddingHorizontal: 8,
    },
    extraDetailsCard: {
      backgroundColor: c.surfaceVariant,
      borderRadius: 12,
      padding: 12,
      gap: 6,
    },
    extraDetailsTitle: {
      color: c.onSurfaceVariant,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 2,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailLabel: {
      color: c.onSurfaceVariant,
      fontSize: 12,
    },
    detailValue: {
      color: c.onSurface,
      fontSize: 12,
      fontWeight: '600',
    },
    confirmActionGroup: {
      gap: 8,
      marginTop: 8,
    },
    confirmPrimaryBtn: {
      borderRadius: 12,
    },
    confirmSecondaryBtn: {
      borderRadius: 12,
      borderColor: c.outline,
    },
  });
}
