import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNoteStore } from '../../stores/useNoteStore';
import NoteEditor from './NoteEditor';

export default function NoteList() {
  const {
    loadNotes, addNote, updateNote, removeNote,
    setSearch, setTagFilter, setPage, setPageSize,
    getFilteredNotes, getAllTags,
  } = useNoteStore();

  const search = useNoteStore(s => s.search);
  const activeTagFilter = useNoteStore(s => s.activeTagFilter);
  const page = useNoteStore(s => s.page);
  const pageSize = useNoteStore(s => s.pageSize);
  const notesList = useNoteStore(s => s.notes);

  const [editorNote, setEditorNote] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const allTags = useMemo(() => getAllTags(), [getAllTags, notesList]);
  const { notes: pagedNotes, total } = useMemo(() => getFilteredNotes(), [getFilteredNotes, search, activeTagFilter, page, pageSize, notesList]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSave = async (data) => {
    if (editorNote?.id) {
      await updateNote(editorNote.id, data);
    } else {
      await addNote(data);
    }
    setShowEditor(false);
    setEditorNote(null);
  };

  const handleEdit = (note) => {
    setEditorNote(note);
    setShowEditor(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除此笔记？')) return;
    await removeNote(id);
  };

  const handleCreate = () => {
    setEditorNote(null);
    setShowEditor(true);
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="notes-toolbar">
        <input
          className="notes-search"
          placeholder="搜索笔记..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleCreate}>＋ 新增笔记</button>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="notes-tag-filter">
          <button
            className={`tag-filter-pill ${activeTagFilter === null ? 'active' : ''}`}
            onClick={() => setTagFilter(null)}
          >
            全部
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`tag-filter-pill ${activeTagFilter === tag ? 'active' : ''}`}
              onClick={() => setTagFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {pagedNotes.length === 0 && (
        <div className="empty-hint">暂无笔记</div>
      )}

      {/* Note cards with 8-color rotation */}
      {pagedNotes.map((note, index) => {
        const isExpanded = expandedIds.has(note.id);
        const colorIdx = index % 8;

        return (
          <div key={note.id} className={`note-card color-${colorIdx}`}>
            <div className="note-card-title">{note.title || '无标题'}</div>

            <div className="note-meta">
              <span className="note-source-tag">
                {note.source === 'ai-chat' ? '🤖 AI 对话' : '✏️ 手动'}
              </span>
              <span>{note.created_at ? new Date(note.created_at).toLocaleString('zh-CN') : ''}</span>
            </div>

            {note.tags?.length > 0 && (
              <div className="note-tags">
                {note.tags.map(tag => (
                  <span key={tag} className="note-tag-pill">{tag}</span>
                ))}
              </div>
            )}

            <div className={`note-content ${isExpanded ? 'expanded' : ''}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {note.content || ''}
              </ReactMarkdown>
            </div>

            <div className="note-actions">
              <button className="note-expand-btn" onClick={() => toggleExpand(note.id)}>
                {isExpanded ? '收起' : '展开'}
              </button>
              <button className="note-action-btn" onClick={() => handleEdit(note)}>编辑</button>
              <button className="note-action-btn danger" onClick={() => handleDelete(note.id)}>删除</button>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {total > pageSize && (
        <div className="notes-pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            上一页
          </button>
          <span className="page-info">
            第 {page} 页 / 共 {totalPages} 页（共 {total} 条）
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            下一页
          </button>
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
            <option value={10}>10条/页</option>
            <option value={20}>20条/页</option>
            <option value={50}>50条/页</option>
          </select>
        </div>
      )}

      {showEditor && (
        <NoteEditor
          note={editorNote}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditorNote(null); }}
        />
      )}
    </div>
  );
}
