import { useState, useEffect, useCallback } from 'react';
import * as backupApi from '../../api/backup';

export default function BackupSection() {
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
                <button className="btn btn-secondary btn-sm" onClick={() => backupApi.downloadBackup(b.filename)}>下载</button>
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
