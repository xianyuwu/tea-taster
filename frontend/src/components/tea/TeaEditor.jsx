import { useState, useEffect } from 'react';

export default function TeaEditor({ tea, teaFields, onSave, onClose }) {
  const isEdit = !!tea;
  const [name, setName] = useState('');
  const [fields, setFields] = useState({});
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (tea) {
      setName(tea.name || '');
      const vals = {};
      teaFields.forEach(f => { vals[f.key] = tea[f.key] ?? ''; });
      setFields(vals);
    } else {
      setName('');
      const vals = {};
      teaFields.forEach(f => { vals[f.key] = ''; });
      setFields(vals);
    }
    requestAnimationFrame(() => setShow(true));
  }, [tea, teaFields]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSave = () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), ...fields };
    onSave(data);
  };

  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={onClose}>
      <div className={`tea-edit-dialog ${show ? 'show' : ''}`} onClick={e => e.stopPropagation()}>
        <h3>✎ {isEdit ? '编辑茶样信息' : '添加茶样'}</h3>

        <div className="tea-edit-row">
          <label>茶名</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="输入茶样名称"
            autoFocus
          />
        </div>

        {teaFields.map(field => (
          <div key={field.key} className="tea-edit-row">
            <label>
              {field.label}{field.unit ? ` (${field.unit})` : ''}
            </label>
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              value={fields[field.key] ?? ''}
              onChange={e => setFields(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={`输入${field.label}`}
            />
          </div>
        ))}

        <div className="tea-edit-btns">
          <button className="btn btn-cancel" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
