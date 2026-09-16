export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('tutionflow_access_token');
}

export function setSession(accessToken: string, refreshToken?: string) {
  window.localStorage.setItem('tutionflow_access_token', accessToken);
  if (refreshToken) window.localStorage.setItem('tutionflow_refresh_token', refreshToken);
}

export function clearSession() {
  window.localStorage.removeItem('tutionflow_access_token');
  window.localStorage.removeItem('tutionflow_refresh_token');
}

async function request<T>(path: string, options: RequestInit = {}, accessToken = getToken()) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function refreshAccessToken() {
  if (typeof window === 'undefined') return null;
  const refreshToken = window.localStorage.getItem('tutionflow_refresh_token');
  if (!refreshToken) return null;
  const { response, body } = await request<{ accessToken?: string; refreshToken?: string }>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }, null);
  if (!response.ok || !body.accessToken) return null;
  setSession(body.accessToken, body.refreshToken);
  return body.accessToken;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}) {
  let { response, body } = await request<T>(path, options);
  const isAuthRequest = path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register') || path.startsWith('/api/auth/refresh');
  if (response.status === 401 && !isAuthRequest) {
    const accessToken = await refreshAccessToken();
    if (accessToken) ({ response, body } = await request<T>(path, options, accessToken));
  }
  if (!response.ok) throw new Error((body as { message?: string }).message ?? `Request failed (${response.status})`);
  return body as T;
}

export function toJson(data: unknown) {
  return JSON.stringify(data);
}
