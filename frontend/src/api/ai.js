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

export async function submitFeedback(data) {
  const res = await apiFetch('/api/ai/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res;
}

export async function getFeedback(messageIds) {
  const res = await apiFetch(`/api/ai/feedback?message_ids=${messageIds.join(',')}`);
  return res;
}

export async function aiRecommend() {
  const res = await apiFetch('/api/ai/recommend', { method: 'POST', rawResponse: true });
  return res.body;
}
