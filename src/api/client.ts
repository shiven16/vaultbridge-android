import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:3000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Attach JWT from SecureStore on every request
client.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore read errors — request goes out without token
  }
  return config;
});

// On 401, clear token and redirect to login (except for auth checks)
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/me') || url.includes('/auth/login') || url.includes('/auth/callback');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      try {
        await SecureStore.deleteItemAsync('jwt_token');
      } catch {}
      try {
        router.replace('/(auth)/login');
      } catch {}
    }
    return Promise.reject(error);
  },
);

export default client;

