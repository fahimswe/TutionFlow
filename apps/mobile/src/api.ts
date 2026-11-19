import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');

const ACCESS_KEY = 'tutionflow_access_token';
const REFRESH_KEY = 'tutionflow_refresh_token';

let refreshInProgress: Promise<string | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function getToken() {
  return AsyncStorage.getItem(ACCESS_KEY);
}

export async function saveSession(accessToken: string, refreshToken?: string) {
  await AsyncStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) {
    await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export async function clearSession() {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}

async function readBody(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

async function send<T>(path: string, options: RequestInit, token: string | null) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', ['Bearer', token].join(' '));

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (reason) {
    const detail = reason instanceof Error ? ` ${reason.message}` : '';
    throw new Error(`Could not connect to the TutionFlow API at ${API_URL}.${detail}`);
  }

  const body = await readBody(response);
  return { response, body: body as T };
}

async function refreshAccessToken() {
  if (!refreshInProgress) {
    refreshInProgress = (async () => {
      const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
      if (!refreshToken) {
        await clearSession();
        return null;
      }

      const { response, body } = await send<{ accessToken?: string; refreshToken?: string }>(
        '/api/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
        null,
      );
      if (!response.ok || !body.accessToken) {
        await clearSession();
        return null;
      }

      await saveSession(body.accessToken, body.refreshToken);
      return body.accessToken;
    })().finally(() => {
      refreshInProgress = null;
    });
  }
  return refreshInProgress;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}) {
  const token = await getToken();
  let { response, body } = await send<T>(path, options, token);
  const isAuthRequest = path.startsWith('/api/auth/login')
    || path.startsWith('/api/auth/register')
    || path.startsWith('/api/auth/refresh');

  if (response.status === 401 && !isAuthRequest) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      ({ response, body } = await send<T>(path, options, refreshedToken));
    }
    if (response.status === 401) {
      await clearSession();
      unauthorizedHandler?.();
    }
  }

  if (!response.ok) {
    const message = (body as { message?: string }).message;
    throw new Error(message ?? `Request failed (${response.status})`);
  }
  return body;
}
