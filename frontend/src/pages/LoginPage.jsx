import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import * as authApi from '../api/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const login = useAuthStore(s => s.login);
  const registerFirst = useAuthStore(s => s.registerFirst);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) { navigate('/', { replace: true }); return; }
    authApi.hasUsers().then(has => setShowCreateLink(!has)).catch(() => setShowCreateLink(true));
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await registerFirst(username, password);
      } else {
        await login(username, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 16 }}>
      <h1 style={{ textAlign: 'center', fontSize: '1.5rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
        🍵 岩茶品鉴评分系统
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: 24, fontSize: '0.85rem' }}>
        {isRegister ? '创建管理员账户' : '登录账户'}
      </p>

      <form onSubmit={handleSubmit} className="section">
        <div className="form-group">
          <label className="form-label">用户名</label>
          <input className="form-input" value={username} onChange={e => setUsername(e.target.value)}
            placeholder="请输入用户名" autoComplete="username" />
        </div>
        <div className="form-group">
          <label className="form-label">密码</label>
          <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="请输入密码" autoComplete={isRegister ? 'new-password' : 'current-password'} />
        </div>

        {error && <div className="status-msg err">{error}</div>}

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !username || !password}>
          {loading ? '处理中...' : isRegister ? '创建账户' : '登录'}
        </button>

        {(showCreateLink || isRegister) && (
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {isRegister ? '已有账户？' : '首次使用？'}
            <a href="#" onClick={(e) => { e.preventDefault(); setError(''); setIsRegister(!isRegister); }}
              style={{ color: 'var(--color-primary)', fontWeight: 600, marginLeft: 4 }}>
              {isRegister ? '去登录' : '创建管理员'}
            </a>
          </p>
        )}
      </form>
    </div>
  );
}
