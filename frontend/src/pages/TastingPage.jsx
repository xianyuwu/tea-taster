import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTeaStore } from '../stores/useTeaStore';
import { useNoteStore } from '../stores/useNoteStore';
import { useAuthStore } from '../stores/useAuthStore';
import TeaCarousel from '../components/tea/TeaCarousel';
import TeaCard from '../components/tea/TeaCard';
import TeaEditor from '../components/tea/TeaEditor';
import ComparisonTable from '../components/tea/ComparisonTable';
import RankList from '../components/tea/RankList';
import AiReport from '../components/ai/AiReport';
import AiChat from '../components/ai/AiChat';
import NoteList from '../components/note/NoteList';

const TOP_TABS = [
  { key: 'tasting', label: '🎯 品鉴打分' },
  { key: 'notes', label: '📝 品茶笔记' },
];

const SUB_TABS = [
  { key: 'score', label: '逐款打分' },
  { key: 'table', label: '对比表格' },
  { key: 'rank', label: '排名结果' },
];

export default function TastingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const topTab = searchParams.get('tab') || 'tasting';
  const subTab = searchParams.get('sub') || 'score';
  const setTopTab = (t) => {
    const params = { tab: t };
    if (t === 'tasting') params.sub = searchParams.get('sub') || 'score';
    setSearchParams(params);
  };
  const setSubTab = (s) => setSearchParams({ tab: topTab, sub: s });
  const [newTeaName, setNewTeaName] = useState('');
  const [editorTea, setEditorTea] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const navigate = useNavigate();
  const logout = useAuthStore(s => s.logout);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const teas = useTeaStore(s => s.teas);
  const dimensions = useTeaStore(s => s.dimensions);
  const teaFields = useTeaStore(s => s.teaFields);
  const currentCardIndex = useTeaStore(s => s.currentCardIndex);
  const loadData = useTeaStore(s => s.loadData);
  const addTea = useTeaStore(s => s.addTea);
  const removeTea = useTeaStore(s => s.removeTea);
  const setScore = useTeaStore(s => s.setScore);
  const updateTeaLocal = useTeaStore(s => s.updateTeaLocal);
  const uploadPhoto = useTeaStore(s => s.uploadPhoto);
  const setCurrentCard = useTeaStore(s => s.setCurrentCard);
  const loadNotes = useNoteStore(s => s.loadNotes);

  useEffect(() => {
    loadData();
    loadNotes();
  }, [loadData, loadNotes]);

  const handleAddTea = () => {
    const name = newTeaName.trim();
    setEditorTea(name ? { name } : null);
    setShowEditor(true);
  };

  const handleScore = (key, val) => {
    const tea = teas[currentCardIndex];
    if (!tea) return;
    setScore(tea.id, key, val);
  };

  const handleNote = (teaId, note) => {
    updateTeaLocal(teaId, { note });
    import('../api/teas').then(teasApi => {
      teasApi.updateTea(teaId, { note });
    });
  };

  const handleUploadPhoto = async (teaId, file) => {
    try {
      await uploadPhoto(teaId, file);
    } catch (err) {
      alert(err.message || '上传失败');
    }
  };

  const handleEdit = (tea) => {
    setEditorTea(tea);
    setShowEditor(true);
  };

  const handleEditorSave = async (data) => {
    try {
      if (editorTea?.id) {
        const { useTeaStore: store } = await import('../stores/useTeaStore');
        await store.getState().updateTea(editorTea.id, data);
      } else {
        await addTea(data);
      }
      setShowEditor(false);
      setEditorTea(null);
      setNewTeaName('');
    } catch (err) {
      alert(err.message || '保存失败');
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditorTea(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteTea = (teaId) => {
    setDeleteTarget(teaId);
  };

  const confirmDelete = async () => {
    try {
      await removeTea(deleteTarget);
    } catch (err) {
      alert(err.message || '删除失败');
    }
    setDeleteTarget(null);
  };

  const currentTea = teas[currentCardIndex];

  return (
    <>
      {/* 标题区 */}
      <div style={{ position: 'relative', marginBottom: 4 }}>
        <h1>🍵 岩茶品鉴对比</h1>
        <div ref={menuRef} className="user-menu-wrapper">
          <button className="user-menu-trigger" onClick={() => setMenuOpen(v => !v)}>
            👤
          </button>
          {menuOpen && (
            <div className="user-menu-dropdown">
              {user?.role === 'admin' && (
                <button className="user-menu-item" onClick={() => { setMenuOpen(false); navigate('/admin'); }}>
                  ⚙️ 配置管理
                </button>
              )}
              <button className="user-menu-item" onClick={() => { setMenuOpen(false); handleLogout(); }}>
                🚪 退出登录
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="subtitle">多款岩茶同时冲泡，逐一品鉴、横向对比、AI 辅助分析</div>

      {/* Top tabs */}
      <div className="top-tabs">
        {TOP_TABS.map(tab => (
          <button
            key={tab.key}
            className={`top-tab ${topTab === tab.key ? 'active' : ''}`}
            onClick={() => setTopTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {topTab === 'tasting' && (
        <>
          {/* 冲泡小贴士 */}
          <div className="section">
            <div className="section-title">📌 冲泡小贴士</div>
            <div className="tip-box">
              每款茶用<b>相同条件</b>冲泡才有对比意义：盖碗冲泡，投茶约 8g，沸水冲泡，每泡约 10s 出汤。建议按顺序品鉴，每款品 3-4 泡，先闻香再品饮，最后观叶底。
            </div>
          </div>

          {/* 添加茶样 */}
          <div className="section">
            <div className="section-title">➕ 添加茶样</div>
            <div className="add-area">
              <input
                type="text"
                placeholder="输入茶名..."
                value={newTeaName}
                onChange={e => setNewTeaName(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleAddTea}>
                添加
              </button>
            </div>
            {teas.length > 0 && (
              <div className="tea-tags">
                {teas.map(tea => (
                  <span key={tea.id} className="tea-tag">
                    {tea.photo ? (
                      <img src={`/data/photos/${tea.photo}`} alt="" />
                    ) : (
                      <span className="tag-placeholder">🍃</span>
                    )}
                    {tea.name}
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteTea(tea.id)}
                      style={{ marginLeft: 2 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sub tabs + 内容 */}
          <div className="section">
            <div className="tabs">
              {SUB_TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`tab-btn ${subTab === tab.key ? 'active' : ''}`}
                  onClick={() => setSubTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {subTab === 'score' && (
              <>
                {teas.length === 0 ? (
                  <div className="empty-hint">暂无茶样，请先添加茶样开始品鉴</div>
                ) : (
                  <TeaCarousel
                    teas={teas}
                    currentIndex={currentCardIndex}
                    onSelect={setCurrentCard}
                  >
                    {currentTea && (
                      <TeaCard
                        tea={currentTea}
                        dimensions={dimensions}
                        teaFields={teaFields}
                        onScore={handleScore}
                        onNote={handleNote}
                        onUploadPhoto={handleUploadPhoto}
                        onEdit={handleEdit}
                      />
                    )}
                  </TeaCarousel>
                )}
              </>
            )}

            {subTab === 'table' && <ComparisonTable />}
            {subTab === 'rank' && (
              <>
                <RankList />
                <div className="ai-section">
                  <AiReport />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {topTab === 'notes' && <NoteList />}

      {/* 茶样编辑弹窗 */}
      {showEditor && (
        <TeaEditor
          tea={editorTea}
          teaFields={teaFields}
          onSave={handleEditorSave}
          onClose={handleEditorClose}
        />
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="modal-overlay show" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">🍃</div>
            <div className="modal-title">确认删除</div>
            <div className="modal-desc">
              确定要删除「<b>{teas.find(t => t.id === deleteTarget)?.name || ''}</b>」吗？<br />该茶样的评分和图片将一并删除。
            </div>
            <div className="modal-btns">
              <button className="btn btn-cancel" onClick={() => setDeleteTarget(null)}>取消</button>
              <button className="btn btn-del" onClick={confirmDelete}>删除</button>
            </div>
          </div>
        </div>
      )}

      {/* AI 对话 */}
      <AiChat />
    </>
  );
}
