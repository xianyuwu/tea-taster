import { useState } from 'react';
import * as authApi from '../../api/auth';

export default function ChangePasswordSection() {
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
