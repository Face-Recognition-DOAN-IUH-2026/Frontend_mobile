import api from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens, User } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PatronLoginRequest {
  student_code: string;
  password: string;
}

export interface PatronRegisterRequest {
  student_code: string;
  password: string;
  full_name: string;
  email: string;
  class_name?: string;
  course?: string;
  permanent_address?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user?: any;
}

export interface PatronLoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: any;
}

export interface FaceLoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    const tokens: AuthTokens = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      token_type: response.data.token_type,
    };
    await AsyncStorage.setItem('accessToken', tokens.access_token);
    await AsyncStorage.setItem('refreshToken', tokens.refresh_token);
    if (response.data.user) {
      await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
      await AsyncStorage.removeItem('patronData');
    }
    return response.data;
  },

  patronLogin: async (data: PatronLoginRequest): Promise<PatronLoginResponse> => {
    const response = await api.post<PatronLoginResponse>('/patrons/login', data);
    await AsyncStorage.setItem('accessToken', response.data.access_token);
    if (response.data.refresh_token) {
      await AsyncStorage.setItem('refreshToken', response.data.refresh_token);
    }
    await AsyncStorage.setItem('patronData', JSON.stringify(response.data.user));
    return response.data;
  },

  patronRegister: async (data: PatronRegisterRequest): Promise<PatronLoginResponse> => {
    const response = await api.post<PatronLoginResponse>('/patrons/register', data);
    if (!response.data.user) {
      throw new Error('Invalid response: missing user data');
    }
    await AsyncStorage.setItem('accessToken', response.data.access_token);
    await AsyncStorage.setItem('patronData', JSON.stringify(response.data.user));
    return response.data;
  },

  faceLogin: async (imageUri: string): Promise<FaceLoginResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'face.jpg',
    } as any);
    const response = await api.post<FaceLoginResponse>('/auth/face-login', formData);
    if (response.data.access_token) {
      await AsyncStorage.setItem('accessToken', response.data.access_token);
    }
    if (response.data.refresh_token) {
      await AsyncStorage.setItem('refreshToken', response.data.refresh_token);
    }
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ access_token: string }> => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'patronData', 'userData']);
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/users/me');
    return response.data;
  },

  getCurrentPatron: async (): Promise<any> => {
    const response = await api.get<any>('/patrons/me');
    return response.data;
  },

  changePassword: async (patronId: string, currentPassword: string, newPassword: string): Promise<void> => {
    await api.put(`/patrons/${patronId}/password`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
