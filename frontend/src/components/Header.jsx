function RefreshIcon({ spinning }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }}
    >
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function EmbedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v4M15 3v4M3 9h18" />
    </svg>
  );
}

function NewTabIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="rgba(124,58,237,0.25)" />
      <rect x="5" y="5" width="9" height="9" rx="2" fill="#7c3aed" />
      <rect x="18" y="5" width="9" height="9" rx="2" fill="#a78bfa" opacity="0.8" />
      <rect x="5" y="18" width="9" height="9" rx="2" fill="#a78bfa" opacity="0.8" />
      <rect x="18" y="18" width="9" height="9" rx="2" fill="#7c3aed" />
    </svg>
  );
}

export default function Header({ totalServices, totalRunning, lastUpdated, onRefresh, loading, openMode, onToggleOpenMode }) {
  const formatTime = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const isEmbed = openMode === 'embed';

  return (
    <header className="header">
      <div className="header-left">
        <LogoIcon />
        <span className="header-title">Home Dashboard</span>
      </div>

      <div className="header-stats">
        <div className="stat-badge">
          <span className="stat-dot" />
          <span>{totalRunning} running</span>
        </div>
        <div className="stat-sep" />
        <div className="stat-badge">
          <span>{totalServices} services</span>
        </div>
      </div>

      <div className="header-right">
        <span className="last-updated">Updated {formatTime(lastUpdated)}</span>

        <button
          className={`open-mode-btn ${isEmbed ? 'active' : ''}`}
          onClick={onToggleOpenMode}
          title={isEmbed ? 'Switch to: open in new browser tab' : 'Switch to: open in dashboard tabs'}
        >
          {isEmbed ? <EmbedIcon /> : <NewTabIcon />}
          {isEmbed ? 'In-app' : 'New tab'}
        </button>

        <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
          <RefreshIcon spinning={loading} />
          Refresh
        </button>
      </div>
    </header>
  );
}
