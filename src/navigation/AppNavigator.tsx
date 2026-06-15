import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import FaceLoginScreen from '../screens/FaceLoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import BorrowScreen from '../screens/BorrowScreen';
import ReturnScreen from '../screens/ReturnScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FaceCameraScreen from '../screens/FaceCameraScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ScheduleScreen from '../screens/ScheduleScreen';

import { AuthStackParamList, MainTabParamList, MainStackParamList } from './types';

const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const MainStack = createStackNavigator<MainStackParamList>();
const RootStack = createStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
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
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
    </AuthStack.Navigator>
  );
}

function MainTabNavigator() {
  const { user } = useAuth();
  const isStaffScanner = user?.role === 'admin' || user?.role === 'staff';

  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
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
        name="Borrow"
        component={isStaffScanner ? ReturnScreen : BorrowScreen}
        options={{
          title: isStaffScanner ? 'Trả sách' : 'Mượn sách',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name={isStaffScanner ? 'barcode-scan' : 'book-plus'} size={size} color={color} />
          ),
        }}
      />
      {isStaffScanner && (
        <MainTab.Screen
          name="Schedule"
          component={ScheduleScreen}
          options={{
            title: 'Lich truc',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />
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
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <MainStack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ headerShown: false }}
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
        name="History"
        component={HistoryScreen}
        options={{
          title: 'Lịch sử mượn sách',
          presentation: 'card',
        }}
      />
    </MainStack.Navigator>
  );
}

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.primary,
    border: colors.border,
  },
};

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

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
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={loadingStyles.container}>
      <View style={loadingStyles.logoCircle}>
        <Text style={loadingStyles.logoText}>TV</Text>
      </View>
      <Animated.Text style={[loadingStyles.brand, { opacity }]}>
        Thư Viện
      </Animated.Text>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: {
    color: colors.background,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 3,
  },
  brand: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 4,
  },
});
