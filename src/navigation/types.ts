import { NavigatorScreenParams } from '@react-navigation/native';
import { Notification } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  FaceLogin: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Notifications: undefined;
  StaffReturn: undefined;
  StaffBorrow: undefined;
  Schedule: undefined;
  AIChat: undefined;
  AIHealth: undefined;
  BookRecommendations: undefined;
  History: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  NotificationDetail: { notification: Notification };
  FaceCamera: undefined;
  ChangePassword: undefined;
  ImportBooks: undefined;
  AIChat: undefined;
  AIHealth: undefined;
  BookRecommendations: undefined;
  MyReservations: undefined;
  BookCatalog: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
