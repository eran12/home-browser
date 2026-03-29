import { useState, useEffect } from 'react';

export default function LinkModal({ link, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', url: '', icon: '', description: '' });

  useEffect(() => {
    if (link) {
      setForm({
        name: link.name || '',
        url: link.url || '',
        icon: link.icon || '',
        description: link.description || '',
      });
    }
  }, [link]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) return;
    onSave({
      ...(link?.id && { id: link.id }),
      name: form.name.trim(),
      url: form.url.trim(),
      icon: form.icon.trim() || null,
      description: form.description.trim() || null,
    });
  };

  const isEdit = !!link?.id;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit link' : 'Add custom link'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">
            <span className="modal-label-text">Name <span className="modal-required">*</span></span>
            <input
              className="modal-input"
              value={form.name}
              onChange={set('name')}
              placeholder="My Service"
              required
              autoFocus
            />
          </label>

          <label className="modal-label">
            <span className="modal-label-text">URL <span className="modal-required">*</span></span>
            <input
              className="modal-input"
              value={form.url}
              onChange={set('url')}
              placeholder="http://192.168.1.10:8080"
              required
            />
          </label>

          <label className="modal-label">
            <span className="modal-label-text">Icon URL <span className="modal-optional">(optional)</span></span>
            <input
              className="modal-input"
              value={form.icon}
              onChange={set('icon')}
              placeholder="https://example.com/favicon.ico"
            />
          </label>

          <label className="modal-label">
            <span className="modal-label-text">Description <span className="modal-optional">(optional)</span></span>
            <input
              className="modal-input"
              value={form.description}
              onChange={set('description')}
              placeholder="Short description"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn-save">{isEdit ? 'Save changes' : 'Add link'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
