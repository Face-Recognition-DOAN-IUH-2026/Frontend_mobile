import { NavigatorScreenParams } from '@react-navigation/native';
import { Notification } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  FaceLogin: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Notifications: undefined;
  StaffReturn: undefined;
  StaffBorrow: undefined;
  Schedule: undefined;
  History: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  NotificationDetail: { notification: Notification };
  FaceCamera: undefined;
  ChangePassword: undefined;
  ImportBooks: undefined;
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
