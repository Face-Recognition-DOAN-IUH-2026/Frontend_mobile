import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  Card,
  Dialog,
  Divider,
  List,
  Portal,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { useMobileTheme } from '../context/ThemeContext';
import { AppTheme } from '../theme/DarkTheme';

interface ProfileScreenProps {
  navigation: any;
}

function InfoField({ icon, label, value, theme }: { icon: string; label: string; value: string; theme: AppTheme }) {
  return (
    <View style={infoStyles.row}>
      <MaterialCommunityIcons name={icon as any} size={16} color={theme.colors.primary} />
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
  textWrap: {
    flex: 1,
    gap: 1,
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
  const { user, patron, logout } = useAuth();
  const { mode, toggleTheme } = useMobileTheme();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const roleLabel =
    user?.role === 'admin'
      ? 'Quản trị viên'
      : user?.role === 'staff'
        ? 'Nhân viên'
        : 'Độc giả';

  const displayName = user?.full_name || 'Người dùng';

  const handleLogout = async () => {
    setLogoutVisible(false);
    await logout();
  };

  const studentFields = [
    { icon: 'card-account-details', label: 'MSSV', value: patron?.student_code || '—' },
    { icon: 'account-school', label: 'Lớp', value: patron?.class_name || patron?.className || '—' },
    { icon: 'bookmark-outline', label: 'Khóa học', value: patron?.course || '—' },
    { icon: 'domain', label: 'Khoa', value: patron?.faculty || '—' },
    { icon: 'cake-variant-outline', label: 'Ngày sinh', value: patron?.date_of_birth || patron?.dateOfBirth || '—' },
    { icon: 'home-outline', label: 'HKTT', value: patron?.permanent_address || patron?.permanentAddress || '—' },
    { icon: 'card-bulleted-outline', label: 'CCCD', value: patron?.identity_number || '—' },
    { icon: 'badge-account', label: 'Số thẻ TV', value: patron?.card_number || '—' },
    { icon: 'calendar-plus', label: 'Ngày cấp thẻ', value: patron?.issue_date || patron?.issueDate || '—' },
    { icon: 'calendar-clock', label: 'Hạn thẻ', value: patron?.membership_expiry || patron?.membershipExpiry || '—' },
    { icon: 'card-account-phone', label: 'Số điện thoại', value: patron?.phone || '—' },
  ];

  const isStudent = user?.role === 'patron' && !!patron?.student_code;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <Card mode="contained" style={styles.header}>
          <Card.Content style={styles.headerContent}>
            <Avatar.Text
              size={74}
              label={(displayName || user?.email || 'U').slice(0, 1).toUpperCase()}
              color={theme.colors.onPrimary}
              style={styles.avatar}
            />
            <Text variant="headlineSmall" style={styles.name} numberOfLines={2}>
              {displayName}
            </Text>
            <Text variant="bodyMedium" style={styles.email} selectable>
              {user?.email}
            </Text>
            {patron?.student_code ? (
              <Text variant="bodySmall" style={styles.studentCode} selectable>
                MSSV: {patron.student_code}
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        {isStudent && (
          <Card mode="outlined" style={styles.section}>
            <View style={styles.sectionAccent} />
            <List.Section>
              <List.Subheader style={styles.subheader}>
                <View style={styles.subheaderRow}>
                  <MaterialCommunityIcons name="school" size={16} color={theme.colors.primary} />
                  <Text style={styles.subheaderText}>Thông tin sinh viên</Text>
                </View>
              </List.Subheader>
              <View style={styles.infoGrid}>
                {studentFields.map((field, i) => (
                  <View key={i} style={styles.infoGridItem}>
                    <InfoField theme={theme} icon={field.icon} label={field.label} value={field.value} />
                    {i < studentFields.length - 1 && i % 2 === 0 && (
                      <View style={{ height: 1, backgroundColor: theme.colors.outlineVariant, marginVertical: 8 }} />
                    )}
                  </View>
                ))}
              </View>
            </List.Section>
          </Card>
        )}

        <Card mode="outlined" style={styles.section}>
          <List.Section>
            <List.Subheader style={styles.subheader}>Tài khoản</List.Subheader>
            <List.Item
              title="Mã người dùng"
              description={user?.id || '—'}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="barcode" color={theme.colors.primary} />}
            />
            <Divider />
            <List.Item
              title="Họ và tên"
              description={user?.full_name || 'Chưa cập nhật'}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="account" color={theme.colors.primary} />}
            />
            <Divider />
            <List.Item
              title="Email"
              description={user?.email || 'Chưa cập nhật'}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="email" color={theme.colors.primary} />}
            />
            <Divider />
            {patron?.student_code ? (
              <>
                <List.Item
                  title="MSSV"
                  description={patron.student_code}
                  titleStyle={styles.itemTitle}
                  descriptionStyle={styles.itemDescription}
                  left={(props) => <List.Icon {...props} icon="card-account-details" color={theme.colors.primary} />}
                />
                <Divider />
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
                <Divider />
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
          </List.Section>
        </Card>

        <Card mode="outlined" style={styles.section}>
          <List.Section>
            <List.Subheader style={styles.subheader}>Giao diện</List.Subheader>
            <List.Item
              title="Chế độ sáng/tối"
              description={mode === 'dark' ? 'Đang dùng giao diện tối' : 'Đang dùng giao diện sáng'}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon={mode === 'dark' ? 'weather-night' : 'white-balance-sunny'} color={theme.colors.primary} />}
              right={() => <Switch value={mode === 'dark'} onValueChange={toggleTheme} />}
            />
          </List.Section>
        </Card>

        <Card mode="outlined" style={styles.section}>
          <List.Section>
            <List.Subheader style={styles.subheader}>Bảo mật</List.Subheader>
            <List.Item
              title="Đổi mật khẩu"
              description="Thay đổi mật khẩu đăng nhập"
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="lock-reset" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
              onPress={() => navigation.navigate('ChangePassword')}
            />
          </List.Section>
        </Card>

        <Card mode="outlined" style={styles.section}>
          <List.Section>
            <List.Subheader style={styles.subheader}>Khuôn mặt</List.Subheader>
            <List.Item
              title="Cập nhật khuôn mặt"
              description="Chụp lại khuôn mặt để đăng nhập nhanh"
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="face-recognition" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
              onPress={() => navigation.navigate('FaceCamera')}
            />
          </List.Section>
        </Card>

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
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 28,
      gap: 14,
    },
    header: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
    },
    headerContent: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: 18,
    },
    avatar: {
      backgroundColor: theme.colors.primary,
      marginBottom: 8,
    },
    name: {
      color: theme.colors.onSurface,
      fontWeight: '800',
      textAlign: 'center',
    },
    email: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    studentCode: {
      color: theme.colors.secondary,
      fontWeight: '700',
    },
    roleBadge: {
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.primaryContainer,
    },
    role: {
      color: theme.dark ? theme.colors.primary : theme.colors.onSurface,
      fontWeight: '800',
      textTransform: 'uppercase',
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
    section: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
    },
    sectionAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: theme.colors.primary,
      zIndex: 1,
    },
    subheader: {
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 13,
    },
    subheaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    subheaderText: {
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 13,
      textTransform: 'uppercase',
    },
    infoGrid: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10,
    },
    infoGridItem: {},
    itemTitle: {
      color: theme.colors.onSurface,
      fontSize: 14,
      fontWeight: '700',
    },
    itemDescription: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
    },
    logoutButton: {
      borderColor: theme.colors.error,
      borderRadius: 10,
    },
    versionRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    version: {
      color: theme.colors.onSurfaceVariant,
    },
  });
}
