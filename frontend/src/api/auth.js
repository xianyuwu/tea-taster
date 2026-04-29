import { apiFetch, setToken, setRefreshToken, clearToken } from './client';

export async function registerFirst(username, password) {
  const data = await apiFetch('/api/auth/register-first', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.access_token);
  setRefreshToken(data.refresh_token);
  return data;
}

export async function register(username, password) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function login(username, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.access_token);
  setRefreshToken(data.refresh_token);
  return data;
}

export async function getMe() {
  return apiFetch('/api/auth/me');
}

export async function hasUsers() {
  const data = await apiFetch('/api/auth/has-users');
  return data.has_users;
}

export async function changePassword(oldPassword, newPassword) {
  return apiFetch('/api/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

export async function logout() {
  clearToken();
}

export async function fetchUsers() {
  return apiFetch('/api/auth/users');
}

export async function changeUserRole(userId, role) {
  return apiFetch(`/api/auth/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function deleteUser(userId) {
  return apiFetch(`/api/auth/users/${userId}`, {
    method: 'DELETE',
  });
}
