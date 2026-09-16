import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const ACCESS_KEY = 'tutionflow_access_token';
const REFRESH_KEY = 'tutionflow_refresh_token';

export async function getToken() { return AsyncStorage.getItem(ACCESS_KEY); }
export async function saveSession(accessToken: string, refreshToken?: string) { await AsyncStorage.setItem(ACCESS_KEY, accessToken); if (refreshToken) await AsyncStorage.setItem(REFRESH_KEY, refreshToken); }
export async function clearSession() { await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]); }

export async function apiFetch<T>(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? `Request failed (${response.status})`);
  return body as T;
}