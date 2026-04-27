import { useState, useEffect, useCallback } from 'react';
import * as configApi from '../../api/config';

export default function DimensionsSection() {
  const [dimensions, setDimensions] = useState([]);
  const [status, setStatus] = useState(null);

  const loadDimensions = useCallback(async () => {
    try {
      const data = await configApi.fetchDimensions();
      setDimensions(data.dimensions || data || []);
    } catch { setDimensions([]); }
  }, []);

  useEffect(() => { loadDimensions(); }, [loadDimensions]);

  const moveItem = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= dimensions.length) return;
    const updated = [...dimensions];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    setDimensions(updated);
  };

  const updateField = (index, field, value) => {
    setDimensions(dimensions.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const addDimension = () => {
    setDimensions([...dimensions, { key: `dim_${dimensions.length + 1}`, name: `维度${dimensions.length + 1}`, desc: '' }]);
  };

  const removeDimension = (index) => setDimensions(dimensions.filter((_, i) => i !== index));

  const handleSave = async () => {
    setStatus(null);
    for (const d of dimensions) {
      if (!d.key?.trim()) { setStatus({ type: 'err', msg: '维度 key 不能为空' }); return; }
      if (!d.name?.trim()) { setStatus({ type: 'err', msg: '维度名称不能为空' }); return; }
    }
    const keys = dimensions.map(d => d.key);
    if (new Set(keys).size !== keys.length) { setStatus({ type: 'err', msg: '维度 key 不能重复' }); return; }
    try {
      await configApi.saveDimensions(dimensions);
      setStatus({ type: 'ok', msg: '评分维度已保存' });
    } catch (e) { setStatus({ type: 'err', msg: e.message }); }
  };

  return (
    <>
      {status && <div className={`status-msg ${status.type}`}>{status.msg}</div>}
      <div className="form-hint" style={{ marginBottom: 12 }}>配置品鉴打分的评分项，拖拽排序</div>
      {dimensions.map((dim, i) => (
        <div key={i} className="dim-card">
          <span className="dim-handle" title="拖拽排序">☰</span>
          <div className="dim-fields">
            <input className="dim-key" value={dim.key} placeholder="key" title="唯一标识（英文）"
              onChange={e => updateField(i, 'key', e.target.value)} />
            <input className="dim-name" value={dim.name} placeholder="名称" title="显示名称"
              onChange={e => updateField(i, 'name', e.target.value)} />
            <input className="dim-desc" value={dim.desc || ''} placeholder="描述说明" title="评分提示"
              onChange={e => updateField(i, 'desc', e.target.value)} />
          </div>
          <div className="dim-actions">
            <button title="上移" onClick={() => moveItem(i, -1)} disabled={i === 0}>↑</button>
            <button title="下移" onClick={() => moveItem(i, 1)} disabled={i === dimensions.length - 1}>↓</button>
            <button className="dim-del" title="删除" onClick={() => removeDimension(i)}>✕</button>
          </div>
        </div>
      ))}
      <div className="btn-group" style={{ marginTop: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={addDimension}>+ 添加维度</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave}>保存</button>
        <button className="btn btn-secondary btn-sm" onClick={() => { loadDimensions(); setStatus(null); }}>重置</button>
      </div>
    </>
  );
}
