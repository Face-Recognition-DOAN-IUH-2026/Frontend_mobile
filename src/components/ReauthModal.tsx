import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import bus from '../lib/event-bus';
import { retryPendingRequests, cancelPendingRequests } from '../api/client';
import { authApi } from '../api/auth';

export default function ReauthModal() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = bus.on('auth:required', () => setVisible(true));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      cancelPendingRequests();
      setVisible(false);
      setPassword('');
      setError('');
    }, 30000);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleReauth = async () => {
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res?.access_token) {
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

  const handleCancel = () => {
    cancelPendingRequests();
    setVisible(false);
    setPassword('');
    setError('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.card}>
            <Text style={styles.title}>Phiên đăng nhập hết hạn</Text>
            <Text style={styles.subtitle}>Vui lòng đăng nhập lại để tiếp tục</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

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
              onPress={handleReauth}
              disabled={loading || !email || !password}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
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
});
