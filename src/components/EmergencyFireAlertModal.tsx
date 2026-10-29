import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Linking,
  ScrollView,
} from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { triggerHaptic } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface HazardAlertData {
  camera_id?: string;
  location?: string;
  hazard_type?: string;
  confidence?: number;
  fire_count?: number;
  smoke_count?: number;
  timestamp?: number;
  roleTarget?: 'staff' | 'patron';
}

interface EmergencyFireAlertModalProps {
  visible: boolean;
  hazard: HazardAlertData | null;
  isStaff: boolean;
  onDismiss: () => void;
}

export default function EmergencyFireAlertModal({
  visible,
  hazard,
  isStaff,
  onDismiss,
}: EmergencyFireAlertModalProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;

    // Rung cảnh báo khẩn cấp
    triggerHaptic.error();
    const hapticInterval = setInterval(() => {
      triggerHaptic.error();
    }, 2500);

    // Hiệu ứng nhấp nháy viền đỏ cảnh báo
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    const borderPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnim, {
          toValue: 0.2,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    );

    pulse.start();
    borderPulse.start();

    return () => {
      clearInterval(hapticInterval);
      pulse.stop();
      borderPulse.stop();
    };
  }, [visible, pulseAnim, borderAnim]);

  if (!hazard) return null;

  const isSmoke = hazard.hazard_type === 'smoke';
  const locationText = hazard.location || 'Khu vực Thư viện';
  const confPercent = Math.round((hazard.confidence || 0.9) * 100);

  const handleCallFireDept = () => {
    Linking.openURL('tel:114').catch(() => {});
  };

  const handleCallLibraryHotline = () => {
    Linking.openURL('tel:02838940390').catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Surface style={styles.card} elevation={5}>
          {/* Header Báo động */}
          <View style={styles.header}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <MaterialCommunityIcons
                name={isSmoke ? 'weather-fog' : 'fire-alert'}
                size={56}
                color="#FFFFFF"
              />
            </Animated.View>
            <Text style={styles.headerTitle}>
              {isSmoke ? 'CẢNH BÁO PHÁT HIỆN KHÓI' : 'BÁO ĐỘNG CHÁY KHẨN CẤP'}
            </Text>
            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>
                {isStaff ? 'TÁC CHIẾN PCCC (STAFF / ADMIN)' : 'HƯỚNG DẪN SƠ TÁN AN TOÀN'}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {/* Vị trí sự cố */}
            <View style={styles.locationBox}>
              <MaterialCommunityIcons name="map-marker-radius" size={24} color="#EF4444" />
              <View style={styles.locationTextWrap}>
                <Text style={styles.locationLabel}>Vị trí phát hiện:</Text>
                <Text style={styles.locationVal}>{locationText}</Text>
              </View>
            </View>

            {isStaff ? (
              /* Giao diện dành riêng cho Staff / Admin */
              <View style={styles.detailsContainer}>
                <Text style={styles.sectionHeader}>THÔNG SỐ KỸ THUẬT CAMERA AI</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mã Camera:</Text>
                  <Text style={styles.infoValue}>{hazard.camera_id || 'CAM-PCCC-01'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Loại nguy cơ:</Text>
                  <Text style={[styles.infoValue, { color: '#EF4444', fontWeight: 'bold' }]}>
                    {isSmoke ? 'Khói đậm đặc' : 'Lửa bốc cháy'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Độ tin cậy AI:</Text>
                  <Text style={[styles.infoValue, { color: '#10B981', fontWeight: 'bold' }]}>
                    {confPercent}%
                  </Text>
                </View>

                <View style={styles.actionNoteBox}>
                  <MaterialCommunityIcons name="shield-alert" size={20} color="#F59E0B" />
                  <Text style={styles.actionNoteText}>
                    Yêu cầu nhân viên lập tức tiếp cận khu vực kiểm tra, chuẩn bị bình chữa cháy CO2/Bột và hướng dẫn độc giả sơ tán nếu cần thiết.
                  </Text>
                </View>
              </View>
            ) : (
              /* Giao diện dành riêng cho Patron (Độc giả) */
              <View style={styles.detailsContainer}>
                <View style={styles.warningDangerBox}>
                  <MaterialCommunityIcons name="elevator-passenger-off" size={28} color="#FFFFFF" />
                  <Text style={styles.warningDangerText}>
                    TUYỆT ĐỐI KHÔNG SỬ DỤNG THANG MÁY KHI SƠ TÁN!
                  </Text>
                </View>

                <Text style={styles.sectionHeader}>HƯỚNG DẪN THOÁT HIỂM AN TOÀN</Text>
                <View style={styles.stepItem}>
                  <View style={styles.stepBadge}><Text style={styles.stepNum}>1</Text></View>
                  <Text style={styles.stepText}>Giữ bình tĩnh, quan sát biển chỉ dẫn EXIT màu xanh lá.</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepBadge}><Text style={styles.stepNum}>2</Text></View>
                  <Text style={styles.stepText}>Di chuyển bằng cầu thang bộ thoát hiểm ra khỏi tòa nhà.</Text>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepBadge}><Text style={styles.stepNum}>3</Text></View>
                  <Text style={styles.stepText}>Dùng khăn ướt hoặc tay áo che kín mũi, miệng để tránh khói độc.</Text>
                </View>
              </View>
            )}

            {/* Số điện thoại khẩn cấp */}
            <View style={styles.hotlineRow}>
              <TouchableOpacity style={styles.callBtn114} onPress={handleCallFireDept}>
                <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Gọi 114 (Cứu Hỏa)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.callBtnLib} onPress={handleCallLibraryHotline}>
                <MaterialCommunityIcons name="phone-classic" size={18} color="#1E293B" />
                <Text style={[styles.callBtnText, { color: '#1E293B' }]}>Hotline IUH</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Nút xác nhận */}
          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={onDismiss}
              buttonColor={isStaff ? '#1E293B' : '#EF4444'}
              textColor="#FFFFFF"
              style={styles.confirmBtn}
              labelStyle={styles.confirmBtnLabel}
            >
              {isStaff ? 'Đã tiếp nhận thông tin sự cố' : 'Tôi đã hiểu & Đang sơ tán'}
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#EF4444',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#DC2626',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  badgeWrap: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  badgeText: {
    color: '#FEF08A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contentScroll: {
    padding: 16,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginBottom: 16,
  },
  locationTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  locationLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  locationVal: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  infoValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  actionNoteBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    alignItems: 'flex-start',
    gap: 8,
  },
  actionNoteText: {
    color: '#FDE68A',
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  warningDangerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 16,
  },
  warningDangerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
    lineHeight: 18,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    color: '#E2E8F0',
    fontSize: 13.5,
    flex: 1,
    lineHeight: 19,
  },
  hotlineRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  callBtn114: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  callBtnLib: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  confirmBtnLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
});
