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
import { useAuth } from '../context/AuthContext';
import { useMobileTheme } from '../context/ThemeContext';
import { AppTheme } from '../theme/DarkTheme';

interface ProfileScreenProps {
  navigation: any;
}

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
            <View style={styles.roleBadge}>
              <Text variant="labelMedium" style={styles.role}>{roleLabel}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={styles.section}>
          <List.Section>
            <List.Subheader style={styles.subheader}>Tài khoản</List.Subheader>
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
            <List.Item
              title="Vai trò"
              description={roleLabel}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="shield-account" color={theme.colors.primary} />}
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
    section: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 14,
      overflow: 'hidden',
    },
    subheader: {
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 13,
    },
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
