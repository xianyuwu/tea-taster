import { useState } from 'react';

export default function CollapsibleSection({ title, children, defaultOpen = false }) {
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
