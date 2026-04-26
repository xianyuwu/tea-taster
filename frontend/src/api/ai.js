import { getToken } from './client';

export async function aiAnalyze() {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/ai/analyze', { method: 'POST', headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '分析失败' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.body;
}

export async function aiChat(messages) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '对话失败' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.body;
}
