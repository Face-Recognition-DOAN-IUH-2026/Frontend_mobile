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
import { scheduleApi, ShiftSwap } from '../api/schedule';

interface OpenShift {
  shift: { id: string; name: string; startTime: string; endTime: string } | null;
  zone: { id: string; zoneName: string } | null;
  workDate: string;
}

export default function OpenShiftsScreen() {
  const theme = useTheme() as AppTheme;
  const [shifts, setShifts] = useState<OpenShift[]>([]);
  const [openSwaps, setOpenSwaps] = useState<ShiftSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [biddingId, setBiddingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const loadData = useCallback(async () => {
    try {
      const [shiftResult, swapResult] = await Promise.all([
        scheduleApi.getOpenShifts(),
        scheduleApi.listMySwaps('pending').catch(() => []),
      ]);
      setShifts(Array.isArray(shiftResult) ? shiftResult.slice(0, 30) : []);
      const openSwapList = Array.isArray(swapResult)
        ? swapResult.filter((s: ShiftSwap) => !s.targetStaffId && s.status === 'pending')
        : [];
      setOpenSwaps(openSwapList);
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

  const handleClaimSwap = async (swapId: string) => {
    setClaimingId(swapId);
    try {
      await scheduleApi.claimOpenSwap(swapId);
      Alert.alert('Thành công', 'Đã nhận yêu cầu đổi ca mở!');
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Không thể nhận yêu cầu đổi ca';
      Alert.alert('Lỗi', msg);
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return <LoadingOverlay loading message="Đang tải ca trống..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <GradientHeader
        title="Ca trống sắp tới"
        subtitle={`${shifts.length + openSwaps.length} ca`}
        icon="clock-outline"
      />

      {shifts.length === 0 ? (
        <EmptyState
          icon="check-circle-outline"
          title="Không có ca trống"
          description="Không có ca trống trong 2 tuần tới"
        />
      ) : (
        <SectionCard title="Ca trống" icon="clock-outline" accentColor={GRADIENTS.indigo[0]}>
        {shifts.map((s, idx) => {
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
        })}
        </SectionCard>
      )}

      {openSwaps.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đổi ca mở</Text>
          <Text style={styles.sectionHint}>Bất kỳ ai cũng có thể nhận yêu cầu đổi ca này</Text>
          {openSwaps.map((swap) => (
            <View key={swap.id} style={styles.shiftCard}>
              <View style={styles.shiftInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="swap-horizontal" size={16} color="#8b5cf6" />
                  <Text style={[styles.shiftName, { color: '#8b5cf6' }]}>Đổi ca mở</Text>
                </View>
                <Text style={styles.shiftTime}>
                  Ca: {swap.requesterAssignmentId.slice(0, 8)}... · {new Date(swap.createdAt).toLocaleDateString('vi-VN')}
                </Text>
                {swap.reason ? (
                  <Text style={styles.shiftZone}>Lý do: {swap.reason}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.claimButton, claimingId === swap.id && styles.disabledButton]}
                onPress={() => handleClaimSwap(swap.id)}
                disabled={claimingId === swap.id}
              >
                <Ionicons name="hand-right-outline" size={16} color="#fff" />
                <Text style={styles.bidButtonText}>Nhận</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.outline,
  },
  shiftInfo: { flex: 1 },
  shiftName: { fontSize: 14, fontWeight: '700', color: c.onSurface },
  shiftZone: { fontSize: 12, color: c.onSurfaceVariant, marginTop: 2 },
  shiftTime: { fontSize: 11, color: c.outline, marginTop: 4 },
  bidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  disabledButton: { opacity: 0.5 },
  bidButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: c.onSurface, marginBottom: 4 },
  sectionHint: { fontSize: 11, color: c.outline, marginBottom: 8 },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
});
}
