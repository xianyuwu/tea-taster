import { apiFetch } from './client';

export async function aiAnalyze() {
  const res = await apiFetch('/api/ai/analyze', { method: 'POST', rawResponse: true });
  return res.body;
}

export async function aiChat(messages) {
  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
    rawResponse: true,
  });
  return res.body;
}
