import { useState, useEffect, useRef, useCallback } from 'react';
import StarRating from './StarRating';

export default function TeaCard({ tea, dimensions, teaFields, onScore, onNote, onUploadPhoto, onEdit }) {
  const [noteText, setNoteText] = useState(tea.note || '');
  const debounceRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setNoteText(tea.note || '');
  }, [tea.id, tea.note]);

  const handleNoteChange = useCallback((e) => {
    const val = e.target.value;
    setNoteText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onNote(tea.id, val);
    }, 500);
  }, [tea.id, onNote]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPhoto(tea.id, file);
      e.target.value = '';
    }
  };

  const totalScore = Object.values(tea.scores || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const maxScore = dimensions.length * 5;
  const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return (
    <div className="tea-card">
      {/* Header: photo + info 水平排列 */}
      <div className="tea-card-header">
        <div
          className={`tea-card-photo ${tea.photo ? 'has-img' : ''}`}
          onClick={handlePhotoClick}
        >
          {tea.photo ? (
            <img src={`/data/photos/${tea.photo}`} alt={tea.name} />
          ) : (
            <div className="photo-hint">
              <span className="cam-icon">📷</span>
              上传
            </div>
          )}
          {tea.photo && <div className="photo-overlay">更换照片</div>}
          {tea.photo && (
            <div className="photo-preview">
              <img src={`/data/photos/${tea.photo}`} alt={tea.name} />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        <div className="tea-card-info">
          <div className="tea-card-name-row">
            <div className="tea-card-name">🍃 {tea.name}</div>
            <button className="tea-edit-btn" onClick={() => onEdit(tea)}>✎</button>
          </div>
          {teaFields.length > 0 && (
            <div className="tea-card-meta">
              {teaFields.map(field => {
                const val = tea[field.key];
                if (!val) return null;
                return (
                  <span key={field.key} className="tea-meta-pill">
                    <b>{field.label}：</b>{val}{field.unit ? field.unit : ''}
                  </span>
                );
              })}
            </div>
          )}
          <div className="tea-card-score-summary">
            总分：{totalScore} / {maxScore} ({pct}%)
          </div>
        </div>
      </div>

      {/* 维度评分 */}
      {dimensions.map(dim => (
        <StarRating
          key={dim.key}
          dimension={dim}
          value={tea.scores?.[dim.key] || 0}
          onChange={onScore}
        />
      ))}

      {/* 品鉴笔记 */}
      <textarea
        className="note-input"
        rows={2}
        value={noteText}
        onChange={handleNoteChange}
        placeholder="记录你对这款茶的感受..."
      />
    </div>
  );
}
