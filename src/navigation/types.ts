import { NavigatorScreenParams } from '@react-navigation/native';
import { Notification } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  FaceLogin: undefined;
  ForgotPassword: undefined;
};

export type PatronTabParamList = {
  Home: undefined;
  AIChat: undefined;
  BookRecommendations: undefined;
  BookCatalog: undefined;
  Profile: undefined;
};

export type StaffTabParamList = {
  Home: undefined;
  Schedule: undefined;
  AIChat: undefined;
  Profile: undefined;
};

export type PatronStackParamList = {
  MainTabs: NavigatorScreenParams<PatronTabParamList>;
  NotificationDetail: { notification: Notification };
  FaceCamera: undefined;
  ChangePassword: undefined;
  BookRecommendations: undefined;
  MyReservations: undefined;
  BookCatalog: undefined;
  Notifications: undefined;
  History: undefined;
  EditProfile: undefined;
  LibraryTour: undefined;
};

export type StaffStackParamList = {
  MainTabs: NavigatorScreenParams<StaffTabParamList>;
  NotificationDetail: { notification: Notification };
  FaceCamera: undefined;
  ChangePassword: undefined;
  ImportBooks: undefined;
  AIHealth: undefined;
  AIChat: undefined;
  Notifications: undefined;
  StaffReturn: undefined;
  StaffBorrow: undefined;
  Schedule: undefined;
  History: undefined;
  EditProfile: undefined;
  LibraryTour: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Patron: NavigatorScreenParams<PatronStackParamList>;
  Staff: NavigatorScreenParams<StaffStackParamList>;
  ForceChangePassword: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
