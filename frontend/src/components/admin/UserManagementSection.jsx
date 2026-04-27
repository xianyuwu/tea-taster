import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import * as authApi from '../../api/auth';

export default function UserManagementSection() {
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
