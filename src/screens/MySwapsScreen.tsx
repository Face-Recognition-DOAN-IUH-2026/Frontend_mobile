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
import { scheduleApi, ShiftSwap } from '../api/schedule';

export default function MySwapsScreen() {
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const result = await scheduleApi.listMySwaps();
      setSwaps(Array.isArray(result) ? result.filter((s) => s.status === 'pending') : []);
    } catch (err) {
      console.error('Failed to load swaps:', err);
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

  const handleRespond = async (id: string, action: 'accepted' | 'rejected') => {
    setRespondingId(id);
    try {
      await scheduleApi.respondSwap(id, action);
      loadData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.error || 'Không thể xử lý');
    } finally {
      setRespondingId(null);
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
        <Text style={styles.title}>Yêu cầu đổi ca</Text>
      </View>

      {swaps.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="swap-horizontal-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>Không có yêu cầu đổi ca nào</Text>
        </View>
      ) : (
        swaps.map((swap) => (
          <View key={swap.id} style={styles.swapCard}>
            <View style={styles.swapHeader}>
              <Ionicons name="swap-horizontal" size={20} color="#6366f1" />
              <View style={styles.swapInfo}>
                <Text style={styles.swapLabel}>Yêu cầu từ</Text>
                <Text style={styles.swapStaff}>{swap.requesterStaffId.slice(0, 8)}...</Text>
              </View>
            </View>
            {swap.reason && (
              <Text style={styles.swapReason}>Lý do: {swap.reason}</Text>
            )}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.acceptButton, respondingId === swap.id && styles.disabledButton]}
                onPress={() => handleRespond(swap.id, 'accepted')}
                disabled={respondingId === swap.id}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.acceptButtonText}>Chấp nhận</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectButton, respondingId === swap.id && styles.disabledButton]}
                onPress={() => handleRespond(swap.id, 'rejected')}
                disabled={respondingId === swap.id}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.rejectButtonText}>Từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
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
  swapCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  swapHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swapInfo: { flex: 1 },
  swapLabel: { fontSize: 11, color: '#64748b' },
  swapStaff: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
  swapReason: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  disabledButton: { opacity: 0.5 },
  acceptButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rejectButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
