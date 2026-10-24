import axios from 'axios';
import { getItemAsync } from '../utils/storage';
import { useAuthStore } from '../store/useAuthStore';
import { useNetworkStore } from '../store/useNetworkStore';

// Resolves API host dynamically:
// - Physical Android / iOS devices can set EXPO_PUBLIC_API_URL in .env (e.g., http://192.168.1.X:5000)
// - Android Studio Emulator routes to host via 10.0.2.2
// - iOS Simulator and Web connect via localhost:5000
const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    const raw = process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
    return raw.endsWith('/api') ? raw : `${raw}/api`;
  }

  if (__DEV__) {
    // In dev, localhost:5000 is accessible via adb reverse tcp:5000 tcp:5000 on Android emulator,
    // and directly on iOS simulator and Web.
    return 'http://localhost:5000/api';
  }

  // Production fallback
  return 'https://api.legalnow.com/api';
};

// eslint-disable-next-line import/no-named-as-default-member
export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request Interceptor: Attach bearer token and normalize endpoint paths
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getItemAsync('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Never crash on token retrieval
    }

    // Defense-in-depth: If config.url starts with '/api/', strip it because baseURL already ends with '/api'
    if (config.url && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api/, '');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global 401 handling, session expiration & network connectivity state
apiClient.interceptors.response.use(
  (response) => {
    if (useNetworkStore.getState().isOffline) {
      useNetworkStore.getState().setOffline(false);
    }
    return response;
  },
  async (error) => {
    // Detect network-level failures, timeouts, and offline status
    if (
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error' ||
      error.code === 'ECONNABORTED'
    ) {
      useNetworkStore.getState().setOffline(true, 'Server connection unreachable');
    }

    if (error.response && error.response.status === 401) {
      // Securely clear session on 401 Unauthorized
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
