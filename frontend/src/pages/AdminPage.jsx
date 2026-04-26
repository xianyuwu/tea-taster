import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore } from '../stores/useConfigStore';
import { useAuthStore } from '../stores/useAuthStore';
import * as configApi from '../api/config';
import * as backupApi from '../api/backup';
import * as authApi from '../api/auth';

const DEFAULT_PROMPT = `你是一位资深的武夷岩茶品鉴专家，拥有 20 年以上的品茶经验。请从以下四个维度对用户提供的品茶记录进行专业分析：

## 一、品质评估
根据用户提供的评分和描述，对茶样的整体品质做出客观评价。重点关注香气、滋味、回甘、岩韵等核心指标，指出优点和不足。

## 二、工艺分析
基于茶样的特征（品种、等级、焙火程度等），推测其可能采用的制作工艺，分析工艺对品质的影响，并给出工艺改进建议。

## 三、性价比评估
结合茶样的价格和品质表现，评估其性价比。与同价位、同类型的武夷岩茶进行横向对比，判断是否物有所值。

## 四、品鉴建议
针对该茶样的特点，给出冲泡建议（水温、投茶量、冲泡时间等），以及存储建议。同时提供适合的品鉴场景和搭配推荐。`;

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <div className="section-title" onClick={() => setOpen(!open)}>
        {title}
        <span className={`collapse-icon ${open ? 'open' : ''}`}>▶</span>
      </div>
      <div className={`section-body ${open ? '' : 'collapsed'}`}>
        {children}
      </div>
    </div>
  );
}

function LLMConfigSection({ config, onSave, onTest }) {
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [keyModified, setKeyModified] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (config) {
      setApiKey(config.openai_api_key_masked || '');
      setModelName(config.openai_model || '');
      setBaseUrl(config.openai_base_url || '');
      setKeyModified(false);
    }
  }, [config]);

  const handleSave = async () => {
    setStatus(null);
    const data = { openai_model: modelName, openai_base_url: baseUrl };
    if (keyModified) data.openai_api_key = apiKey;
    try {
      await onSave(data);
      setKeyModified(false);
      setStatus({ type: 'ok', msg: '配置已保存' });
    } catch (e) {
      setStatus({ type: 'err', msg: e.message });
    }
  };

  const handleTest = async () => {
    setStatus(null);
    const data = { openai_model: modelName, openai_base_url: baseUrl };
    if (keyModified) data.openai_api_key = apiKey;
    try {
      await onTest(data);
      setStatus({ type: 'ok', msg: '连接测试成功' });
    } catch (e) {
      setStatus({ type: 'err', msg: e.message });
    }
  };

  return (
    <>
      {status && <div className={`status-msg ${status.type}`}>{status.msg}</div>}

      {config?.key_hint && (
        <div className="form-hint" style={{ marginBottom: 8 }}>
          当前密钥：{config.key_hint}
          {config.key_source && `（来源：${config.key_source}）`}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">API Key</label>
        <div className="input-row">
          <input
            className="form-input"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setKeyModified(true); }}
            placeholder="请输入 API Key"
          />
          <button className="btn btn-secondary btn-sm" onClick={() => setShowKey(!showKey)}>
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">模型名称</label>
        <input className="form-input" value={modelName}
          onChange={e => setModelName(e.target.value)} placeholder="如：gpt-4o、deepseek-chat、qwen-plus" />
        <div className="form-hint">支持所有兼容 OpenAI 协议的模型</div>
      </div>

      <div className="form-group">
        <label className="form-label">API Base URL</label>
        <input className="form-input" value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
        <div className="form-hint">使用代理或兼容接口时修改此项</div>
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={handleSave}>保存配置</button>
        <button className="btn btn-secondary" onClick={handleTest}>测试连接</button>
      </div>
    </>
  );
}

function SystemPromptSection({ config }) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => { setPrompt(config?.system_prompt || DEFAULT_PROMPT); }, [config]);

  const handleSave = async () => {
    setStatus(null);
    try {
      await configApi.saveConfig({ system_prompt: prompt });
      setStatus({ type: 'ok', msg: '系统提示词已保存' });
    } catch (e) {
      setStatus({ type: 'err', msg: e.message });
    }
  };

  return (
    <>
      {status && <div className={`status-msg ${status.type}`}>{status.msg}</div>}
      <div className="form-hint" style={{ marginBottom: 8 }}>定义 AI 品鉴分析的角色和行为，影响所有 AI 分析和对话的输出风格</div>
      <div className="form-group">
        <textarea className="form-input" value={prompt}
          onChange={e => setPrompt(e.target.value)} rows={12}
          style={{ resize: 'vertical', minHeight: 160, lineHeight: 1.6 }} />
      </div>
      <div className="btn-group">
        <button className="btn btn-primary" onClick={handleSave}>保存提示词</button>
        <button className="btn btn-secondary" onClick={() => setPrompt(DEFAULT_PROMPT)}>恢复默认</button>
      </div>
    </>
  );
}

function DimensionsSection() {
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

function TeaFieldsSection({ onFieldsLoaded }) {
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

function DerivedMetricsSection({ teaFields }) {
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

function BackupSection() {
  const [backups, setBackups] = useState([]);
  const [status, setStatus] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadBackups = useCallback(async () => {
    try {
      const data = await backupApi.fetchBackups();
      setBackups(data.backups || data || []);
    } catch { setBackups([]); }
  }, []);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  const handleCreate = async () => {
    setStatus(null);
    try {
      await backupApi.createBackup();
      setStatus({ type: 'ok', msg: '备份已创建' });
      loadBackups();
    } catch (e) { setStatus({ type: 'err', msg: e.message }); }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`确定删除备份 ${filename}？`)) return;
    try { await backupApi.deleteBackup(filename); loadBackups(); }
    catch (e) { setStatus({ type: 'err', msg: e.message }); }
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) { setStatus({ type: 'err', msg: '请选择 .zip 文件' }); return; }
    if (!window.confirm('恢复备份将覆盖当前所有数据，确定继续？')) return;
    setStatus(null);
    try { await backupApi.restoreBackup(file); setStatus({ type: 'ok', msg: '备份已恢复' }); }
    catch (e) { setStatus({ type: 'err', msg: e.message }); }
    e.target.value = '';
  };

  const handleClearAll = async () => {
    setStatus(null);
    try { await backupApi.clearAllData(); setStatus({ type: 'ok', msg: '所有数据已清除' }); setShowClearConfirm(false); }
    catch (e) { setStatus({ type: 'err', msg: e.message }); }
  };

  const formatSize = (bytes) => bytes ? (bytes / 1024).toFixed(1) + ' KB' : '-';

  return (
    <>
      {status && <div className={`status-msg ${status.type}`}>{status.msg}</div>}

      <div className="btn-group" style={{ marginBottom: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={handleCreate}>导出备份</button>
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
          导入恢复
          <input type="file" accept=".zip" onChange={handleRestore} style={{ display: 'none' }} />
        </label>
      </div>

      {backups.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          {backups.map((b, i) => (
            <div key={i} className="backup-item">
              <div className="backup-info">
                📦 {b.filename}
                <span className="backup-time">{b.created_at ? new Date(b.created_at).toLocaleString('zh-CN') : ''}</span>
                <span className="backup-size">{formatSize(b.size)}</span>
              </div>
              <div className="btn-group">
                {b.download_url && (
                  <a href={b.download_url} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }} download>下载</a>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.filename)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#a08a78', fontSize: '0.85rem', padding: '8px 0', marginBottom: 12 }}>暂无备份记录</div>
      )}

      <div className="divider" />

      {!showClearConfirm ? (
        <button className="btn btn-danger btn-sm" onClick={() => setShowClearConfirm(true)}>清空所有数据</button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#d4380d', fontSize: '0.85rem', fontWeight: 600 }}>
            确定要清除所有数据？此操作不可恢复！
          </span>
          <button className="btn btn-danger btn-sm" onClick={handleClearAll}>确认清除</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowClearConfirm(false)}>取消</button>
        </div>
      )}
    </>
  );
}

function ChangePasswordSection() {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [status, setStatus] = useState(null);

  const handleSubmit = async () => {
    setStatus(null);
    if (!oldPwd || !newPwd) { setStatus({ type: 'err', msg: '请填写完整' }); return; }
    if (newPwd.length < 6) { setStatus({ type: 'err', msg: '新密码至少 6 位' }); return; }
    if (newPwd !== confirmPwd) { setStatus({ type: 'err', msg: '两次密码不一致' }); return; }
    try {
      await authApi.changePassword(oldPwd, newPwd);
      setStatus({ type: 'ok', msg: '密码已修改' });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) { setStatus({ type: 'err', msg: e.message }); }
  };

  return (
    <>
      {status && <div className={`status-msg ${status.type}`}>{status.msg}</div>}
      <div className="form-group">
        <label className="form-label">当前密码</label>
        <input className="form-input" type="password" value={oldPwd}
          onChange={e => setOldPwd(e.target.value)} placeholder="输入当前密码" />
      </div>
      <div className="form-group">
        <label className="form-label">新密码</label>
        <input className="form-input" type="password" value={newPwd}
          onChange={e => setNewPwd(e.target.value)} placeholder="至少 6 位" />
      </div>
      <div className="form-group">
        <label className="form-label">确认新密码</label>
        <input className="form-input" type="password" value={confirmPwd}
          onChange={e => setConfirmPwd(e.target.value)} placeholder="再次输入新密码" />
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleSubmit}>修改密码</button>
    </>
  );
}

function UserManagementSection() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const currentUser = useAuthStore(s => s.user);

  const loadUsers = useCallback(async () => {
    try { const data = await authApi.fetchUsers(); setUsers(data); } catch { setUsers([]); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async () => {
    setStatus(null);
    if (!newUsername || !newPassword) { setStatus({ type: 'err', msg: '请填写用户名和密码' }); return; }
    if (newPassword.length < 6) { setStatus({ type: 'err', msg: '密码至少 6 位' }); return; }
    try {
      await authApi.register(newUsername, newPassword);
      setStatus({ type: 'ok', msg: '用户已创建' });
      setNewUsername(''); setNewPassword('');
      loadUsers();
    } catch (e) { setStatus({ type: 'err', msg: e.message }); }
  };

  const handleRoleChange = async (userId, newRole) => {
    setStatus(null);
    try {
      await authApi.changeUserRole(userId, newRole);
      setStatus({ type: 'ok', msg: '角色已更新' });
      loadUsers();
    } catch (e) { setStatus({ type: 'err', msg: e.message }); }
  };

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`确定删除用户「${username}」？`)) return;
    setStatus(null);
    try {
      await authApi.deleteUser(userId);
      setStatus({ type: 'ok', msg: '用户已删除' });
      loadUsers();
    } catch (e) { setStatus({ type: 'err', msg: e.message }); }
  };

  const roleLabel = { admin: '管理员', user: '普通用户' };

  return (
    <>
      {status && <div className={`status-msg ${status.type}`}>{status.msg}</div>}

      <div className="form-group">
        <label className="form-label">创建新用户</label>
        <div className="input-row">
          <input className="form-input" value={newUsername}
            onChange={e => setNewUsername(e.target.value)} placeholder="用户名（字母数字下划线）" />
          <input className="form-input" type="password" value={newPassword}
            onChange={e => setNewPassword(e.target.value)} placeholder="密码（至少 6 位）" />
          <button className="btn btn-primary btn-sm" onClick={handleCreate}>创建</button>
        </div>
      </div>

      {users.length > 0 && (
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e8ddd0' }}>
              <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: '0.85rem', color: '#8a7060' }}>用户名</th>
              <th style={{ padding: '8px 6px', fontSize: '0.85rem', color: '#8a7060' }}>角色</th>
              <th style={{ padding: '8px 6px', fontSize: '0.85rem', color: '#8a7060' }}>创建时间</th>
              <th style={{ padding: '8px 6px', fontSize: '0.85rem', color: '#8a7060' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f0e8de' }}>
                <td style={{ padding: '8px 6px', fontWeight: 500 }}>
                  {u.username}{u.id === currentUser?.id && <span style={{ color: '#a08a78', fontSize: '0.78rem', marginLeft: 4 }}>(当前)</span>}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                  {u.id === currentUser?.id ? (
                    <span style={{ fontSize: '0.85rem', color: '#8a7060' }}>{roleLabel[u.role]}</span>
                  ) : (
                    <select className="form-input" value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}>
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </select>
                  )}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: '0.85rem', color: '#a08a78' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleString('zh-CN') : '-'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                  {u.id !== currentUser?.id && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.username)}>删除</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function AdminPage() {
  const { config, loadConfig, saveConfig, testConfig } = useConfigStore();
  const navigate = useNavigate();
  const [teaFields, setTeaFields] = useState([]);

  const handleFieldsLoaded = useCallback((fields) => { setTeaFields(fields); }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  return (
    <>
      <div style={{ position: 'relative', marginBottom: 4 }}>
        <h1>🍵 后台管理</h1>
      </div>
      <div className="subtitle">
        <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} style={{ color: '#8b5e3c', fontWeight: 600 }}>
          ← 返回品鉴页面
        </a>
      </div>

      <CollapsibleSection title="🤖 大模型配置">
        <LLMConfigSection config={config} onSave={saveConfig} onTest={testConfig} />
      </CollapsibleSection>
      <CollapsibleSection title="📝 系统提示词">
        <SystemPromptSection config={config} />
      </CollapsibleSection>
      <CollapsibleSection title="📊 评分维度配置">
        <DimensionsSection />
      </CollapsibleSection>
      <CollapsibleSection title="🏷 茶样字段配置">
        <TeaFieldsSection onFieldsLoaded={handleFieldsLoaded} />
      </CollapsibleSection>
      <CollapsibleSection title="📐 派生指标配置">
        <DerivedMetricsSection teaFields={teaFields} />
      </CollapsibleSection>
      <CollapsibleSection title="🔑 修改密码">
        <ChangePasswordSection />
      </CollapsibleSection>
      <CollapsibleSection title="👤 用户管理">
        <UserManagementSection />
      </CollapsibleSection>
      <CollapsibleSection title="💾 数据管理">
        <BackupSection />
      </CollapsibleSection>
    </>
  );
}
