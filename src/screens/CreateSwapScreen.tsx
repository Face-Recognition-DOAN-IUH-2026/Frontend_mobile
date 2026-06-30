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
import { useNavigation } from '@react-navigation/native';
import { scheduleApi, ShiftSwap } from '../api/schedule';
import { StaffScheduleAssignment } from '../types';
import { toDateInput } from '../utils/dateUtils';

export default function CreateSwapScreen() {
  const navigation = useNavigation();
  const [myAssignments, setMyAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<StaffScheduleAssignment | null>(null);
  const [targetStaffId, setTargetStaffId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ assignment?: string; general?: string }>({});

  const todayStr = toDateInput(new Date());

  const loadData = useCallback(async () => {
    try {
      const result = await scheduleApi.getMySchedules();
      const upcoming = (result.items || []).filter(
        (a: StaffScheduleAssignment) => a.workDate >= todayStr
      );
      upcoming.sort((a: StaffScheduleAssignment, b: StaffScheduleAssignment) =>
        a.workDate.localeCompare(b.workDate) ||
        ((a.shift?.startTime || '').localeCompare(b.shift?.startTime || ''))
      );
      setMyAssignments(upcoming);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayStr]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatAssignment = (a: StaffScheduleAssignment) => {
    const date = new Date(a.workDate + 'T00:00:00');
    const dateStr = date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const time = a.shift
      ? `${a.shift.startTime?.slice(0, 5)} — ${a.shift.endTime?.slice(0, 5)}`
      : '';
    const zone = a.zone?.zoneName || a.zoneId || '';
    return { dateStr, time, zone, shiftName: a.shift?.name || 'Ca' };
  };

  const handleSubmit = async () => {
    const newErrors: { assignment?: string; general?: string } = {};
    if (!selectedAssignment) {
      newErrors.assignment = 'Vui lòng chọn ca muốn đổi';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const payload: Parameters<typeof scheduleApi.createSwap>[0] = {
        requesterAssignmentId: selectedAssignment!.id,
        reason: reason.trim() || undefined,
      };
      if (targetStaffId.trim()) {
        payload.targetStaffId = targetStaffId.trim();
      }
      await scheduleApi.createSwap(payload);
      Alert.alert('Thành công', 'Đã gửi yêu cầu đổi ca', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setErrors({ general: err?.response?.data?.error || err?.message || 'Không thể tạo yêu cầu đổi ca' });
    } finally {
      setSubmitting(false);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.title}>Yêu cầu đổi ca</Text>
      </View>

      {errors.general && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={16} color="#ef4444" />
          <Text style={styles.errorBannerText}>{errors.general}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Chọn ca muốn đổi *</Text>
        {errors.assignment && (
          <Text style={styles.fieldErrorText}>{errors.assignment}</Text>
        )}
        {myAssignments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Không có ca sắp tới để đổi</Text>
          </View>
        ) : (
          myAssignments.slice(0, 20).map((a) => {
            const { dateStr, time, zone, shiftName } = formatAssignment(a);
            const isSelected = selectedAssignment?.id === a.id;
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.shiftCard, isSelected && styles.shiftCardSelected]}
                onPress={() => {
                  setSelectedAssignment(a);
                  setErrors(e => ({ ...e, assignment: undefined }));
                }}
              >
                <View style={styles.shiftRadio}>
                  {isSelected
                    ? <Ionicons name="radio-button-on" size={22} color="#6366f1" />
                    : <Ionicons name="radio-button-off" size={22} color="#64748b" />}
                </View>
                <View style={styles.shiftInfo}>
                  <Text style={styles.shiftName}>{shiftName}</Text>
                  <Text style={styles.shiftZone}>{zone}</Text>
                  <Text style={styles.shiftTime}>{dateStr} · {time}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Người muốn đổi cùng (không bắt buộc)</Text>
        <Text style={styles.sectionHint}>Nhập ID nhân viên muốn đổi, hoặc để trống để tạo yêu cầu đổi ca mở — bất kỳ ai cũng có thể nhận</Text>
        <TextInput
          style={styles.input}
          value={targetStaffId}
          onChangeText={setTargetStaffId}
          placeholder="Staff ID hoặc để trống (mở)"
          placeholderTextColor="#666"
        />
        {!targetStaffId.trim() ? (
          <View style={styles.openSwapBadge}>
            <Ionicons name="globe-outline" size={14} color="#8b5cf6" />
            <Text style={styles.openSwapText}>Yêu cầu mở — bất kỳ ai cũng có thể nhận</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Lý do (không bắt buộc)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={reason}
          onChangeText={setReason}
          placeholder="VD: Trùng lịch học, việc gia đình..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Đang gửi...' : 'Gửi yêu cầu đổi ca'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#e2e8f0' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorBannerText: { fontSize: 13, color: '#ef4444', flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0', marginBottom: 8 },
  sectionHint: { fontSize: 12, color: '#64748b', marginBottom: 8, marginTop: -4 },
  fieldErrorText: { fontSize: 11, color: '#ef4444', marginBottom: 8 },
  emptyCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyText: { color: '#64748b', fontSize: 14 },
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  shiftCardSelected: { borderColor: '#6366f1', backgroundColor: '#6366f115' },
  shiftRadio: { marginRight: 12 },
  shiftInfo: { flex: 1 },
  shiftName: { fontSize: 14, fontWeight: '700', color: '#e2e8f0' },
  shiftZone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  shiftTime: { fontSize: 11, color: '#64748b', marginTop: 4 },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 12,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  openSwapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8b5cf615',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  openSwapText: { fontSize: 12, color: '#8b5cf6', fontWeight: '600' },
  submitButton: {
    backgroundColor: '#6366f1',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});