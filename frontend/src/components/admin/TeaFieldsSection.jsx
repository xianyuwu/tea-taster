import { useState, useEffect, useCallback } from 'react';
import * as configApi from '../../api/config';

export default function TeaFieldsSection({ onFieldsLoaded }) {
  const [fields, setFields] = useState([]);
  const [status, setStatus] = useState(null);

  const loadFields = useCallback(async () => {
    try {
      const data = await configApi.fetchTeaFields();
      const list = data.teaFields || data || [];
      setFields(list);
      if (onFieldsLoaded) onFieldsLoaded(list);
    } catch { setFields([]); }
  }, [onFieldsLoaded]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const updateField = (index, field, value) => {
    setFields(fields.map((f, i) => i === index ? { ...f, [field]: value } : f));
  };

  const addField = () => setFields([...fields, { key: '', label: '', type: 'text', unit: '', align: '' }]);
  const removeField = (index) => setFields(fields.filter((_, i) => i !== index));

  const handleSave = async () => {
    setStatus(null);
    for (const f of fields) {
      if (!f.key?.trim()) { setStatus({ type: 'err', msg: '字段 key 不能为空' }); return; }
      if (!f.label?.trim()) { setStatus({ type: 'err', msg: '字段标签不能为空' }); return; }
    }
    try {
      await configApi.saveTeaFields(fields);
      setStatus({ type: 'ok', msg: '茶样字段已保存' });
      if (onFieldsLoaded) onFieldsLoaded(fields);
    } catch (e) { setStatus({ type: 'err', msg: e.message }); }
  };

  return (
    <>
      {status && <div className={`status-msg ${status.type}`}>{status.msg}</div>}
      {fields.map((f, i) => (
        <div key={i} className="dim-card">
          <span className="dim-handle" title="拖拽排序">☰</span>
          <div className="dim-fields">
            <input className="dim-key" value={f.key} placeholder="key" title="唯一标识（英文）"
              onChange={e => updateField(i, 'key', e.target.value)} />
            <input className="dim-name" value={f.label} placeholder="名称" title="显示名称"
              onChange={e => updateField(i, 'label', e.target.value)} />
            <select className="dim-type" value={f.type || 'text'} title="字段类型"
              onChange={e => updateField(i, 'type', e.target.value)}>
              <option value="text">文本</option>
              <option value="number">数字</option>
            </select>
            <input className="dim-unit" value={f.unit || ''} placeholder="单位" title="显示单位（如：元、g）"
              onChange={e => updateField(i, 'unit', e.target.value)} />
            <select className="dim-align" value={f.align || ''} title="对齐方式"
              onChange={e => updateField(i, 'align', e.target.value)}>
              <option value="">居中</option>
              <option value="left">左对齐</option>
            </select>
          </div>
          <div className="dim-actions">
            <button className="dim-del" title="删除" onClick={() => removeField(i)}>✕</button>
          </div>
        </div>
      ))}
      <div className="btn-group" style={{ marginTop: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={addField}>+ 添加字段</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave}>保存</button>
        <button className="btn btn-secondary btn-sm" onClick={() => { loadFields(); setStatus(null); }}>重置</button>
      </div>
    </>
  );
}
