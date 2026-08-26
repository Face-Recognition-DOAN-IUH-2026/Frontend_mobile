import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { navigationRef } from './navigationRef';


import ChangePasswordScreen from '../features/profile/screens/ChangePasswordScreen';
import FaceCameraScreen from '../features/face/screens/FaceCameraScreen';
import FaceLoginScreen from '../features/auth/screens/FaceLoginScreen';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen';
import HistoryScreen from '../features/history/screens/HistoryScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import ImportBooksScreen from '../features/import/screens/ImportBooksScreen';
import LoginScreen from '../features/auth/screens/LoginScreen';
import NotificationScreen from '../features/notifications/screens/NotificationScreen';
import NotificationDetailScreen from '../features/notifications/screens/NotificationDetailScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import ReturnScreen from '../features/borrow/screens/ReturnScreen';
import ScheduleScreen from '../features/schedule/screens/ScheduleScreen';
import StaffBorrowScreen from '../features/borrow/screens/StaffBorrowScreen';
import AIChatScreen from '../features/ai/screens/AIChatScreen';
import AIHealthScreen from '../features/ai/screens/AIHealthScreen';
import BookRecommendationsScreen from '../features/book/screens/BookRecommendationsScreen';
import MyReservationsScreen from '../features/library/screens/MyReservationsScreen';
import BookCatalogScreen from '../features/book/screens/BookCatalogScreen';
import EditProfileScreen from '../features/profile/screens/EditProfileScreen';
import LibraryTourScreen from '../features/library/screens/LibraryTourScreen';

import { isStaffRole, isPatronRole } from './roleGuard';
import { AuthStackParamList, PatronStackParamList, StaffStackParamList, PatronTabParamList, StaffTabParamList } from './types';

const AuthStack = createStackNavigator<AuthStackParamList>();
const PatronTab = createBottomTabNavigator<PatronTabParamList>();
const StaffTab = createBottomTabNavigator<StaffTabParamList>();
const PatronStack = createStackNavigator<PatronStackParamList>();
const StaffStack = createStackNavigator<StaffStackParamList>();
const RootStack = createStackNavigator();

function AuthNavigator() {
  const theme = useTheme();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen
        name="FaceLogin"
        component={FaceLoginScreen}
        options={{
          headerShown: true,
          headerTitle: 'Đăng nhập khuôn mặt',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onPrimary,
        }}
      />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          headerShown: false,
        }}
      />
    </AuthStack.Navigator>
  );
}

function NotificationsTabIcon({ color, size }: { color: string; size: number }) {
  const { unreadCount } = useNotification();
  return (
    <View>
      <MaterialCommunityIcons name="bell" size={size} color={color} />
      {unreadCount > 0 && (
        <View style={tabBadgeStyles.badge}>
          <Text style={tabBadgeStyles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

const tabBadgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#C44E4E',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

function HeaderNotificationButton({ navigation }: { navigation: any }) {
  const { unreadCount } = useNotification();
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => navigation.navigate('Notifications')}
      style={({ pressed }) => [
        {
          marginRight: 16,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View>
        <MaterialCommunityIcons name="bell" size={24} color={theme.colors.onSurface} />
        {unreadCount > 0 && (
          <View style={tabBadgeStyles.badge}>
            <Text style={tabBadgeStyles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function PatronTabNavigator() {
  const theme = useTheme();

  return (
    <PatronTab.Navigator
      screenOptions={({ navigation }) => ({
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          paddingTop: 8,
          paddingBottom: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onPrimary,
        headerRight: () => <HeaderNotificationButton navigation={navigation} />,
      })}
    >
      <PatronTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <PatronTab.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{
          title: 'AI Chat',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot" size={size} color={color} />
          ),
        }}
      />
      <PatronTab.Screen
        name="BookCatalog"
        component={BookCatalogScreen}
        options={{
          title: 'Tìm sách',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-search" size={size} color={color} />
          ),
        }}
      />
      <PatronTab.Screen
        name="BookRecommendations"
        component={BookRecommendationsScreen}
        options={{
          title: 'Gợi ý',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="lightbulb" size={size} color={color} />
          ),
        }}
      />
      <PatronTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </PatronTab.Navigator>
  );
}

function StaffTabNavigator() {
  const theme = useTheme();

  return (
    <StaffTab.Navigator
      screenOptions={({ navigation }) => ({
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          paddingTop: 8,
          paddingBottom: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onPrimary,
        headerRight: () => <HeaderNotificationButton navigation={navigation} />,
      })}
    >
      <StaffTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <StaffTab.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{
          title: 'AI Chat',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot" size={size} color={color} />
          ),
        }}
      />
      <StaffTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </StaffTab.Navigator>
  );
}

function PatronStackNavigator() {
  const theme = useTheme();
  const { user } = useAuth();

  if (user && !isPatronRole(user.role)) {
    return null;
  }

  return (
    <PatronStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <PatronStack.Screen
        name="MainTabs"
        component={PatronTabNavigator}
        options={{ headerShown: false }}
      />
      <PatronStack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
        options={{ title: 'Chi tiết thông báo', presentation: 'card' }}
      />
      <PatronStack.Screen
        name="FaceCamera"
        component={FaceCameraScreen}
        options={{ title: 'Cập nhật khuôn mặt', presentation: 'modal' }}
      />
      <PatronStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Đổi mật khẩu', presentation: 'card' }}
      />
      <PatronStack.Screen
        name="BookRecommendations"
        component={BookRecommendationsScreen}
        options={{ title: 'Gợi sách AI', presentation: 'card' }}
      />
      <PatronStack.Screen
        name="MyReservations"
        component={MyReservationsScreen}
        options={{ title: 'Sách chờ thông báo', presentation: 'card' }}
      />
      <PatronStack.Screen
        name="BookCatalog"
        component={BookCatalogScreen}
        options={{ title: 'Mượn sách', presentation: 'card' }}
      />
      <PatronStack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{ title: 'Thông báo', presentation: 'card' }}
      />
      <PatronStack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Lịch sử mượn sách', presentation: 'card' }}
      />
      <PatronStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Chỉnh sửa hồ sơ', presentation: 'card' }}
      />
      <PatronStack.Screen
        name="LibraryTour"
        component={LibraryTourScreen}
        options={{ title: 'Tham quan Thư viện 3D', presentation: 'card', headerShown: true }}
      />
    </PatronStack.Navigator>
  );
}

function StaffStackNavigator() {
  const theme = useTheme();
  const { user } = useAuth();

  if (user && !isStaffRole(user.role)) {
    return null;
  }

  return (
    <StaffStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <StaffStack.Screen
        name="MainTabs"
        component={StaffTabNavigator}
        options={{ headerShown: false }}
      />
      <StaffStack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
        options={{ title: 'Chi tiết thông báo', presentation: 'card' }}
      />
      <StaffStack.Screen
        name="FaceCamera"
        component={FaceCameraScreen}
        options={{ title: 'Cập nhật khuôn mặt', presentation: 'modal' }}
      />
      <StaffStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Đổi mật khẩu', presentation: 'card' }}
      />
      <StaffStack.Screen
        name="ImportBooks"
        component={ImportBooksScreen}
        options={{ title: 'Nhập sách từ ISBN', presentation: 'card' }}
      />
      <StaffStack.Screen
        name="AIHealth"
        component={AIHealthScreen}
        options={{ title: 'AI Command Center', presentation: 'card' }}
      />
      <StaffStack.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{ title: 'AI Chat', presentation: 'card' }}
      />
      <StaffStack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{ title: 'Thông báo', presentation: 'card' }}
      />
      <StaffStack.Screen
        name="StaffReturn"
        component={ReturnScreen}
        options={{ title: 'Trả sách', presentation: 'card' }}
      />
      <StaffStack.Screen
        name="StaffBorrow"
        component={StaffBorrowScreen}
        options={{ title: 'Tạo phiếu mượn', presentation: 'card' }}
      />
      <StaffStack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ title: 'Lịch trực', presentation: 'card' }}
      />
      <StaffStack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Lịch sử mượn sách', presentation: 'card' }}
      />
      <StaffStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Chỉnh sửa hồ sơ', presentation: 'card' }}
      />
      <StaffStack.Screen
        name="LibraryTour"
        component={LibraryTourScreen}
        options={{ title: 'Tham quan Thư viện 3D', presentation: 'card', headerShown: true }}
      />
    </StaffStack.Navigator>
  );
}

export default function AppNavigator() {
  const theme = useTheme();
  const { isAuthenticated, isLoading, user } = useAuth();

  const navigationTheme = useMemo(() => {
    const base = theme.dark ? NavigationDarkTheme : NavigationDefaultTheme;
    return {
      ...base,
      dark: theme.dark,
      colors: {
        ...base.colors,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.onSurface,
        primary: theme.colors.primary,
        border: theme.colors.outlineVariant,
        notification: theme.colors.error,
      },
    };
  }, [theme]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const isStaff = isStaffRole(user?.role);

  return (
    <>
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          ) : isStaff ? (
            <RootStack.Screen name="Staff" component={StaffStackNavigator} />
          ) : (
            <RootStack.Screen name="Patron" component={PatronStackNavigator} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </>
  );
}

function LoadingScreen() {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={[loadingStyles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[loadingStyles.logoCircle, { backgroundColor: theme.colors.primary }]}>
        <Text style={[loadingStyles.logoText, { color: theme.colors.onPrimary }]}>TV</Text>
      </View>
      <Animated.Text style={[loadingStyles.brand, { opacity, color: theme.colors.primary }]}>
        Thư Viện
      </Animated.Text>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 3,
  },
  brand: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 4,
  },
});
