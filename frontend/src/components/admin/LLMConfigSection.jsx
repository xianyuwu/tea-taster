import { useState, useEffect } from 'react';

export default function LLMConfigSection({ config, onSave, onTest }) {
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
