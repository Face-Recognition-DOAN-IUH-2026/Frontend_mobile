import api from './client';
import { setAccessToken, setRefreshToken, clearTokens } from './secureStorage';
import { AuthTokens, User } from '../types';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';

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
  verification_token?: string;
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
    await setAccessToken(tokens.access_token);
    await setRefreshToken(tokens.refresh_token);
    return response.data;
  },

  patronLogin: async (data: PatronLoginRequest): Promise<PatronLoginResponse> => {
    const response = await api.post<PatronLoginResponse>('/patrons/login', data);
    await setAccessToken(response.data.access_token);
    if (response.data.refresh_token) {
      await setRefreshToken(response.data.refresh_token);
    }
    return response.data;
  },

  patronRegister: async (data: PatronRegisterRequest): Promise<PatronLoginResponse> => {
    const params: any = {
      student_code: data.student_code,
      password: data.password,
      full_name: data.full_name,
      email: data.email,
    };
    if (data.class_name) params.class_name = data.class_name;
    if (data.course) params.course = data.course;
    if (data.permanent_address) params.permanent_address = data.permanent_address;
    if (data.verification_token) params.verification_token = data.verification_token;
    const response = await api.post<PatronLoginResponse>('/patrons/register', params);
    if (!response.data.user) {
      throw new Error('Invalid response: missing user data');
    }
    return response.data;
  },

  preRegisterOtp: async (email: string): Promise<void> => {
    await api.post('/auth/pre-register-otp', { email });
  },

  preRegisterVerify: async (email: string, code: string): Promise<{ verification_token: string }> => {
    const response = await api.post<{ verification_token: string }>('/auth/pre-register-verify', { email, code });
    return response.data;
  },

  checkExists: async (studentCode: string, email: string): Promise<{ student_code_exists: boolean; email_exists: boolean }> => {
    const response = await api.post<{ student_code_exists: boolean; email_exists: boolean }>('/patrons/check-exists', {
      student_code: studentCode,
      email,
    });
    return response.data;
  },

  checkStudentCode: async (code: string): Promise<{ exists: boolean }> => {
    const response = await api.get<{ exists: boolean }>(`/patrons/check-code/${code}`);
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
      await setAccessToken(response.data.access_token);
    }
    if (response.data.refresh_token) {
      await setRefreshToken(response.data.refresh_token);
    }
    return response.data;
  },

  processFaceImage: async (
    imageUri: string,
    processType: 'face_recognition' | 'liveness_check' | 'verify' | 'identify' = 'face_recognition',
    cameraId: string = 'mobile',
    targetUserId?: string,
  ): Promise<{ task_id: string; status: string }> => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'face_process.jpg',
    } as any);
    formData.append('camera_id', cameraId);
    formData.append('process_type', processType);
    formData.append('consent_given', 'true');
    if (targetUserId) {
      formData.append('target_user_id', targetUserId);
    }
    const response = await api.post<{ task_id: string; status: string }>('/face/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ access_token: string; refresh_token?: string; token_type?: string }> => {
    // Refresh is authenticated exclusively by the refresh token in the body.
    // Do not let a stale access-token default header leak into this request.
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { Authorization: undefined }, timeout: 15000 },
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await clearTokens();
  },

  getCurrentUser: async (): Promise<any> => {
    const response = await api.get<any>('/users/me');
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

  uploadAvatar: async (imageUri: string, mimeType?: string): Promise<{ avatarUrl: string }> => {
    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mime = mimeType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: mime,
      name: `avatar.${ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg'}`,
    } as any);
    const response = await api.post<{ avatarUrl: string }>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data;
  },

  deleteAvatar: async (): Promise<void> => {
    await api.delete('/users/me/avatar');
  },

  updateProfile: async (data: { full_name?: string; phone?: string; permanent_address?: string }): Promise<any> => {
    const response = await api.put('/users/me/profile', data);
    return response.data;
  },

  requestEmailChangeOtp: async (newEmail: string): Promise<void> => {
    await api.post('/users/me/email/request-otp', { new_email: newEmail });
  },

  verifyAndChangeEmail: async (newEmail: string, code: string): Promise<void> => {
    await api.put('/users/me/email', { new_email: newEmail, code });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  verifyResetCode: async (email: string, code: string): Promise<void> => {
    await api.post('/auth/verify-reset-code', { email, code });
  },

  resetPassword: async (email: string, code: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', {
      email,
      code,
      new_password: newPassword,
    });
  },
};
