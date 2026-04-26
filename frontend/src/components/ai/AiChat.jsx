import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../../stores/useChatStore';
import { useNoteStore } from '../../stores/useNoteStore';
import { useTeaStore } from '../../stores/useTeaStore';
import { aiChat } from '../../api/ai';
import { readSSEStream } from '../../hooks/useSSE';

export default function AiChat() {
  const open = useChatStore(s => s.open);
  const history = useChatStore(s => s.history);
  const initialized = useChatStore(s => s.initialized);
  const toggleOpen = useChatStore(s => s.toggleOpen);
  const addUserMessage = useChatStore(s => s.addUserMessage);
  const appendAssistant = useChatStore(s => s.appendAssistant);
  const finalizeAssistant = useChatStore(s => s.finalizeAssistant);
  const reset = useChatStore(s => s.reset);

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [size, setSize] = useState({ w: 400, h: 500 });
  const [maximized, setMaximized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const [selection, setSelection] = useState(null);
  const [showCollectPanel, setShowCollectPanel] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState(null);
  const collectPanelRef = useRef(null);
  const collectBtnRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [history]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const checkChatSelection = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || !panelRef.current) { setSelection(null); return; }
    try {
      const range = sel.getRangeAt(0);
      if (!panelRef.current.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setSelection({ text, x: rect.left + rect.width / 2, y: rect.top });
    } catch {
      setSelection(null);
    }
  };

  useEffect(() => {
    const handleMouseUp = (e) => {
      if (collectBtnRef.current?.contains(e.target) || collectPanelRef.current?.contains(e.target)) return;
      setShowCollectPanel(false);
      setTimeout(checkChatSelection, 50);
    };
    const handleTouchEnd = () => {
      setShowCollectPanel(false);
      setTimeout(checkChatSelection, 100);
    };
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || streaming) return;

    // 首次发送时注入茶样数据和报告作为上下文
    if (!initialized) {
      const { teas, dimensions, teaFields, report } = useTeaStore.getState();
      const contextMsgs = useChatStore.getState().buildContextMessages(teas, dimensions, teaFields, report);
      useChatStore.getState().initHistory(contextMsgs);
    }

    addUserMessage(msg);
    setInput('');
    setStreaming(true);

    // 用最新 history（含刚注入的上下文）拼接消息
    const currentHistory = useChatStore.getState().history;
    const messages = [...currentHistory, { role: 'user', content: msg }].map(m => ({
      role: m.role, content: m.content,
    }));

    let fullText = '';
    try {
      const stream = await aiChat(messages);
      await readSSEStream(
        stream,
        (chunk) => { fullText += chunk; appendAssistant(fullText); },
        () => { finalizeAssistant(); setStreaming(false); }
      );
    } catch (err) {
      appendAssistant(`抱歉，出错了：${err.message}`);
      finalizeAssistant();
      setStreaming(false);
    }
  }, [input, streaming, history, initialized, addUserMessage, appendAssistant, finalizeAssistant]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClear = () => { reset(); setStreaming(false); };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const closeCollect = () => {
    setShowCollectPanel(false);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleFloatBtnClick = () => {
    if (!selection) return;
    setPanelPos({ x: selection.x, y: selection.y + 4 });
    setShowCollectPanel(true);
  };

  const collectToNewNote = async () => {
    if (!selection?.text) return;
    const { addNote } = useNoteStore.getState();
    try {
      await addNote({ title: 'AI 对话收藏', content: selection.text, source: 'ai-chat', tags: ['AI收藏'] });
      showToast('已新建笔记');
    } catch { /* ignore */ }
    closeCollect();
  };

  const collectToExistingNote = async (noteId) => {
    if (!selection?.text) return;
    const { notes, updateNote } = useNoteStore.getState();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    try {
      await updateNote(noteId, {
        title: note.title || '',
        content: note.content + '\n\n' + selection.text,
      });
      showToast('已追加到笔记');
    } catch { /* ignore */ }
    closeCollect();
  };

  const toggleMaximize = () => {
    setMaximized(!maximized);
  };

  // Resize handlers (left edge for width, top edge for height)
  const handleResizeLeft = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = size.w;
    const handleMove = (e) => {
      const dx = startX - e.clientX;
      const newW = Math.min(Math.max(startW + dx, 300), window.innerWidth * 0.5);
      setSize(s => ({ ...s, w: newW }));
    };
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleResizeTop = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = size.h;
    const handleMove = (e) => {
      const dy = startY - e.clientY;
      const newH = Math.min(Math.max(startH + dy, 300), window.innerHeight * 0.7);
      setSize(s => ({ ...s, h: newH }));
    };
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  if (!open) {
    return (
      <button
        className="ai-fab"
        onClick={toggleOpen}
        aria-label="AI 对话"
      >
        🤖
      </button>
    );
  }

  const panelStyle = maximized
    ? { right: 20, bottom: 105, width: 'calc(50vw)', height: Math.min(size.h * 1.33, window.innerHeight * 0.7), minWidth: 300, minHeight: 300 }
    : { right: 20, bottom: 105, width: size.w, height: size.h, minWidth: 300, maxWidth: '50vw', minHeight: 300, maxHeight: '70vh' };

  return (
    <>
      {/* Floating collect button */}
      {selection && !showCollectPanel && (
        <button
          ref={collectBtnRef}
          className="collect-float-btn"
          onClick={handleFloatBtnClick}
          style={{ left: selection.x, top: selection.y - 36, transform: 'translateX(-50%)' }}
        >
          📌 收藏到笔记
        </button>
      )}

      {/* Collect panel */}
      {showCollectPanel && (
        <div
          ref={collectPanelRef}
          className="collect-panel"
          style={{
            left: Math.min(panelPos.x, window.innerWidth - 270),
            top: panelPos.y,
          }}
        >
          <div className="collect-panel-header">收藏到笔记</div>
          <div className="collect-panel-item create" onClick={collectToNewNote}>
            ＋ 新建笔记
          </div>
          {[...useNoteStore.getState().notes].reverse().slice(0, 10).map(n => (
            <div
              key={n.id}
              className="collect-panel-item"
              onClick={() => collectToExistingNote(n.id)}
            >
              {n.title || n.content?.substring(0, 20).replace(/\n/g, ' ')}
              <div className="item-sub">{n.updated_at || n.created_at}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast show">{toast}</div>}

      <div
        ref={panelRef}
        className="ai-chat-panel show"
        style={panelStyle}
      >
        {/* Left resize handle */}
        {!maximized && (
          <div className="ai-chat-resize-handle" onMouseDown={handleResizeLeft} />
        )}

        <div className="ai-chat-content">
          {/* Top resize handle */}
          {!maximized && (
            <div className="ai-chat-resize-handle-top" onMouseDown={handleResizeTop} />
          )}

          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-title">🤖 AI 品鉴助手</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button className="ai-chat-maximize" onClick={toggleMaximize} title={maximized ? '还原' : '最大化'}>
                ⤢
              </button>
              <button className="ai-chat-close" onClick={toggleOpen} title="关闭">
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-chat-body">
            {history.filter(m => !m._context).length === 0 && (
              <div className="ai-chat-empty">
                <div className="empty-icon">🍵</div>
                点击下方开始对话<br />
                可针对品鉴结果提问
              </div>
            )}
            {history.filter(m => !m._context).map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div className="chat-avatar">
                  {msg.role === 'user' ? '👤' : '🍵'}
                </div>
                <div className="chat-bubble">
                  {msg.role === 'assistant' ? (
                    <>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                      {msg._streaming && <span className="ai-cursor"></span>}
                      {!msg._streaming && <div className="collect-hint">💡 选中文字可收藏到笔记</div>}
                    </>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div className="ai-chat-footer">
            <div className="ai-chat-input-wrap">
              <input
                ref={inputRef}
                className="ai-chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入问题，如：哪款更适合送礼？"
                disabled={streaming}
              />
              <button
                className="ai-chat-send"
                onClick={handleSend}
                disabled={streaming || !input.trim()}
              >
                发送
              </button>
            </div>
            <div className="ai-chat-actions">
              <button className="ai-chat-action-btn" onClick={handleClear}>清空对话</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
