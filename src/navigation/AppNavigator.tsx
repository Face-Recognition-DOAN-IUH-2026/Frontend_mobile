import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';


import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import FaceCameraScreen from '../screens/FaceCameraScreen';
import FaceLoginScreen from '../screens/FaceLoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HistoryScreen from '../screens/HistoryScreen';
import HomeScreen from '../screens/HomeScreen';
import ImportBooksScreen from '../screens/ImportBooksScreen';
import LoginScreen from '../screens/LoginScreen';
import NotificationScreen from '../screens/NotificationScreen';
import NotificationDetailScreen from '../screens/NotificationDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ReturnScreen from '../screens/ReturnScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import StaffBorrowScreen from '../screens/StaffBorrowScreen';

import { AuthStackParamList, MainStackParamList, MainTabParamList } from './types';

const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const MainStack = createStackNavigator<MainStackParamList>();
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

function MainTabNavigator() {
  const theme = useTheme();
  const { user } = useAuth();
  const isStaffScanner = user?.role === 'admin' || user?.role === 'staff';

  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onPrimary,
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          title: 'Thông báo',
          tabBarIcon: ({ color, size }) => <NotificationsTabIcon color={color} size={size} />,
        }}
      />
      {isStaffScanner && (
        <>
          <MainTab.Screen
            name="StaffReturn"
            component={ReturnScreen}
            options={{
              title: 'Trả sách',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="barcode-scan" size={size} color={color} />
              ),
            }}
          />
          <MainTab.Screen
            name="StaffBorrow"
            component={StaffBorrowScreen}
            options={{
              title: 'Tạo phiếu mượn',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="book-plus-multiple" size={size} color={color} />
              ),
            }}
          />
        </>
      )}
      {isStaffScanner && (
        <MainTab.Screen
          name="Schedule"
          component={ScheduleScreen}
          options={{
            title: 'Lịch trực',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />
            ),
          }}
        />
      )}
      {/* Patron tab - hidden for admin/staff */}
      {!isStaffScanner && (
        <MainTab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            title: 'Lịch sử',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="history" size={size} color={color} />
            ),
          }}
        />
      )}
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </MainTab.Navigator>
  );
}

function MainStackNavigator() {
  const theme = useTheme();

  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <MainStack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
        options={{
          title: 'Chi tiết thông báo',
          presentation: 'card',
        }}
      />
      <MainStack.Screen
        name="FaceCamera"
        component={FaceCameraScreen}
        options={{
          title: 'Cập nhật khuôn mặt',
          presentation: 'modal',
        }}
      />
      <MainStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{
          title: 'Đổi mật khẩu',
          presentation: 'card',
        }}
      />
      <MainStack.Screen
        name="ImportBooks"
        component={ImportBooksScreen}
        options={{
          title: 'Nhập sách từ ISBN',
          presentation: 'card',
        }}
      />
    </MainStack.Navigator>
  );
}

export default function AppNavigator() {
  const theme = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

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

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainStackNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
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
