import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import bus from '../lib/event-bus';
import { retryPendingRequests, cancelPendingRequests } from '../api/client';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { devError } from '../utils/logger';

type ReauthMode = 'staff' | 'patron' | 'face';

export default function ReauthModal() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<ReauthMode>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const reauthSucceededRef = useRef(false);

  useEffect(() => {
    const unsub = bus.on('auth:required', () => {
      reauthSucceededRef.current = false;
      const role = user?.role;
      if (role === 'admin' || role === 'staff') {
        setMode('staff');
      } else {
        setMode('patron');
      }
      setVisible(true);
    });
    return () => unsub();
  }, [user?.role]);

  useEffect(() => {
    if (!visible) {
      setEmail('');
      setPassword('');
      setStudentCode('');
      setError('');
      if (!reauthSucceededRef.current) {
        cancelPendingRequests();
      }
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      handleDismiss();
    }, 60000);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const handleFaceLogin = useCallback(async () => {
    try {
      const { faceLogin } = await import('../context/AuthContext').then(m => m.useAuth());
      // Face login requires camera - emit event to trigger face login flow
      bus.emit('face:reauth-required');
      setVisible(false);
    } catch (err) {
      devError('[ReauthModal] Face login not available:', err);
      setError('Đăng nhập khuôn mặt không khả dụng');
    }
  }, []);

  const handleReauthStaff = async () => {
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res?.access_token) {
        reauthSucceededRef.current = true;
        retryPendingRequests(res.access_token);
        setVisible(false);
        setPassword('');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleReauthPatron = async () => {
    if (!studentCode || !password) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.patronLogin({ student_code: studentCode, password });
      if (res?.access_token) {
        reauthSucceededRef.current = true;
        retryPendingRequests(res.access_token);
        setVisible(false);
        setPassword('');
        setStudentCode('');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss} presentationStyle="fullScreen" supportedOrientations={['portrait']}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.card}>
            <Text style={styles.title}>Phiên đăng nhập hết hạn</Text>
            <Text style={styles.subtitle}>Vui lòng đăng nhập lại để tiếp tục</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'staff' && styles.modeTabActive]}
                onPress={() => setMode('staff')}
              >
                <Text style={[styles.modeTabText, mode === 'staff' && styles.modeTabTextActive]}>Nhân viên</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'patron' && styles.modeTabActive]}
                onPress={() => setMode('patron')}
              >
                <Text style={[styles.modeTabText, mode === 'patron' && styles.modeTabTextActive]}>Sinh viên</Text>
              </TouchableOpacity>
            </View>

            {mode === 'staff' ? (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoFocus
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Mã sinh viên</Text>
                <TextInput
                  style={styles.input}
                  value={studentCode}
                  onChangeText={setStudentCode}
                  placeholder="Mã sinh viên"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoFocus
                />
              </>
            )}

            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={mode === 'staff' ? handleReauthStaff : handleReauthPatron}
              disabled={loading || (mode === 'staff' ? (!email || !password) : (!studentCode || !password))}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleDismiss}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  error: {
    color: '#d32f2f',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 10,
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
  },
  modeTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#1976d2',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  modeTabTextActive: {
    color: '#fff',
  },
});
