import { create } from 'zustand';

// genId() 仅在 HTTPS 下可用，本地 HTTP 开发环境不可用
const genId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function buildTeaInfoText(teas, dimensions, teaFields) {
  const scored = teas.filter(t => t.scores && Object.values(t.scores).some(v => v > 0));
  if (scored.length === 0) return '';

  const dimNames = {};
  for (const d of dimensions) dimNames[d.key] = d.name;
  const maxTotal = dimensions.length * 5;

  let text = '';
  for (const t of scored) {
    const scoresStr = dimensions
      .map(d => `${dimNames[d.key]}=${t.scores?.[d.key] || 0}/5`)
      .join('、');
    const total = dimensions.reduce((s, d) => s + (t.scores?.[d.key] || 0), 0);
    text += `- ${t.name}：${scoresStr}，总分=${total}/${maxTotal}`;
    if (t.note) text += `，备注：${t.note}`;
    for (const f of teaFields) {
      const val = t[f.key] || t.extra_fields?.[f.key];
      if (val) text += `，${f.label}：${val}`;
    }
    text += '\n';
  }
  return text;
}

// 给消息对象加上 _id
function withId(msg) {
  return { ...msg, _id: genId() };
}

export const useChatStore = create((set, get) => ({
  history: [],
  initialized: false,
  open: false,

  toggleOpen: () => set(state => ({ open: !state.open })),
  setOpen: (open) => set({ open }),

  initHistory: (messages) => {
    if (get().initialized) return;
    // 给上下文消息也加 _id
    set({ history: messages.map(withId), initialized: true });
  },

  buildContextMessages: (teas, dimensions, teaFields, report) => {
    const teaInfo = buildTeaInfoText(teas, dimensions, teaFields);
    if (!teaInfo) return [];

    const messages = [];
    const maxTotal = dimensions.length * 5;
    messages.push({
      role: 'user',
      content: `以下是我品鉴的岩茶评分数据（每项满分5分，总分满分${maxTotal}分）：\n\n${teaInfo}`,
      _context: true,
    });

    if (report) {
      messages.push({
        role: 'assistant',
        content: report,
        _context: true,
      });
    }

    return messages;
  },

  addUserMessage: (content) => {
    set({ history: [...get().history, { role: 'user', content, _id: genId() }] });
  },

  appendAssistant: (content) => {
    const history = get().history;
    const last = history[history.length - 1];
    if (last?.role === 'assistant' && last._streaming) {
      set({
        history: [...history.slice(0, -1), { ...last, content }],
      });
    } else {
      set({ history: [...history, { role: 'assistant', content, _streaming: true, _id: genId(), _feedback: null }] });
    }
  },

  finalizeAssistant: () => {
    const history = get().history;
    const last = history[history.length - 1];
    if (last?.role === 'assistant') {
      set({
        history: [...history.slice(0, -1), { ...last, _streaming: false }],
      });
    }
  },

  // 更新指定消息的反馈状态
  setFeedback: (messageId, feedback) => {
    const history = get().history.map(m =>
      m._id === messageId ? { ...m, _feedback: feedback } : m
    );
    set({ history });
  },

  // 批量设置反馈（从后端加载时用）
  loadFeedback: (feedbackList) => {
    const feedbackMap = {};
    for (const f of feedbackList) feedbackMap[f.message_id] = f.feedback;
    const history = get().history.map(m => {
      if (feedbackMap[m._id] !== undefined) {
        return { ...m, _feedback: feedbackMap[m._id] };
      }
      return m;
    });
    set({ history });
  },

  // 重新生成：删除最后一条 assistant 消息，返回最后一条 user 消息内容
  regenerate: () => {
    const history = get().history;
    // 找到最后一条非 context 的 assistant 消息
    let lastAssistantIdx = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant' && !history[i]._context) {
        lastAssistantIdx = i;
        break;
      }
    }
    if (lastAssistantIdx === -1) return null;

    // 找到这条 assistant 消息之前的最后一条 user 消息
    let userMsg = null;
    for (let i = lastAssistantIdx - 1; i >= 0; i--) {
      if (history[i].role === 'user' && !history[i]._context) {
        userMsg = history[i].content;
        break;
      }
    }

    // 删除最后一条 assistant 消息
    const newHistory = [...history.slice(0, lastAssistantIdx), ...history.slice(lastAssistantIdx + 1)];
    set({ history: newHistory });
    return userMsg;
  },

  reset: () => set({ history: [], initialized: false }),
}));
