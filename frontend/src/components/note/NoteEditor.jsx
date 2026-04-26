import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TOOLBAR_ITEMS = [
  { label: 'B', title: '粗体', prefix: '**', suffix: '**' },
  { label: 'I', title: '斜体', prefix: '*', suffix: '*' },
  { type: 'sep' },
  { label: 'H1', title: '一级标题', prefix: '# ', suffix: '' },
  { label: 'H2', title: '二级标题', prefix: '## ', suffix: '' },
  { label: 'H3', title: '三级标题', prefix: '### ', suffix: '' },
  { type: 'sep' },
  { label: '•', title: '无序列表', prefix: '- ', suffix: '' },
  { label: '1.', title: '有序列表', prefix: '1. ', suffix: '' },
  { label: '""', title: '引用', prefix: '> ', suffix: '' },
  { type: 'sep' },
  { label: '---', title: '分割线', prefix: '\n---\n', suffix: '' },
  { label: '<>', title: '代码', prefix: '`', suffix: '`' },
];

export default function NoteEditor({ note, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState('edit');
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setTags(note.tags || []);
      setContent(note.content || '');
    }
    // Trigger scale animation
    requestAnimationFrame(() => setShow(true));
  }, [note]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/,$/, '');
      if (val && !tags.includes(val)) setTags([...tags, val]);
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tag) => setTags(tags.filter(t => t !== tag));

  const insertMarkdown = (prefix, suffix) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = prefix + selected + suffix;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = start + prefix.length;
      ta.selectionEnd = start + prefix.length + selected.length;
    }, 0);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), tags, content });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={onClose}>
      <div className={`note-editor-dialog ${show ? 'show' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="note-editor-header">
          <span className="note-editor-dialog-title">{note ? '编辑笔记' : '新建笔记'}</span>
          <button className="note-editor-close" onClick={onClose}>✕</button>
        </div>

        {/* Title */}
        <input
          className="note-title-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="笔记标题"
        />

        {/* Tags */}
        <div className="note-editor-tags">
          {tags.map(tag => (
            <span key={tag} className="editor-tag-pill">
              {tag}
              <span className="editor-tag-remove" onClick={() => removeTag(tag)}>✕</span>
            </span>
          ))}
          <input
            className="note-editor-tags-input"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={tags.length === 0 ? '输入标签，回车添加' : '添加标签'}
          />
        </div>

        {/* Toolbar */}
        <div className="note-toolbar">
          {TOOLBAR_ITEMS.map((item, i) => {
            if (item.type === 'sep') return <div key={i} className="note-toolbar-sep" />;
            return (
              <button
                key={i}
                className="note-toolbar-btn"
                title={item.title}
                onClick={() => insertMarkdown(item.prefix, item.suffix)}
              >
                {item.label}
              </button>
            );
          })}
          <div className="note-toolbar-sep" />
          <button
            className={`note-toolbar-btn ${mode === 'edit' ? 'active' : ''}`}
            onClick={() => setMode('edit')}
          >
            编辑
          </button>
          <button
            className={`note-toolbar-btn ${mode === 'preview' ? 'active' : ''}`}
            onClick={() => setMode('preview')}
          >
            预览
          </button>
        </div>

        {/* Body */}
        <div className="note-editor-body">
          {mode === 'edit' ? (
            <textarea
              ref={textareaRef}
              className="note-editor-textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="输入笔记内容（支持 Markdown）..."
            />
          ) : (
            <div className="note-editor-preview">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <span style={{ color: '#c4b0a0' }}>暂无内容</span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="note-editor-footer">
          <button className="btn btn-cancel" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
