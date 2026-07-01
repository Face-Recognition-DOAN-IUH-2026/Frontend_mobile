import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '../theme/DarkTheme';
import { GradientHeader, SectionCard, EmptyState, GRADIENTS } from '../theme/MobileDesignSystem';
import { LoadingOverlay } from '../components/LoadingOverlay';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { scheduleApi, ShiftSwap } from '../api/schedule';

export default function MySwapsScreen() {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<any>();
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const result = await scheduleApi.listMySwaps();
      setSwaps(Array.isArray(result) ? result : []);
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
    return <LoadingOverlay loading message="Đang tải yêu cầu đổi ca..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <GradientHeader
        title="Yêu cầu đổi ca"
        subtitle={`${swaps.length} yêu cầu`}
        icon="swap-horizontal"
        right={
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('CreateSwap')} style={styles.addButton}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        }
      />

      {swaps.length === 0 ? (
        <EmptyState
          icon="swap-horizontal"
          title="Không có yêu cầu đổi ca"
          description="Bạn chưa có yêu cầu đổi ca nào"
        />
      ) : (
        swaps.map((swap) => {
          const statusColors: Record<string, string> = {
            pending: '#f59e0b',
            accepted: '#10b981',
            rejected: '#ef4444',
            cancelled: '#6b7280',
            expired: '#6b7280',
          };
          const statusLabels: Record<string, string> = {
            pending: 'Chờ xử lý',
            accepted: 'Chấp nhận',
            rejected: 'Từ chối',
            cancelled: 'Đã hủy',
            expired: 'Hết hạn',
          };
          const statusColor = statusColors[swap.status] || '#6b7280';
          const statusLabel = statusLabels[swap.status] || swap.status;
          const isOpenSwap = !swap.targetStaffId;
          return (
            <View key={swap.id} style={styles.swapCard}>
              <View style={styles.swapHeader}>
                <Ionicons name="swap-horizontal" size={20} color={c.primary} />
                <View style={styles.swapInfo}>
                  <Text style={styles.swapLabel}>Yêu cầu từ</Text>
                  <Text style={styles.swapStaff}>{swap.requesterStaffId.slice(0, 8)}...</Text>
                </View>
                {isOpenSwap ? (
                  <View style={styles.swapInfo}>
                    <Text style={styles.swapLabel}>Đến</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="globe-outline" size={12} color="#8b5cf6" />
                      <Text style={[styles.swapStaff, { color: '#8b5cf6' }]}>Mở</Text>
                    </View>
                  </View>
                ) : swap.targetStaffId ? (
                  <View style={styles.swapInfo}>
                    <Text style={styles.swapLabel}>Đến</Text>
                    <Text style={styles.swapStaff}>{swap.targetStaffId.slice(0, 8)}...</Text>
                  </View>
                ) : null}
                <View style={styles.swapStatus}>
                  <Text style={[styles.swapStatusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
              {swap.reason ? (
                <Text style={styles.swapReason}>Lý do: {swap.reason}</Text>
              ) : null}
              {swap.responseNote ? (
                <Text style={[styles.swapReason, { color: '#ef4444' }]}>Phản hồi: {swap.responseNote}</Text>
              ) : null}
              <View style={styles.swapMeta}>
                <Text style={styles.swapMetaText}>
                  Ca: {swap.requesterAssignmentId.slice(0, 8)}... → {swap.targetAssignmentId?.slice(0, 8) || 'chưa chọn'}
                </Text>
              </View>
              <View style={styles.timeline}>
                <Text style={styles.timelineText}>Tạo: {new Date(swap.createdAt).toLocaleString('vi-VN')}</Text>
                {swap.reviewedAt ? (
                  <Text style={styles.timelineText}>
                    {swap.status === 'accepted' ? 'Chấp nhận' : 'Từ chối'}: {new Date(swap.reviewedAt).toLocaleString('vi-VN')}
                  </Text>
                ) : null}
              </View>
              {swap.status === 'pending' ? (
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
              ) : null}
            </View>
          );
        })
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
    swapCard: {
      backgroundColor: c.surface,
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.outline,
    },
    swapHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    swapInfo: { flex: 1 },
    swapLabel: { fontSize: 11, color: c.onSurfaceVariant },
    swapStaff: { fontSize: 14, fontWeight: '600', color: c.onSurface },
    swapReason: { fontSize: 12, color: c.onSurfaceVariant, marginTop: 8 },
    swapMeta: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.outline },
    swapMetaText: { fontSize: 11, color: c.onSurfaceVariant },
    swapStatus: { alignItems: 'flex-end' },
    swapStatusText: { fontSize: 11, fontWeight: '700' },
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
    timeline: { marginTop: 6, gap: 2 },
    timelineText: { fontSize: 10, color: c.outline },
  });
}
