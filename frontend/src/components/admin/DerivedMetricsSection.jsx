import { useState, useEffect, useCallback } from 'react';
import * as configApi from '../../api/config';

export default function DerivedMetricsSection({ teaFields }) {
  const [metrics, setMetrics] = useState([]);
  const [status, setStatus] = useState(null);

  const loadMetrics = useCallback(async () => {
    try {
      const data = await configApi.fetchDerivedMetrics();
      setMetrics(data.derivedMetrics || data || []);
    } catch { setMetrics([]); }
  }, []);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const updateMetric = (index, field, value) => {
    setMetrics(metrics.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const addMetric = () => setMetrics([...metrics, { key: '', label: '', numerator: '', denominator: '', unit: '', minRequired: 2, colorMap: false }]);
  const removeMetric = (index) => setMetrics(metrics.filter((_, i) => i !== index));

  const handleSave = async () => {
    setStatus(null);
    for (const m of metrics) {
      if (!m.key?.trim()) { setStatus({ type: 'err', msg: '指标 key 不能为空' }); return; }
      if (!m.label?.trim()) { setStatus({ type: 'err', msg: '指标标签不能为空' }); return; }
    }
    try {
      await configApi.saveDerivedMetrics(metrics);
      setStatus({ type: 'ok', msg: '派生指标已保存' });
    } catch (e) { setStatus({ type: 'err', msg: e.message }); }
  };

  const fieldOptions = teaFields || [];

  return (
    <>
      {status && <div className={`status-msg ${status.type}`}>{status.msg}</div>}
      {metrics.map((m, i) => (
        <div key={i} className="dim-card">
          <span className="dim-handle" title="拖拽排序">☰</span>
          <div className="dim-fields">
            <input className="dim-key" value={m.key} placeholder="key" title="唯一标识"
              onChange={e => updateMetric(i, 'key', e.target.value)} />
            <input className="dim-name" value={m.label} placeholder="名称" title="显示名称"
              onChange={e => updateMetric(i, 'label', e.target.value)} />
            <select className="dim-num" value={m.numerator || ''} title="分子字段"
              onChange={e => updateMetric(i, 'numerator', e.target.value)}>
              <option value="">请选择字段</option>
              {fieldOptions.map(f => <option key={f.key} value={f.key}>{f.label}({f.key})</option>)}
            </select>
            <span style={{ color: '#a08a78', fontSize: '1.1rem', flexShrink: 0 }}>/</span>
            <select className="dim-den" value={m.denominator || ''} title="分母字段"
              onChange={e => updateMetric(i, 'denominator', e.target.value)}>
              <option value="">请选择字段</option>
              {fieldOptions.map(f => <option key={f.key} value={f.key}>{f.label}({f.key})</option>)}
            </select>
            <input className="dim-unit" value={m.unit || ''} placeholder="单位" title="结果单位"
              onChange={e => updateMetric(i, 'unit', e.target.value)} />
            <input className="form-input" type="number" value={m.minRequired || 2} placeholder="最少" title="最少有效茶样数" min={1}
              onChange={e => updateMetric(i, 'minRequired', Number(e.target.value))}
              style={{ width: 50, padding: '7px 10px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.78rem', color: '#8a7060', flexShrink: 0, cursor: 'pointer' }} title="热力图着色">
              <input type="checkbox" checked={!!m.colorMap}
                onChange={e => updateMetric(i, 'colorMap', e.target.checked)} /> 着色
            </label>
          </div>
          <div className="dim-actions">
            <button className="dim-del" title="删除" onClick={() => removeMetric(i)}>✕</button>
          </div>
        </div>
      ))}
      <div className="btn-group" style={{ marginTop: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={addMetric}>+ 添加指标</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave}>保存</button>
        <button className="btn btn-secondary btn-sm" onClick={() => { loadMetrics(); setStatus(null); }}>重置</button>
      </div>
    </>
  );
}
