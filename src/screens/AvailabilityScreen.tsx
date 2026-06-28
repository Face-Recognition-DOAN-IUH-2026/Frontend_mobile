import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scheduleApi } from '../api/schedule';
import { StaffAvailabilityRequest } from '../types';

export default function AvailabilityScreen() {
  const [requests, setRequests] = useState<StaffAvailabilityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await scheduleApi.getMyAvailability();
      setRequests(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Failed to load availability:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    if (!dateFrom || !dateTo) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ ngày');
      return;
    }
    setSubmitting(true);
    try {
      await scheduleApi.requestAvailability(dateFrom, dateTo, reason || undefined);
      setShowForm(false);
      setDateFrom('');
      setDateTo('');
      setReason('');
      loadData();
      Alert.alert('Thành công', 'Đã gửi yêu cầu xin nghỉ');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.error || 'Không thể gửi yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Từ chối';
      default: return 'Chờ duyệt';
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Xin nghỉ / Không khả dụng</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Từ ngày (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={dateFrom}
            onChangeText={setDateFrom}
            placeholder="2026-07-01"
            placeholderTextColor="#666"
          />
          <Text style={styles.formLabel}>Đến ngày (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={dateTo}
            onChangeText={setDateTo}
            placeholder="2026-07-05"
            placeholderTextColor="#666"
          />
          <Text style={styles.formLabel}>Lý do (không bắt buộc)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            placeholder="Nhập lý do..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>Chưa có yêu cầu nào</Text>
        </View>
      ) : (
        requests.map((req) => (
          <View key={req.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestDate}>
                {req.dateFrom} — {req.dateTo}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>
                  {getStatusLabel(req.status)}
                </Text>
              </View>
            </View>
            {req.reason && (
              <Text style={styles.requestReason}>Lý do: {req.reason}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#e2e8f0' },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    backgroundColor: '#1e293b',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 4, fontWeight: '600' },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 12,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  submitButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#666', fontSize: 14, marginTop: 12 },
  requestCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestDate: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  requestReason: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
});
