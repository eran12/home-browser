function ArrowIcon() {
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
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function IconPlaceholder({ name }) {
  const letter = (name || '?')[0].toUpperCase();
  // Pick a color from a set based on the letter
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

export default function ServiceCard({ service }) {
  const { name, image, status, state, url, ports, icon, description } = service;

  const isRunning = state === 'running';
  const statusClass = isRunning ? 'status-running' : 'status-other';
  const statusLabel = isRunning ? 'Running' : status;

  const Wrapper = url ? 'a' : 'div';
  const wrapperProps = url
    ? { href: url, target: '_blank', rel: 'noopener noreferrer', className: 'card' }
    : { className: 'card no-url' };

  return (
    <Wrapper {...wrapperProps}>
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
          <ArrowIcon />
        </div>
      )}
    </Wrapper>
  );
}
