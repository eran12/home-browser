function HomeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TabIconPlaceholder({ name }) {
  const letter = (name || '?')[0].toUpperCase();
  const colors = [
    '#7c3aed', '#2563eb', '#0891b2', '#059669',
    '#ca8a04', '#dc2626', '#db2777', '#9333ea',
  ];
  const color = colors[letter.charCodeAt(0) % colors.length];
  return (
    <span className="tab-icon-placeholder" style={{ background: color }}>
      {letter}
    </span>
  );
}

export default function TabBar({ tabs, activeTabId, onSelect, onClose }) {
  return (
    <div className="tab-bar">
      {/* Home tab */}
      <button
        className={`tab tab-home ${activeTabId === 'home' ? 'active' : ''}`}
        onClick={() => onSelect('home')}
      >
        <HomeIcon />
        <span>Dashboard</span>
      </button>

      <div className="tab-divider" />

      {/* Service tabs */}
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
          onClick={() => onSelect(tab.id)}
        >
          {tab.icon ? (
            <img src={tab.icon} alt="" className="tab-icon-img" />
          ) : (
            <TabIconPlaceholder name={tab.name} />
          )}
          <span className="tab-name">{tab.name}</span>
          <span
            className="tab-close"
            role="button"
            aria-label={`Close ${tab.name}`}
            onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
}
