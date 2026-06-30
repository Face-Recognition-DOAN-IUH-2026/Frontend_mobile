import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
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
  Surface,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../context/AuthContext';
import { useMobileTheme } from '../context/ThemeContext';
import { AppTheme } from '../theme/DarkTheme';
import { authApi, uploadAvatar } from '../api/auth';
import { GradientHeader, SectionCard } from '../theme/MobileDesignSystem';

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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, patron, logout, updateUser } = useAuth();
  const { mode, toggleTheme } = useMobileTheme();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const { avatarUrl } = await uploadAvatar(result.assets[0].uri);
        if (user) {
          const updatedUser = { ...user, avatar_url: avatarUrl };
          await updateUser(updatedUser);
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {/* Hero Card */}
        <Surface style={styles.heroCard} elevation={0}>
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />

          <TouchableOpacity onPress={handlePickAvatar} disabled={uploading} activeOpacity={0.7}>
            <View style={styles.avatarWrapper}>
              {user?.avatar_url ? (
                <Avatar.Image
                  size={80}
                  source={{ uri: user.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <Avatar.Text
                  size={80}
                  label={(displayName || user?.email || 'U').slice(0, 1).toUpperCase()}
                  color="#FFFFFF"
                  style={styles.avatar}
                />
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

          <Text variant="titleLarge" style={styles.heroName} numberOfLines={2}>
            {displayName}
          </Text>
          <Text variant="bodyMedium" style={styles.heroEmail} selectable>
            {user?.email}
          </Text>
          {studentCode ? (
            <View style={styles.heroPill}>
              <MaterialCommunityIcons name="card-account-details" size={14} color="#FFFFFF" />
              <Text style={styles.heroPillText}>MSSV: {studentCode}</Text>
            </View>
          ) : null}
        </Surface>

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

        {/* Student Info */}
        {isStudent && (
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
        )}

        {/* Account Info */}
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

        {/* Settings */}
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

        {/* Books */}
        {!isStaffScanner && (
          <SectionCard
            title="Sách"
            icon="book-open-variant"
            accentColor={theme.colors.primary}
          >
            <List.Item
              title="Đặt chỗ của tôi"
              description="Xem và quản lý đặt chỗ sách"
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
        )}

        {/* Security */}
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

        {/* Face */}
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
      </Portal>
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
    heroCard: {
      borderRadius: 18,
      backgroundColor: c.primary,
      padding: 24,
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    heroCircle1: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    heroCircle2: {
      position: 'absolute',
      bottom: -40,
      left: 60,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    avatarWrapper: {
      position: 'relative',
      marginBottom: 12,
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
    heroName: {
      color: '#FFFFFF',
      fontWeight: '800',
      textAlign: 'center',
      zIndex: 1,
    },
    heroEmail: {
      color: 'rgba(255,255,255,0.75)',
      textAlign: 'center',
      zIndex: 1,
      marginTop: 4,
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
  });
}
