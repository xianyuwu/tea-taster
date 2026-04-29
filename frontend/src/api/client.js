const TOKEN_KEY = 'tea_taster_token';
const REFRESH_KEY = 'tea_taster_refresh';

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setRefreshToken(token) {
  localStorage.setItem(REFRESH_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function tryRefreshToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${refreshToken}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    setToken(data.access_token);
    setRefreshToken(data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  let res = await fetch(path, { ...options, headers });

  if (res.status === 401 && token && !path.includes('/auth/')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      res = await fetch(path, { ...options, headers });
    } else {
      clearToken();
      window.location.href = '/login';
      return res;
    }
  }

  if (res.status === 204) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `请求失败 (HTTP ${res.status})` }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  if (options.rawResponse) return res;
  return res.json();
}
