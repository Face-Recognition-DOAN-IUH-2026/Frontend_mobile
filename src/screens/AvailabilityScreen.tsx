import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../theme/DarkTheme';
import { GradientHeader, SectionCard, EmptyState, GRADIENTS } from '../theme/MobileDesignSystem';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { scheduleApi } from '../api/schedule';
import { StaffAvailabilityRequest } from '../types';

export default function AvailabilityScreen() {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [requests, setRequests] = useState<StaffAvailabilityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ dateFrom?: string; dateTo?: string; general?: string }>({});

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

  const validateDate = (dateStr: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  };

  const handleSubmit = async () => {
    const newErrors: { dateFrom?: string; dateTo?: string } = {};
    setErrors({});

    if (!dateFrom) {
      newErrors.dateFrom = 'Vui lòng nhập ngày bắt đầu';
    } else if (!validateDate(dateFrom)) {
      newErrors.dateFrom = 'Định dạng ngày không hợp lệ (YYYY-MM-DD)';
    }

    if (!dateTo) {
      newErrors.dateTo = 'Vui lòng nhập ngày kết thúc';
    } else if (!validateDate(dateTo)) {
      newErrors.dateTo = 'Định dạng ngày không hợp lệ (YYYY-MM-DD)';
    } else if (dateFrom && dateTo && dateTo < dateFrom) {
      newErrors.dateTo = 'Ngày kết thúc phải >= ngày bắt đầu';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await scheduleApi.requestAvailability(dateFrom, dateTo, reason || undefined);
      setShowForm(false);
      setDateFrom('');
      setDateTo('');
      setReason('');
      setErrors({});
      loadData();
      Alert.alert('Thành công', 'Đã gửi yêu cầu xin nghỉ');
    } catch (err: any) {
      setErrors({ general: err?.response?.data?.error || 'Không thể gửi yêu cầu' });
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
    return <LoadingOverlay loading message="Đang tải..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <GradientHeader
        title="Xin nghỉ"
        subtitle="Không khả dụng"
        icon="calendar-remove"
        right={
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowForm(!showForm)} style={styles.addButton}>
            <MaterialCommunityIcons name={showForm ? 'close' : 'plus'} size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {showForm ? (
        <View style={styles.formCard}>
          {errors.general ? (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={16} color="#ef4444" />
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          ) : null}
          <Text style={styles.formLabel}>Từ ngày (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, errors.dateFrom && styles.inputError]}
            value={dateFrom}
            onChangeText={(t) => { setDateFrom(t); setErrors(e => ({ ...e, dateFrom: undefined })); }}
            placeholder="2026-07-01"
            placeholderTextColor="#666"
          />
          {errors.dateFrom ? (
            <Text style={styles.fieldErrorText}>{errors.dateFrom}</Text>
          ) : null}
          <Text style={styles.formLabel}>Đến ngày (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, errors.dateTo && styles.inputError]}
            value={dateTo}
            onChangeText={(t) => { setDateTo(t); setErrors(e => ({ ...e, dateTo: undefined })); }}
            placeholder="2026-07-05"
            placeholderTextColor="#666"
          />
          {errors.dateTo ? (
            <Text style={styles.fieldErrorText}>{errors.dateTo}</Text>
          ) : null}
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
      ) : null}

      {requests.length === 0 ? (
        <EmptyState
          icon="calendar-remove-outline"
          title="Chưa có yêu cầu"
          description="Bạn chưa gửi yêu cầu xin nghỉ nào"
        />
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
            {req.reason ? (
              <Text style={styles.requestReason}>Lý do: {req.reason}</Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    backgroundColor: c.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.outline,
  },
  formLabel: { fontSize: 12, color: c.onSurfaceVariant, marginBottom: 4, fontWeight: '600' },
  input: {
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: c.onSurface,
    marginBottom: 12,
  },
  inputError: { borderColor: '#ef4444' },
  fieldErrorText: { fontSize: 11, color: '#ef4444', marginTop: -8, marginBottom: 8 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorBannerText: { fontSize: 13, color: '#ef4444', flex: 1 },
  textArea: { height: 80, textAlignVertical: 'top' },
  submitButton: {
    backgroundColor: c.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  requestCard: {
    backgroundColor: c.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.outline,
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestDate: { fontSize: 14, fontWeight: '600', color: c.onSurface },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  requestReason: { fontSize: 12, color: c.onSurfaceVariant, marginTop: 6 },
  });
}
