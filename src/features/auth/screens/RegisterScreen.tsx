import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import api from '../../../api/client';
import { authApi } from '../../../api/auth';
import AutoFaceCapture from '../../../components/AutoFaceCapture';
import StudentCardScanner, { ScannedCardData } from '../../../components/StudentCardScanner';
import CodeInput from '../../../components/CodeInput';
import { AppTheme } from '../../../theme/DarkTheme';
import { SectionCard, GRADIENTS } from '../../../theme/MobileDesignSystem';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { NoticeSnackbar } from '../../../components/NoticeSnackbar';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface RegisterScreenProps {
  navigation: any;
}

type StepKey = 'scan' | 'form' | 'otp' | 'choice' | 'consent' | 'face';

const STEP_META: Record<StepKey, { label: string; icon: string }> = {
  scan: { label: 'Quét thẻ', icon: 'card-account-details-outline' },
  form: { label: 'Thông tin', icon: 'form-textbox' },
  otp: { label: 'Xác thực', icon: 'email-check-outline' },
  choice: { label: 'Hoàn tất', icon: 'check-circle-outline' },
  consent: { label: 'Đồng ý', icon: 'file-document-check' },
  face: { label: 'Khuôn mặt', icon: 'face-recognition' },
};

const FORM_STEPS: StepKey[] = ['form', 'otp', 'choice', 'consent', 'face'];

function StepIndicator({ currentStep }: { currentStep: StepKey }) {
  const currentIdx = FORM_STEPS.indexOf(currentStep);
  if (currentIdx < 0) return null;

  const theme = useTheme() as AppTheme;

  return (
    <View style={stepStyles.container}>
      {FORM_STEPS.map((key, idx) => {
        const isActive = idx === currentIdx;
        const isDone = idx < currentIdx;
        return (
          <React.Fragment key={key}>
            <View style={stepStyles.stepItem}>
              <View
                style={[
                  stepStyles.dot,
                  {
                    backgroundColor: isDone
                      ? theme.colors.primary
                      : isActive
                        ? theme.colors.primary
                        : theme.colors.outlineVariant,
                  },
                ]}
              >
                {isDone ? (
                  <MaterialCommunityIcons name="check" size={12} color={theme.colors.onPrimary} />
                ) : (
                  <Text style={[stepStyles.dotText, { color: isActive ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }]}>
                    {idx + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  stepStyles.label,
                  {
                    color: isActive || isDone ? theme.colors.primary : theme.colors.onSurfaceVariant,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {STEP_META[key].label}
              </Text>
            </View>
            {idx < FORM_STEPS.length - 1 ? (
              <View
                style={[
                  stepStyles.connector,
                  {
                    backgroundColor: isDone ? theme.colors.primary : theme.colors.outlineVariant,
                  },
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 0,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontSize: 11,
    fontWeight: '700',
  },
  connector: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 6,
    marginBottom: 18,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [step, setStep] = useState<StepKey>('scan');
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [className, setClassName] = useState('');
  const [course, setCourse] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [consentGiven, setConsentGiven] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [studentCodeCheck, setStudentCodeCheck] = useState<'idle' | 'checking' | 'exists' | 'available'>('idle');
  const [emailCheck, setEmailCheck] = useState<'idle' | 'checking' | 'exists' | 'available'>('idle');
  const otpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkExistsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
      if (checkExistsDebounceRef.current) clearTimeout(checkExistsDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (step !== 'otp') {
      if (otpTimerRef.current) {
        clearInterval(otpTimerRef.current);
        otpTimerRef.current = null;
      }
    }
  }, [step]);

  useEffect(() => {
    let ignore = false;
    if (checkExistsDebounceRef.current) clearTimeout(checkExistsDebounceRef.current);

    const code = studentCode.trim();
    const mail = email.trim();
    const codeValid = code.length >= 4;
    const mailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);

    if (!codeValid && !mailValid) {
      setStudentCodeCheck('idle');
      setEmailCheck('idle');
      return;
    }

    if (codeValid) setStudentCodeCheck('checking');
    if (mailValid) setEmailCheck('checking');

    checkExistsDebounceRef.current = setTimeout(() => {
      authApi.checkExists(codeValid ? code : '', mailValid ? mail : '').then(result => {
        if (ignore) return;
        setStudentCodeCheck(codeValid ? (result.student_code_exists ? 'exists' : 'available') : 'idle');
        setEmailCheck(mailValid ? (result.email_exists ? 'exists' : 'available') : 'idle');
      }).catch((e) => {
        console.warn('[Register] checkExists debounce failed', e?.message);
        if (!ignore) {
          setStudentCodeCheck('idle');
          setEmailCheck('idle');
        }
      });
    }, 500);

    return () => { ignore = true; };
  }, [studentCode, email]);

  const startOtpCooldown = () => {
    setOtpCooldown(60);
    if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    otpTimerRef.current = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          if (otpTimerRef.current) clearInterval(otpTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const showError = (message: string) => { setSnackbarSeverity('error'); setSnackbar(message); };
  const showSuccess = (message: string) => { setSnackbarSeverity('success'); setSnackbar(message); };

  const handleSendOtp = async () => {
    setOtpSending(true);
    try {
      await authApi.preRegisterOtp(email.trim());
      startOtpCooldown();
      setStep('otp');
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Gui ma OTP that bai';
      showError(message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) {
      showError('Vui long nhap day du ma OTP');
      return;
    }
    setOtpSending(true);
    try {
      const result = await authApi.preRegisterVerify(email.trim(), otpCode);
      setVerificationToken(result.verification_token);
      await authApi.patronRegister({
        student_code: studentCode.trim(),
        password,
        full_name: fullName.trim(),
        email: email.trim(),
        class_name: className.trim() || undefined,
        course: course.trim() || undefined,
        permanent_address: permanentAddress.trim() || undefined,
        verification_token: result.verification_token,
      }).then(response => {
        setRegisteredUser(response.user);
        setStep('choice');
      }).catch(error => {
        const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Dang ky that bai';
        showError(message);
      });
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Ma OTP khong hop le';
      showError(message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return;
    try {
      await authApi.preRegisterOtp(email.trim());
      startOtpCooldown();
      setOtpCode('');
      showSuccess('Da gui lai ma OTP');
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Gui lai OTP that bai';
      showError(message);
    }
  };

  const handleScanned = (data: ScannedCardData) => {
    setStudentCode(data.studentCode || '');
    setFullName(data.fullName || '');
    setClassName(data.className || '');
    setCourse(data.course || '');
    setPermanentAddress(data.permanentAddress || '');
    setStep('form');
  };

  const validateForm = () => {
    if (!studentCode.trim()) {
      showError('Vui lòng nhập mã sinh viên');
      return false;
    }
    if (studentCode.length < 4) {
      showError('Mã sinh viên phải có ít nhất 4 ký tự');
      return false;
    }
    if (!fullName.trim()) {
      showError('Vui lòng nhập họ tên');
      return false;
    }
    if (!email.trim()) {
      showError('Vui lòng nhập email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showError('Email không hợp lệ');
      return false;
    }
    if (!password) {
      showError('Vui lòng nhập mật khẩu');
      return false;
    }
    if (password.length < 6) {
      showError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    if (password !== confirmPassword) {
      showError('Mật khẩu xác nhận không khớp');
      return false;
    }
    return true;
  };

  const handleFaceEnroll = async (images: string[]) => {
    if (!registeredUser?.id || images.length !== 4) return;

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
      formData.append('consent_given', consentGiven ? 'true' : 'false');

      await api.post(`/patrons/${registeredUser.id}/enroll-batch`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 130000,
      });

      showSuccess('Đăng ký tài khoản và khuôn mặt thành công');
      navigation.replace('Login');
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Đăng ký khuôn mặt thất bại';
      showError(message);
    } finally {
      setIsUploading(false);
    }
  };

  if (step === 'scan') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StudentCardScanner
          onScanned={handleScanned}
          onError={showError}
          onSkip={() => {
            setStep('form');
          }}
        />
        <NoticeSnackbar visible={!!snackbar} message={snackbar} severity={snackbarSeverity} onDismiss={() => setSnackbar('')} />
      </SafeAreaView>
    );
  }

  if (step === 'otp') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <Button
            mode="text"
            onPress={() => setStep('form')}
            icon="arrow-left"
            compact
            labelStyle={styles.backLabel}
          >
            Quay lại
          </Button>
          <Text variant="titleMedium" style={styles.headerTitle}>Xác thực email</Text>
          <View style={{ width: 60 }} />
        </View>

        <StepIndicator currentStep={step} />

        <View style={styles.centeredContent}>
          <SectionCard
            title="Mã xác thực"
            icon="email-check-outline"
            accentColor={GRADIENTS.navy[0]}
            style={styles.choiceCard}
          >
            <View style={styles.otpInner}>
              <View style={styles.otpIconWrap}>
                <MaterialCommunityIcons name="email-check" size={48} color={GRADIENTS.navy[0]} />
              </View>
              <Text style={styles.otpTitle}>Nhập mã OTP</Text>
              <Text style={styles.otpSubtitle}>
                Mã xác thực gồm 6 chữ số đã được gửi đến email{'\n'}
                <Text style={styles.otpEmail}>{email}</Text>
              </Text>

              <CodeInput value={otpCode} onChange={setOtpCode} length={6} theme={theme} />

              <Button
                mode="contained"
                onPress={handleVerifyOtp}
                loading={otpSending}
                disabled={otpSending || otpCode.length < 6}
                contentStyle={styles.primaryBtn}
                labelStyle={styles.primaryBtnLabel}
                style={styles.primaryBtnWrapper}
              >
                Xác thực
              </Button>

              <Button
                mode="text"
                onPress={handleResendOtp}
                disabled={otpCooldown > 0}
                labelStyle={[styles.resendLabel, otpCooldown > 0 && styles.resendLabelDisabled]}
              >
                {otpCooldown > 0 ? `Gửi lại sau ${otpCooldown}s` : 'Gửi lại mã'}
              </Button>
            </View>
          </SectionCard>
        </View>

        <NoticeSnackbar visible={!!snackbar} message={snackbar} severity={snackbarSeverity} onDismiss={() => setSnackbar('')} />
      </SafeAreaView>
    );
  }

  if (step === 'choice') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centeredContent}>
          <SectionCard accentColor={GRADIENTS.emerald[0]} style={styles.choiceCard}>
            <View style={styles.choiceInner}>
              <View style={styles.successCircle}>
                <MaterialCommunityIcons name="check" size={40} color={GRADIENTS.emerald[0]} />
              </View>
              <Text variant="headlineSmall" style={styles.choiceTitle}>Đăng ký thành công</Text>
              <Text style={styles.choiceSubtitle}>
                Bạn có muốn đăng ký khuôn mặt để đăng nhập nhanh tại cổng thư viện không?
              </Text>
              <Button
                mode="contained"
                onPress={() => setStep('consent')}
                contentStyle={styles.primaryBtn}
                labelStyle={styles.primaryBtnLabel}
                style={styles.primaryBtnWrapper}
              >
                Đăng ký khuôn mặt
              </Button>
              <Button mode="text" onPress={() => navigation.replace('Login')} labelStyle={styles.skipLabel}>
                Bỏ qua
              </Button>
            </View>
          </SectionCard>
        </View>
        <NoticeSnackbar visible={!!snackbar} message={snackbar} severity={snackbarSeverity} onDismiss={() => setSnackbar('')} />
      </SafeAreaView>
    );
  }

  if (step === 'consent') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centeredContent}>
          <SectionCard
            title="Thu thập dữ liệu sinh học"
            icon="file-document-check"
            accentColor={GRADIENTS.amber[0]}
            style={styles.choiceCard}
          >
            <View style={styles.consentInner}>
              <Text style={styles.consentText}>
                Ứng dụng sẽ thu thập hình ảnh khuôn mặt của bạn để xác thực danh tính. Dữ liệu được bảo mật và chỉ dùng cho mục đích xác thực.
              </Text>
              <Button
                mode={consentGiven ? 'contained' : 'outlined'}
                onPress={() => setConsentGiven(!consentGiven)}
                icon={consentGiven ? 'check' : undefined}
                contentStyle={styles.consentBtn}
                style={consentGiven ? styles.consentActiveBtn : styles.consentInactiveBtn}
              >
                {consentGiven ? 'Đã đồng ý' : 'Tôi đồng ý'}
              </Button>
              <Button
                mode="contained"
                onPress={() => setStep('face')}
                disabled={!consentGiven}
                contentStyle={styles.primaryBtn}
                labelStyle={styles.primaryBtnLabel}
                style={styles.primaryBtnWrapper}
              >
                Tiếp tục
              </Button>
              <Button mode="text" onPress={() => setStep('choice')} labelStyle={styles.skipLabel}>
                Từ chối
              </Button>
            </View>
          </SectionCard>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'face') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <SectionCard
          title="Đăng ký khuôn mặt"
          icon="face-recognition"
          accentColor={GRADIENTS.violet[0]}
          style={styles.faceHeaderCard}
        >
          <View style={styles.faceHeaderInner}>
            <Text style={styles.mutedText}>Chụp khuôn mặt từ 4 góc để đăng nhập nhanh sau này.</Text>
          </View>
        </SectionCard>

        <View style={styles.captureContainer}>
          <AutoFaceCapture onFilesReady={handleFaceEnroll} onError={showError} />
        </View>

        {!isUploading ? (
          <View style={styles.faceFooter}>
            <Button mode="text" onPress={() => navigation.replace('Login')} labelStyle={styles.skipLabel}>
              Bỏ qua
            </Button>
          </View>
        ) : null}

        {isUploading ? (
          <LoadingOverlay loading message="Đang đăng ký khuôn mặt..." />
        ) : null}

        <NoticeSnackbar visible={!!snackbar} message={snackbar} severity={snackbarSeverity} onDismiss={() => setSnackbar('')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          icon="arrow-left"
          compact
          labelStyle={styles.backLabel}
        >
          Quay lại
        </Button>
        <Text variant="titleMedium" style={styles.headerTitle}>Đăng ký</Text>
        <View style={{ width: 60 }} />
      </View>

      <StepIndicator currentStep={step} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <SectionCard
          title="Thông tin tài khoản"
          icon="form-textbox"
          accentColor={GRADIENTS.indigo[0]}
        >
          <View style={styles.formInner}>
            <Text style={styles.formSubtitle}>Nhập thông tin để tạo tài khoản độc giả mới.</Text>

            {studentCode || fullName ? (
              <View style={styles.prefillBanner}>
                <MaterialCommunityIcons name="check-circle" size={16} color={GRADIENTS.emerald[0]} />
                <Text style={styles.prefillText}>Đã điền thông tin từ thẻ sinh viên</Text>
              </View>
            ) : null}

            <TextInput
              label="Mã sinh viên"
              value={studentCode}
              onChangeText={setStudentCode}
              mode="outlined"
              autoCapitalize="none"
              left={<TextInput.Icon icon="account" color={theme.colors.onSurfaceVariant} />}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />
            {studentCodeCheck === 'checking' ? (
              <View style={styles.codeCheckRow}>
                <ActivityIndicator size={14} color={theme.colors.primary} />
                <Text style={styles.codeCheckText}>Đang kiểm tra...</Text>
              </View>
            ) : studentCodeCheck === 'exists' ? (
              <View style={[styles.codeCheckRow, styles.codeCheckRowError]}>
                <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.error} />
                <Text style={[styles.codeCheckText, { color: theme.colors.error }]}>Mã sinh viên đã tồn tại</Text>
              </View>
            ) : studentCodeCheck === 'available' ? (
              <View style={[styles.codeCheckRow, styles.codeCheckRowSuccess]}>
                <MaterialCommunityIcons name="check-circle" size={16} color={GRADIENTS.emerald[0]} />
                <Text style={[styles.codeCheckText, { color: GRADIENTS.emerald[0] }]}>Mã sinh viên hợp lệ</Text>
              </View>
            ) : null}

            <TextInput
              label="Họ và tên"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              left={<TextInput.Icon icon="account-outline" color={theme.colors.onSurfaceVariant} />}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />

            <TextInput
              label="Lớp (không bắt buộc)"
              value={className}
              onChangeText={setClassName}
              mode="outlined"
              left={<TextInput.Icon icon="school" color={theme.colors.onSurfaceVariant} />}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />

            <TextInput
              label="Khóa học (không bắt buộc)"
              value={course}
              onChangeText={setCourse}
              mode="outlined"
              placeholder="VD: 2022 - 2026"
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="bookmark-outline" color={theme.colors.onSurfaceVariant} />}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginTop: -8, paddingHorizontal: 4 }}>
              Nhập dạng 2022 - 2026, 2022-2026 hoặc K22 đều được
            </Text>

            <TextInput
              label="HKTT (không bắt buộc)"
              value={permanentAddress}
              onChangeText={setPermanentAddress}
              mode="outlined"
              multiline
              numberOfLines={2}
              left={<TextInput.Icon icon="home-outline" color={theme.colors.onSurfaceVariant} />}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              left={<TextInput.Icon icon="email" color={theme.colors.onSurfaceVariant} />}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />
            {emailCheck === 'checking' ? (
              <View style={styles.codeCheckRow}>
                <ActivityIndicator size={14} color={theme.colors.primary} />
                <Text style={styles.codeCheckText}>Đang kiểm tra email...</Text>
              </View>
            ) : emailCheck === 'exists' ? (
              <View style={[styles.codeCheckRow, styles.codeCheckRowError]}>
                <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.error} />
                <Text style={[styles.codeCheckText, { color: theme.colors.error }]}>Email đã được đăng ký</Text>
              </View>
            ) : emailCheck === 'available' ? (
              <View style={[styles.codeCheckRow, styles.codeCheckRowSuccess]}>
                <MaterialCommunityIcons name="check-circle" size={16} color={GRADIENTS.emerald[0]} />
                <Text style={[styles.codeCheckText, { color: GRADIENTS.emerald[0] }]}>Email hợp lệ</Text>
              </View>
            ) : null}

            <TextInput
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              left={<TextInput.Icon icon="lock" color={theme.colors.onSurfaceVariant} />}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />

            <TextInput
              label="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              left={<TextInput.Icon icon="lock-check" color={theme.colors.onSurfaceVariant} />}
              outlineStyle={styles.inputOutline}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={async () => {
                if (!validateForm()) return;
                if (otpSending) return;
                try {
                  const result = await authApi.checkExists(studentCode.trim(), email.trim());
                  if (result.student_code_exists) {
                    showError('Mã sinh viên đã tồn tại');
                    return;
                  }
                  if (result.email_exists) {
                    showError('Email đã được đăng ký');
                    return;
                  }
                } catch (e: any) {
                  const detail = e?.response?.data?.error || e?.message || '';
                  console.error('[Register] checkExists failed', detail, e);
                  showError(detail ? `Không thể kiểm tra: ${detail}` : 'Không thể kiểm tra thông tin — hãy kiểm tra mạng và thử lại');
                  return;
                }
                handleSendOtp();
              }}
              loading={otpSending}
              disabled={otpSending || studentCodeCheck === 'checking' || emailCheck === 'checking' || studentCodeCheck === 'exists' || emailCheck === 'exists'}
              contentStyle={styles.primaryBtn}
              labelStyle={styles.primaryBtnLabel}
              style={styles.primaryBtnWrapper}
            >
              Đăng ký
            </Button>

            <Button mode="text" onPress={() => navigation.goBack()} labelStyle={styles.loginLink}>
              Đã có tài khoản? Đăng nhập
            </Button>
          </View>
        </SectionCard>
      </ScrollView>

      <NoticeSnackbar visible={!!snackbar} message={snackbar} severity={snackbarSeverity} onDismiss={() => setSnackbar('')} />
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    centeredContent: {
      flex: 1,
      justifyContent: 'center',
      padding: 16,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 16,
      paddingBottom: 32,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    backLabel: {
      fontSize: 14,
      color: theme.colors.primary,
    },
    headerTitle: {
      color: theme.colors.onSurface,
      fontWeight: '800',
    },
    formInner: {
      gap: 12,
      padding: 16,
    },
    formSubtitle: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    input: {
      backgroundColor: 'transparent',
    },
    inputOutline: {
      borderRadius: 12,
    },
    prefillBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: `${GRADIENTS.emerald[0]}18`,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    prefillText: {
      color: GRADIENTS.emerald[0],
      fontSize: 13,
      fontWeight: '600',
    },
    primaryBtn: {
      minHeight: 52,
      borderRadius: 12,
    },
    primaryBtnLabel: {
      fontWeight: '800',
      fontSize: 15,
    },
    primaryBtnWrapper: {
      borderRadius: 12,
      marginTop: 4,
    },
    loginLink: {
      fontSize: 14,
      fontWeight: '600',
    },
    skipLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    codeCheckRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    codeCheckRowError: {
      backgroundColor: `${theme.colors.error}15`,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    codeCheckRowSuccess: {
      backgroundColor: `${GRADIENTS.emerald[0]}15`,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    codeCheckText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    choiceCard: {
      borderRadius: 14,
    },
    choiceInner: {
      alignItems: 'center',
      gap: 14,
      padding: 24,
    },
    successCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${GRADIENTS.emerald[0]}20`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    choiceTitle: {
      color: theme.colors.onSurface,
      textAlign: 'center',
      fontWeight: '900',
    },
    choiceSubtitle: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
    },
    consentInner: {
      gap: 12,
      padding: 16,
    },
    consentText: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    consentBtn: {
      minHeight: 44,
      borderRadius: 8,
    },
    consentActiveBtn: {
      borderRadius: 8,
      backgroundColor: `${GRADIENTS.emerald[0]}20`,
      borderColor: GRADIENTS.emerald[0],
    },
    consentInactiveBtn: {
      borderRadius: 8,
    },
    faceHeaderCard: {
      margin: 12,
      marginBottom: 0,
      borderRadius: 14,
    },
    faceHeaderInner: {
      padding: 16,
    },
    mutedText: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    captureContainer: {
      flex: 1,
    },
    faceFooter: {
      padding: 12,
    },
    otpInner: {
      alignItems: 'center',
      gap: 14,
      padding: 24,
    },
    otpIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${GRADIENTS.blue[0]}20`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    otpTitle: {
      color: theme.colors.onSurface,
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'center',
    },
    otpSubtitle: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
    },
    otpEmail: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    resendLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    resendLabelDisabled: {
      opacity: 0.5,
    },
  });
}
