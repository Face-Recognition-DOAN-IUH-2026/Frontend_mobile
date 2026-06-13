import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, List, Button, Avatar, Divider } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, patron, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', onPress: logout, style: 'destructive' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
    <ScrollView style={styles.flex}>
      <Surface style={styles.header} elevation={0}>
        <View style={styles.avatarWrapper}>
          <Avatar.Text size={72} label={user?.full_name?.[0] || user?.email?.[0] || 'U'} color={colors.background} style={styles.avatar} />
        </View>
        <Text variant="headlineSmall" style={styles.name}>
          {user?.full_name || 'Người dùng'}
        </Text>
        <Text variant="bodyMedium" style={styles.email}>
          {user?.email}
        </Text>
        {patron?.student_code && (
          <Text variant="bodySmall" style={styles.studentCode}>
            MSSV: {patron.student_code}
          </Text>
        )}
        <View style={styles.roleBadge}>
          <Text variant="bodySmall" style={styles.role}>
            {user?.role === 'admin' ? 'Quản trị viên' : 'Độc giả'}
          </Text>
        </View>
      </Surface>

      <Surface style={styles.section} elevation={0}>
        <View style={styles.sectionAccent} />
        <List.Section>
          <List.Subheader style={styles.subheader}>Tài khoản</List.Subheader>

          <List.Item
            title="Họ và tên"
            titleStyle={styles.itemTitle}
            description={user?.full_name || 'Chưa cập nhật'}
            descriptionStyle={styles.itemDescription}
            left={(props) => <List.Icon {...props} icon="account" color={colors.primary} />}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Email"
            titleStyle={styles.itemTitle}
            description={user?.email}
            descriptionStyle={styles.itemDescription}
            left={(props) => <List.Icon {...props} icon="email" color={colors.primary} />}
          />
          <Divider style={styles.divider} />
          {patron?.student_code && (
            <>
              <List.Item
                title="MSSV"
                titleStyle={styles.itemTitle}
                description={patron.student_code}
                descriptionStyle={styles.itemDescription}
                left={(props) => <List.Icon {...props} icon="card-account-details" color={colors.primary} />}
              />
              <Divider style={styles.divider} />
            </>
          )}
          <List.Item
            title="Vai trò"
            titleStyle={styles.itemTitle}
            description={user?.role === 'admin' ? 'Quản trị viên' : 'Độc giả'}
            descriptionStyle={styles.itemDescription}
            left={(props) => <List.Icon {...props} icon="shield-account" color={colors.primary} />}
          />
        </List.Section>
      </Surface>

      <Surface style={styles.section} elevation={0}>
        <View style={styles.sectionAccent} />
        <List.Section>
          <List.Subheader style={styles.subheader}>Khuôn mặt</List.Subheader>

          <List.Item
            title="Đăng ký khuôn mặt"
            titleStyle={styles.itemTitle}
            description="Cập nhật ảnh khuôn mặt để đăng nhập bằng khuôn mặt"
            descriptionStyle={styles.itemDescription}
            left={(props) => <List.Icon {...props} icon="face-recognition" color={colors.primary} />}
            right={(props) => (
              <Button
                mode="contained"
                onPress={() => navigation.navigate('FaceCamera')}
                style={styles.updateButton}
                labelStyle={styles.updateButtonLabel}
              >
                Cập nhật
              </Button>
            )}
          />
        </List.Section>
      </Surface>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          labelStyle={styles.logoutLabel}
          icon="logout"
        >
          Đăng xuất
        </Button>
      </View>

      <View style={styles.versionRow}>
        <Text variant="bodySmall" style={styles.version}>
          Thư Viện App
        </Text>
        <Text variant="bodySmall" style={styles.versionSeparator}>•</Text>
        <Text variant="bodySmall" style={styles.version}>
          v1.0.0
        </Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    padding: 32,
    paddingTop: 24,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  avatarWrapper: {
    padding: 3,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  name: {
    color: colors.text,
    marginTop: 16,
    fontWeight: '700',
  },
  email: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  studentCode: {
    color: colors.secondary,
    marginTop: 2,
    fontWeight: '600',
  },
  roleBadge: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: colors.surfaceVariant,
  },
  role: {
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  section: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  sectionAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
  },
  subheader: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 14,
  },
  itemDescription: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  divider: {
    backgroundColor: colors.divider,
    height: 0.5,
  },
  updateButton: {
    borderRadius: 6,
  },
  updateButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    padding: 16,
  },
  logoutButton: {
    borderColor: colors.error,
    borderRadius: 6,
  },
  logoutLabel: {
    color: colors.error,
    fontSize: 14,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    gap: 6,
  },
  version: {
    color: colors.textDisabled,
    fontSize: 12,
  },
  versionSeparator: {
    color: colors.textDisabled,
    fontSize: 10,
  },
});
