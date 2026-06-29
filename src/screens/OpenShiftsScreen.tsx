import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scheduleApi } from '../api/schedule';

interface OpenShift {
  shift: { id: string; name: string; startTime: string; endTime: string } | null;
  zone: { id: string; zoneName: string } | null;
  workDate: string;
}

export default function OpenShiftsScreen() {
  const [shifts, setShifts] = useState<OpenShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [biddingId, setBiddingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const result = await scheduleApi.getOpenShifts();
      setShifts(Array.isArray(result) ? result.slice(0, 30) : []);
    } catch (err) {
      console.error('Failed to load open shifts:', err);
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

  const handleBid = async (shift: OpenShift) => {
    if (!shift.shift?.id || !shift.zone?.id) {
      Alert.alert('Lỗi', 'Thông tin ca không đầy đủ');
      return;
    }
    const key = `${shift.shift?.id}-${shift.zone?.id}-${shift.workDate}`;
    setBiddingId(key);
    try {
      const assignmentResult = await scheduleApi.createBid(shift.shift.id, `Open shift - ${shift.zone?.zoneName} - ${shift.workDate}`);
      if (assignmentResult && assignmentResult.id) {
        Alert.alert('Thành công', 'Đã đăng ký ca trống thành công!');
      } else {
        Alert.alert('Thành công', 'Đã gửi yêu cầu đăng ký ca trống. Chờ admin duyệt.');
      }
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Không thể đăng ký';
      Alert.alert('Lỗi', msg);
    } finally {
      setBiddingId(null);
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
        <Text style={styles.title}>Ca trống sắp tới</Text>
      </View>

      {shifts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>Không có ca trống trong 2 tuần tới</Text>
        </View>
      ) : (
        shifts.map((s, idx) => {
          const key = `${s.shift?.id}-${s.zone?.id}-${s.workDate}-${idx}`;
          const isBidding = biddingId === key;
          return (
            <View key={key} style={styles.shiftCard}>
              <View style={styles.shiftInfo}>
                <Text style={styles.shiftName}>{s.shift?.name || 'Ca'}</Text>
                <Text style={styles.shiftZone}>{s.zone?.zoneName}</Text>
                <Text style={styles.shiftTime}>
                  {new Date(s.workDate + 'T00:00:00').toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                  {' • '}
                  {s.shift?.startTime?.slice(0, 5)} — {s.shift?.endTime?.slice(0, 5)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.bidButton, isBidding && styles.disabledButton]}
                onPress={() => handleBid(s)}
                disabled={isBidding}
              >
                <Ionicons name="hand-left-outline" size={16} color="#fff" />
                <Text style={styles.bidButtonText}>Đăng ký</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#e2e8f0' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#666', fontSize: 14, marginTop: 12 },
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shiftInfo: { flex: 1 },
  shiftName: { fontSize: 14, fontWeight: '700', color: '#e2e8f0' },
  shiftZone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  shiftTime: { fontSize: 11, color: '#64748b', marginTop: 4 },
  bidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  disabledButton: { opacity: 0.5 },
  bidButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
