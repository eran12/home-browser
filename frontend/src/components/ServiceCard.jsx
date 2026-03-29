function IconPlaceholder({ name, small }) {
  const letter = (name || '?')[0].toUpperCase();
  const colors = [
    '#7c3aed', '#2563eb', '#0891b2', '#059669',
    '#ca8a04', '#dc2626', '#db2777', '#9333ea',
  ];
  const color = colors[letter.charCodeAt(0) % colors.length];
  const size = small ? 24 : 34;
  return (
    <div
      className="card-icon-placeholder"
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        width: size,
        height: size,
        fontSize: small ? '0.7rem' : '0.95rem',
      }}
    >
      {letter}
    </div>
  );
}

function CardActions({ onNewTab, onEdit, onDelete }) {
  return (
    <div className="card-actions">
      {onEdit && (
        <span className="card-action-btn" title="Edit link" onClick={onEdit}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </span>
      )}
      {onDelete && (
        <span className="card-action-btn card-action-delete" title="Delete link" onClick={onDelete}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </span>
      )}
      {!onEdit && (
        <span className="card-action-btn" title="Open in dashboard tab">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v4M15 3v4M3 9h18" />
          </svg>
        </span>
      )}
      <span className="card-action-btn" title="Open in new browser tab" onClick={onNewTab}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </span>
    </div>
  );
}

function NoUrlTag() {
  return (
    <span className="no-url-tag" title="Add a homepage.url label to make this service accessible">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      No URL
    </span>
  );
}

export default function ServiceCard({ service, onOpen, viewMode, isCustom, onEdit, onDelete }) {
  const { name, image, status, state, url, ports, icon, description } = service;

  const isRunning = state === 'running';
  const statusClass = isRunning ? 'status-running' : 'status-other';
  const statusLabel = isRunning ? 'Running' : status;
  const noUrl = !url;

  const handleCardClick = () => { if (url) onOpen(service); };
  const handleNewTab = (e) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const handleEdit = onEdit ? (e) => { e.stopPropagation(); onEdit(); } : undefined;
  const handleDelete = onDelete ? (e) => { e.stopPropagation(); onDelete(); } : undefined;

  if (viewMode === 'list') {
    return (
      <div
        className={`list-row ${noUrl ? 'no-url' : ''}`}
        onClick={handleCardClick}
        role={url ? 'button' : undefined}
      >
        <div className="list-icon">
          {icon
            ? <img src={icon} alt={name} className="card-icon" style={{ width: 24, height: 24 }} onError={(e) => { e.target.style.display = 'none'; }} />
            : <IconPlaceholder name={name} small />}
        </div>
        <span className="list-name">{name}</span>
        {image && <span className="list-image">{image}</span>}
        {!isCustom && <span className={`status-badge ${statusClass}`}>{statusLabel}</span>}
        {isCustom && <span className="custom-badge">Custom</span>}
        <div className="list-ports">
          {ports.map((p) => <span key={p} className="port-tag">{p}</span>)}
        </div>
        {noUrl
          ? <NoUrlTag />
          : <span className="list-url">{url}</span>}
        {url && (
          <CardActions
            onNewTab={handleNewTab}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    );
  }

  // Grid card
  return (
    <div
      className={`card ${noUrl ? 'no-url' : ''}`}
      onClick={handleCardClick}
      role={url ? 'button' : undefined}
    >
      <div className="card-header">
        <div className="card-icon-wrapper">
          {icon
            ? <img src={icon} alt={name} className="card-icon" onError={(e) => { e.target.style.display = 'none'; }} />
            : <IconPlaceholder name={name} />}
          <div>
            <h3 className="card-name">{name}</h3>
            {image && <p className="card-image">{image}</p>}
          </div>
        </div>
        {!isCustom && <span className={`status-badge ${statusClass}`}>{statusLabel}</span>}
        {isCustom && <span className="custom-badge">Custom</span>}
      </div>

      {description && <p className="card-description">{description}</p>}

      {ports.length > 0 && (
        <div className="card-ports">
          {ports.map((p) => <span key={p} className="port-tag">{p}</span>)}
        </div>
      )}

      <div className="card-footer">
        {noUrl
          ? <NoUrlTag />
          : <span className="card-url">{url}</span>}
        {url && (
          <CardActions
            onNewTab={handleNewTab}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
