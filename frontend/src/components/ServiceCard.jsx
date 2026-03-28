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

function CardActions({ url, onNewTab }) {
  return (
    <div className="card-actions">
      <span className="card-action-btn" title="Open in dashboard tab">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v4M15 3v4M3 9h18" />
        </svg>
      </span>
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

export default function ServiceCard({ service, onOpen, viewMode, inactive }) {
  const { name, image, status, state, url, ports, icon, description } = service;

  const isRunning = state === 'running';
  const statusClass = isRunning ? 'status-running' : 'status-other';
  const statusLabel = isRunning ? 'Running' : status;

  const handleCardClick = () => { if (url) onOpen(service); };
  const handleNewTab = (e) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`list-row ${!url ? 'no-url' : ''} ${inactive ? 'inactive' : ''}`}
        onClick={handleCardClick}
        role={url ? 'button' : undefined}
      >
        <div className="list-icon">
          {icon
            ? <img src={icon} alt={name} className="card-icon" style={{ width: 24, height: 24 }} onError={(e) => { e.target.style.display = 'none'; }} />
            : <IconPlaceholder name={name} small />}
        </div>
        <span className="list-name">{name}</span>
        <span className="list-image">{image}</span>
        <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
        <div className="list-ports">
          {ports.map((p) => <span key={p} className="port-tag">{p}</span>)}
        </div>
        <span className="list-url">{url || '—'}</span>
        {url && <CardActions url={url} onNewTab={handleNewTab} />}
      </div>
    );
  }

  // Grid card (default)
  return (
    <div
      className={`card ${!url ? 'no-url' : ''} ${inactive ? 'inactive' : ''}`}
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
            <p className="card-image">{image}</p>
          </div>
        </div>
        <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
      </div>

      {description && <p className="card-description">{description}</p>}

      {ports.length > 0 && (
        <div className="card-ports">
          {ports.map((p) => <span key={p} className="port-tag">{p}</span>)}
        </div>
      )}

      {url && (
        <div className="card-footer">
          <span className="card-url">{url}</span>
          <CardActions url={url} onNewTab={handleNewTab} />
        </div>
      )}
    </div>
  );
}
