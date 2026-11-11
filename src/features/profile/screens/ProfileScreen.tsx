import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  Dialog,
  Divider,
  List,
  Portal,
  Switch,
  Text,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../../context/AuthContext';
import { useMobileTheme } from '../../../context/ThemeContext';
import { AppTheme } from '../../../theme/DarkTheme';
import { authApi } from '../../../api/auth';
import { paymentApi } from '../../../api/payment';
import { PatronFineItem, PaymentOrderResponse } from '../../../types/payment';
import { GradientHeader, SectionCard } from '../../../theme/MobileDesignSystem';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import MobileVietQrPaymentModal from '../../../components/MobileVietQrPaymentModal';
import { triggerHaptic } from '../../../utils/haptics';

interface ProfileScreenProps {
  navigation: any;
}

function InfoField({ icon, label, value, theme }: { icon: string; label: string; value: string; theme: AppTheme }) {
  return (
    <View style={infoStyles.row}>
      <View style={[infoStyles.iconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={theme.colors.primary} />
      </View>
      <View style={infoStyles.textWrap}>
        <Text style={[infoStyles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[infoStyles.value, { color: theme.colors.onSurface }]} selectable numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const theme = useTheme() as AppTheme;
  const c = theme.colors;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, patron, logout, updateUser } = useAuth();
  const { mode, toggleTheme } = useMobileTheme();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tokenSecondsLeft, setTokenSecondsLeft] = useState(30);
  const [tokenSeed, setTokenSeed] = useState(Date.now());
  const [fines, setFines] = useState<PatronFineItem[]>([]);
  const [loadingFines, setLoadingFines] = useState(false);
  const [payingFine, setPayingFine] = useState(false);
  const [qrPaymentOrder, setQrPaymentOrder] = useState<PaymentOrderResponse | null>(null);

  const loadFines = useCallback(async () => {
    try {
      setLoadingFines(true);
      const data = await paymentApi.getMyFines();
      setFines(data);
    } catch {
      // Best-effort
    } finally {
      setLoadingFines(false);
    }
  }, []);

  useEffect(() => {
    void loadFines();
  }, [loadFines]);

  const totalDebt = fines.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  const handlePayFines = async () => {
    if (fines.length === 0) return;
    triggerHaptic.selection();
    setPayingFine(true);
    try {
      const order = await paymentApi.createPaymentOrder(fines.map((f) => f.record_id));
      setQrPaymentOrder(order);
    } catch {
      Alert.alert('Lỗi', 'Không thể tạo mã thanh toán VietQR lúc này.');
    } finally {
      setPayingFine(false);
    }
  };

  const handlePaymentSuccess = async (orderCode: string) => {
    setQrPaymentOrder(null);
    triggerHaptic.success();
    Alert.alert('Thành công', `Thanh toán chuyển khoản thành công! (Mã GD: ${orderCode}). Thẻ thư viện đã được mở khóa.`);
    await loadFines();
  };

  useEffect(() => {
    if (!cardModalVisible) return;
    setTokenSecondsLeft(30);
    const interval = setInterval(() => {
      setTokenSecondsLeft((prev) => {
        if (prev <= 1) {
          setTokenSeed(Date.now());
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cardModalVisible]);

  const handleRefreshCardToken = () => {
    triggerHaptic.selection();
    setTokenSeed(Date.now());
    setTokenSecondsLeft(30);
  };

  const roleLabel =
    user?.role === 'admin'
      ? 'Quản trị viên'
      : user?.role === 'staff'
        ? 'Nhân viên'
        : 'Độc giả';

  const isStaffScanner = user?.role === 'admin' || user?.role === 'staff';

  const displayName = user?.full_name || 'Người dùng';

  const handleLogout = async () => {
    setLogoutVisible(false);
    await logout();
  };

  const handlePickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để bạn có thể đổi ảnh đại diện.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const { avatarUrl } = await authApi.uploadAvatar(result.assets[0].uri);
        if (user) {
          await updateUser({ avatar_url: avatarUrl });
        }
        Alert.alert('Thành công', 'Đổi ảnh đại diện thành công!');
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể cập nhật ảnh. Vui lòng thử lại.');
      } finally {
        setUploading(false);
      }
    }
  };

  const studentFields = [
    { icon: 'card-account-details', label: 'MSSV', value: patron?.student_code || patron?.studentCode || '—' },
    { icon: 'account-school', label: 'Lớp', value: patron?.class_name || patron?.className || '—' },
    { icon: 'bookmark-outline', label: 'Khóa học', value: patron?.course || '—' },
    { icon: 'domain', label: 'Khoa', value: patron?.faculty || '—' },
    { icon: 'cake-variant-outline', label: 'Ngày sinh', value: patron?.date_of_birth || patron?.dateOfBirth || '—' },
    { icon: 'home-outline', label: 'HKTT', value: patron?.permanent_address || patron?.permanentAddress || '—' },
    { icon: 'card-bulleted-outline', label: 'CCCD', value: patron?.identity_number || '—' },
    { icon: 'badge-account', label: 'Số thẻ TV', value: patron?.card_number || patron?.cardNumber || '—' },
    { icon: 'calendar-plus', label: 'Ngày cấp thẻ', value: patron?.issue_date || patron?.issueDate || '—' },
    { icon: 'calendar-clock', label: 'Hạn thẻ', value: patron?.membership_expiry || patron?.membershipExpiry || '—' },
    { icon: 'card-account-phone', label: 'Số điện thoại', value: patron?.phone || '—' },
  ];

  const studentCode = patron?.student_code || patron?.studentCode;
  const isStudent = user?.role === 'patron' && !!studentCode;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LoadingOverlay loading={!user} message="Đang tải hồ sơ...">
        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
          <GradientHeader
            title={displayName}
            subtitle={user?.email}
            icon="account-circle"
            right={
              <TouchableOpacity onPress={handlePickAvatar} disabled={uploading} activeOpacity={0.7}>
                <View style={styles.avatarWrapper}>
                  {user?.avatar_url ? (
                    <Avatar.Image size={48} source={{ uri: user.avatar_url }} style={styles.avatar} />
                  ) : (
                    <Avatar.Text size={48} label={(displayName || user?.email || 'U').slice(0, 1).toUpperCase()} color="#FFFFFF" style={styles.avatar} />
                  )}
                  {uploading ? (
                    <View style={styles.avatarOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  ) : (
                    <View style={styles.avatarOverlay}>
                      <MaterialCommunityIcons name="camera" size={18} color="#fff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            }
          >
            {studentCode ? (
              <View style={styles.heroPill}>
                <MaterialCommunityIcons name="card-account-details" size={14} color="#FFFFFF" />
                <Text style={styles.heroPillText}>MSSV: {studentCode}</Text>
              </View>
            ) : null}
          </GradientHeader>

          <Button
            mode="contained"
            icon="pencil"
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.editButton}
            contentStyle={styles.editButtonContent}
            labelStyle={styles.editButtonLabel}
          >
            Chỉnh sửa hồ sơ
          </Button>

          <SectionCard
            title="Thẻ Thư Viện Điện Tử"
            icon="smart-card-outline"
            accentColor={theme.colors.primary}
          >
            <View style={styles.digitalCardRow}>
              <View style={styles.digitalCardInfo}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {studentCode ? `MSSV: ${studentCode}` : `Mã người dùng: ${user?.id?.slice(0, 10)}`}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  Mở mã thẻ để quét mượn sách hoặc qua cổng
                </Text>
              </View>
              <Button
                mode="contained"
                icon="qrcode-scan"
                onPress={() => setCardModalVisible(true)}
                style={styles.cardOpenBtn}
                compact
              >
                Xem thẻ
              </Button>
            </View>
          </SectionCard>

          <SectionCard
            title="Công Nợ & Phí Phạt Thư Viện"
            icon="cash-multiple"
            accentColor={fines.length > 0 ? '#B85C4A' : '#4A8C5C'}
          >
            {loadingFines ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : fines.length === 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 14 }}>
                <MaterialCommunityIcons name="check-circle-outline" size={24} color="#4A8C5C" />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ fontWeight: '700', color: '#4A8C5C' }}>
                    Không có khoản nợ nào
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Thẻ thư viện của bạn đang hoạt động bình thường.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ gap: 12, paddingHorizontal: 16, paddingBottom: 14 }}>
                <View style={{ backgroundColor: '#B85C4A15', padding: 12, borderRadius: 12 }}>
                  <Text variant="titleSmall" style={{ fontWeight: '800', color: '#B85C4A' }}>
                    Đang nợ: {totalDebt.toLocaleString('vi-VN')} đ ({fines.length} khoản)
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    Vui lòng thanh toán trực tuyến qua SePay (Napas 247) để mở khóa thẻ thư viện tự động.
                  </Text>
                </View>
                <Button
                  mode="contained"
                  icon="qrcode-scan"
                  loading={payingFine}
                  disabled={payingFine}
                  onPress={handlePayFines}
                  style={{ borderRadius: 12, backgroundColor: theme.colors.primary }}
                  contentStyle={{ height: 44 }}
                >
                  Quét mã SePay nộp phạt
                </Button>
              </View>
            )}
          </SectionCard>

          {isStudent ? (
            <SectionCard
              title="Thông tin sinh viên"
              icon="school"
              accentColor={theme.colors.primary}
            >
              <View style={styles.infoGrid}>
                {studentFields.map((field, i) => (
                  <View key={i} style={styles.infoGridItem}>
                    <InfoField theme={theme} icon={field.icon} label={field.label} value={field.value} />
                  </View>
                ))}
              </View>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Tài khoản"
            icon="account-circle"
            accentColor={theme.colors.primary}
          >
            <List.Item
              title="Mã người dùng"
              description={user?.id || '—'}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="barcode" color={theme.colors.primary} />}
            />
            <Divider style={styles.divider} />
            <List.Item
              title="Họ và tên"
              description={user?.full_name || 'Chưa cập nhật'}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="account" color={theme.colors.primary} />}
            />
            <Divider style={styles.divider} />
            <List.Item
              title="Email"
              description={user?.email || 'Chưa cập nhật'}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="email" color={theme.colors.primary} />}
            />
            <Divider style={styles.divider} />
            {studentCode ? (
              <>
                <List.Item
                  title="MSSV"
                  description={studentCode}
                  titleStyle={styles.itemTitle}
                  descriptionStyle={styles.itemDescription}
                  left={(props) => <List.Icon {...props} icon="card-account-details" color={theme.colors.primary} />}
                />
                <Divider style={styles.divider} />
              </>
            ) : null}
            {patron?.status ? (
              <>
                <List.Item
                  title="Trạng thái thẻ"
                  description={patron.status === 'active' ? 'Đang hoạt động' : patron.status === 'inactive' ? 'Ngừng hoạt động' : patron.status === 'expired' ? 'Đã hết hạn' : patron.status}
                  titleStyle={styles.itemTitle}
                  descriptionStyle={[styles.itemDescription, { color: patron.status === 'active' ? theme.colors.custom.success : theme.colors.error }]}
                  left={(props) => <List.Icon {...props} icon={patron.status === 'active' ? 'check-circle' : 'alert-circle'} color={patron.status === 'active' ? theme.colors.custom.success : theme.colors.error} />}
                />
                <Divider style={styles.divider} />
              </>
            ) : null}
            <List.Item
              title="Vai trò"
              titleStyle={styles.itemTitle}
              left={(props) => <List.Icon {...props} icon="shield-account" color={theme.colors.primary} />}
              right={() => (
                <View style={[styles.rolePill, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={[styles.rolePillText, { color: theme.colors.primary }]}>{roleLabel}</Text>
                </View>
              )}
            />
            <List.Item
              title=""
              description={user?.role === 'admin' ? 'Toàn quyền quản lý hệ thống' : user?.role === 'staff' ? 'Quản lý mượn/trả sách, xem báo cáo' : 'Mượn/trả sách, quản lý hồ sơ cá nhân'}
              descriptionStyle={[styles.itemDescription, { fontStyle: 'italic', marginTop: -8 }]}
              left={() => null}
            />
          </SectionCard>

          <SectionCard
            title="Giao diện"
            icon="palette"
            accentColor={theme.colors.primary}
          >
            <List.Item
              title="Chế độ sáng/tối"
              description={mode === 'dark' ? 'Đang dùng giao diện tối' : 'Đang dùng giao diện sáng'}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon={mode === 'dark' ? 'weather-night' : 'white-balance-sunny'} color={theme.colors.primary} />}
              right={() => <Switch value={mode === 'dark'} onValueChange={toggleTheme} />}
            />
          </SectionCard>

          {!isStaffScanner ? (
            <SectionCard
              title="Sách"
              icon="book-open-variant"
              accentColor={theme.colors.primary}
            >
              <List.Item
                title="Sách chờ thông báo"
                description="Xem danh sách sách đang chờ nhận thông báo"
                titleStyle={styles.itemTitle}
                descriptionStyle={styles.itemDescription}
                left={(props) => <List.Icon {...props} icon="book-check" color={theme.colors.primary} />}
                right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
                onPress={() => navigation.navigate('MyReservations')}
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Lịch sử mượn sách"
                description="Xem lịch sử sách đã mượn và đã trả"
                titleStyle={styles.itemTitle}
                descriptionStyle={styles.itemDescription}
                left={(props) => <List.Icon {...props} icon="history" color={theme.colors.primary} />}
                right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
                onPress={() => navigation.navigate('History')}
              />
            </SectionCard>
          ) : null}

          <SectionCard
            title="Bảo mật"
            icon="shield-lock"
            accentColor={theme.colors.primary}
          >
            <List.Item
              title="Đổi mật khẩu"
              description="Thay đổi mật khẩu đăng nhập"
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="lock-reset" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
              onPress={() => navigation.navigate('ChangePassword')}
            />
          </SectionCard>

          <SectionCard
            title="Khuôn mặt"
            icon="face-recognition"
            accentColor={theme.colors.primary}
          >
            <List.Item
              title="Cập nhật khuôn mặt"
              description="Chụp lại khuôn mặt để đăng nhập nhanh"
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="face-recognition" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
              onPress={() => navigation.navigate('FaceCamera')}
            />
          </SectionCard>

          <Button
            mode="outlined"
            onPress={() => setLogoutVisible(true)}
            style={styles.logoutButton}
            textColor={theme.colors.error}
            icon="logout"
          >
            Đăng xuất
          </Button>

          <View style={styles.versionRow}>
            <Text variant="bodySmall" style={styles.version}>Thư Viện App</Text>
            <Text variant="bodySmall" style={styles.version}>v1.0.0</Text>
          </View>
        </ScrollView>
      </LoadingOverlay>

      <Portal>
        <Dialog visible={logoutVisible} onDismiss={() => setLogoutVisible(false)}>
          <Dialog.Title>Đăng xuất</Dialog.Title>
          <Dialog.Content>
            <Text>Bạn có chắc muốn đăng xuất?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutVisible(false)}>Hủy</Button>
            <Button onPress={handleLogout} textColor={theme.colors.error}>Đăng xuất</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Digital Library Card Modal */}
        <Dialog
          visible={cardModalVisible}
          onDismiss={() => setCardModalVisible(false)}
          style={[styles.cardDialog, { backgroundColor: c.surface }]}
        >
          <Dialog.Content style={{ padding: 0 }}>
            <View style={[styles.idCardContainer, { backgroundColor: c.primary }]}>
              {/* Header */}
              <View style={styles.idCardHeader}>
                <View style={styles.idLogoCircle}>
                  <Image
                    source={require('../../../../assets/logo-white.png')}
                    style={styles.idLogoImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.idCardSchool}>ĐH CÔNG NGHIỆP TP.HCM</Text>
                  <Text style={styles.idCardSub}>THẺ THƯ VIỆN ĐIỆN TỬ</Text>
                </View>
                <View style={styles.idActiveBadge}>
                  <MaterialCommunityIcons name="check-circle" size={12} color="#10B981" />
                  <Text style={styles.idActiveText}>HOẠT ĐỘNG</Text>
                </View>
              </View>

              {/* Body */}
              <View style={styles.idCardBody}>
                {user?.avatar_url ? (
                  <Avatar.Image size={64} source={{ uri: user.avatar_url }} style={styles.idCardAvatar} />
                ) : (
                  <Avatar.Text size={64} label={(displayName || 'U').slice(0, 1).toUpperCase()} color="#FFFFFF" style={[styles.idCardAvatar, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                )}
                <View style={styles.idCardDetails}>
                  <Text style={styles.idCardName}>{displayName}</Text>
                  <Text style={styles.idCardCode}>{studentCode ? `MSSV: ${studentCode}` : `MÃ: ${user?.id?.slice(0, 12)}`}</Text>
                  {patron?.faculty || patron?.className ? (
                    <Text style={styles.idCardMeta}>
                      {patron?.className ? `Lớp: ${patron.className}` : ''}
                      {patron?.faculty && patron?.className ? ' · ' : ''}
                      {patron?.faculty || ''}
                    </Text>
                  ) : (
                    <Text style={styles.idCardMeta}>{user?.email}</Text>
                  )}
                  <Text style={styles.idCardExpiry}>
                    Hạn dùng: {patron?.membership_expiry || patron?.membershipExpiry || 'Vô thời hạn'}
                  </Text>
                </View>
              </View>

              {/* Dynamic Security Bar */}
              <View style={styles.dynamicTokenBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="shield-check" size={14} color="#10B981" />
                  <Text style={styles.dynamicSecurityText}>
                    Mã đổi sau: <Text style={{ fontWeight: '800', color: '#10B981' }}>{tokenSecondsLeft}s</Text>
                  </Text>
                </View>
                <TouchableOpacity onPress={handleRefreshCardToken} style={styles.refreshBadge}>
                  <MaterialCommunityIcons name="refresh" size={13} color="#FFFFFF" />
                  <Text style={styles.refreshBadgeText}>Làm mới</Text>
                </TouchableOpacity>
              </View>

              {/* Barcode Graphic */}
              <View style={styles.barcodeWrapper}>
                <View style={styles.barcodeLines}>
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 1].map((w, idx) => (
                    <View
                      key={idx}
                      style={{
                        width: w,
                        height: 38,
                        backgroundColor: idx % 2 === 0 ? '#111827' : 'transparent',
                        marginHorizontal: 0.5,
                      }}
                    />
                  ))}
                </View>
                <Text style={styles.barcodeText}>
                  {`IUH-${studentCode || user?.id?.slice(0, 8) || 'CARD'}-${Math.floor(tokenSeed / 30000).toString().slice(-4)}`}
                </Text>
              </View>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'center', paddingBottom: 12 }}>
            <Button mode="contained" onPress={() => setCardModalVisible(false)} style={{ borderRadius: 10 }}>
              Đóng thẻ
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <MobileVietQrPaymentModal
        visible={!!qrPaymentOrder}
        order={qrPaymentOrder}
        patronName={displayName}
        studentCode={studentCode}
        onDismiss={() => setQrPaymentOrder(null)}
        onSuccess={handlePaymentSuccess}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 28,
      gap: 12,
    },
    digitalCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 14,
      gap: 12,
    },
    digitalCardInfo: {
      flex: 1,
    },
    cardOpenBtn: {
      borderRadius: 10,
    },
    avatarWrapper: {
      position: 'relative',
      zIndex: 1,
    },
    avatar: {
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    avatarOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 14,
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.18)',
      zIndex: 1,
    },
    heroPillText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    editButton: {
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    editButtonContent: {
      paddingVertical: 6,
    },
    editButtonLabel: {
      fontSize: 14,
      fontWeight: '700',
    },
    infoGrid: {
      paddingHorizontal: 16,
      paddingBottom: 14,
      gap: 12,
    },
    infoGridItem: {},
    divider: {
      marginHorizontal: 16,
    },
    itemTitle: {
      color: c.onSurface,
      fontSize: 14,
      fontWeight: '700',
    },
    itemDescription: {
      color: c.onSurfaceVariant,
      fontSize: 13,
    },
    rolePill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
    },
    rolePillText: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    logoutButton: {
      borderColor: c.error,
      borderRadius: 12,
      marginTop: 4,
    },
    versionRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    version: {
      color: c.onSurfaceVariant,
    },
    cardDialog: {
      borderRadius: 20,
      overflow: 'hidden',
      padding: 0,
    },
    idCardContainer: {
      borderRadius: 16,
      margin: 12,
      padding: 16,
      gap: 14,
    },
    idCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    idLogoCircle: {
      width: 52,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    idLogoImage: {
      width: '100%',
      height: '100%',
    },
    idCardSchool: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 11,
      letterSpacing: 0.5,
    },
    idCardSub: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    idActiveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    idActiveText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
    },
    idCardBody: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    idCardAvatar: {
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.6)',
    },
    idCardDetails: {
      flex: 1,
      gap: 2,
    },
    idCardName: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    idCardCode: {
      color: 'rgba(255,255,255,0.95)',
      fontSize: 12,
      fontWeight: '700',
    },
    idCardMeta: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 11,
    },
    idCardExpiry: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 10,
      marginTop: 2,
    },
    barcodeWrapper: {
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
      gap: 4,
    },
    dynamicTokenBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginTop: 2,
    },
    dynamicSecurityText: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 11,
      fontWeight: '600',
    },
    refreshBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    refreshBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    barcodeLines: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 40,
    },
    barcodeText: {
      color: '#111827',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 2,
    },
  });
}
