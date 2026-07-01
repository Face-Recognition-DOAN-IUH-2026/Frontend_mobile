import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from './secureStorage';
import { devError } from '../utils/logger';
import { API_BASE_URL } from '../config/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      devError('[API] Failed to get token from storage:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && !(error.config as any).__isRetry) {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefreshToken } = response.data;
          await setAccessToken(access_token);
          if (newRefreshToken) {
            await setRefreshToken(newRefreshToken);
          }
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${access_token}`;
            (error.config as any).__isRetry = true;
            return api.request(error.config);
          }
        } catch (refreshError) {
          await clearTokens();
          await AsyncStorage.multiRemove(['patronData', 'userData']);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
