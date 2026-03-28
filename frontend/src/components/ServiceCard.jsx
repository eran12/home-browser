function TabOpenIcon() {
  return (
    <svg
      className="card-arrow"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v4M15 3v4M3 9h18" />
    </svg>
  );
}

function NewTabIcon() {
  return (
    <svg
      className="card-arrow"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconPlaceholder({ name }) {
  const letter = (name || '?')[0].toUpperCase();
  const colors = [
    '#7c3aed', '#2563eb', '#0891b2', '#059669',
    '#ca8a04', '#dc2626', '#db2777', '#9333ea',
  ];
  const color = colors[letter.charCodeAt(0) % colors.length];
  return (
    <div className="card-icon-placeholder" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
      {letter}
    </div>
  );
}

export default function ServiceCard({ service, onOpen, openMode }) {
  const { name, image, status, state, url, ports, icon, description } = service;

  const isRunning = state === 'running';
  const statusClass = isRunning ? 'status-running' : 'status-other';
  const statusLabel = isRunning ? 'Running' : status;

  const handleClick = () => {
    if (!url) return;
    if (openMode === 'new-tab') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onOpen(service);
    }
  };

  return (
    <div
      className={`card ${!url ? 'no-url' : ''}`}
      onClick={handleClick}
      role={url ? 'button' : undefined}
    >
      <div className="card-header">
        <div className="card-icon-wrapper">
          {icon ? (
            <img src={icon} alt={name} className="card-icon" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <IconPlaceholder name={name} />
          )}
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
          {ports.map((p) => (
            <span key={p} className="port-tag">{p}</span>
          ))}
        </div>
      )}

      {url && (
        <div className="card-footer">
          <span className="card-url">{url}</span>
          {openMode === 'new-tab' ? <NewTabIcon /> : <TabOpenIcon />}
        </div>
      )}
    </div>
  );
}
