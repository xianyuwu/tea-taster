import { create } from 'zustand';

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

export const useChatStore = create((set, get) => ({
  history: [],
  initialized: false,
  open: false,

  toggleOpen: () => set(state => ({ open: !state.open })),
  setOpen: (open) => set({ open }),

  initHistory: (messages) => {
    if (get().initialized) return;
    set({ history: messages, initialized: true });
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
    set({ history: [...get().history, { role: 'user', content }] });
  },

  appendAssistant: (content) => {
    const history = get().history;
    const last = history[history.length - 1];
    if (last?.role === 'assistant' && last._streaming) {
      set({
        history: [...history.slice(0, -1), { role: 'assistant', content, _streaming: true }],
      });
    } else {
      set({ history: [...history, { role: 'assistant', content, _streaming: true }] });
    }
  },

  finalizeAssistant: () => {
    const history = get().history;
    const last = history[history.length - 1];
    if (last?.role === 'assistant') {
      set({
        history: [...history.slice(0, -1), { role: 'assistant', content: last.content, _streaming: false }],
      });
    }
  },

  reset: () => set({ history: [], initialized: false }),
}));
