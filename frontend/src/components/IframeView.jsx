export default function IframeView({ tab }) {
  return (
    <div className="iframe-wrapper">
      <div className="iframe-toolbar">
        <span className="iframe-service-name">{tab.name}</span>
        <span className="iframe-url-display">{tab.url}</span>
        <a
          href={tab.url}
          target="_blank"
          rel="noopener noreferrer"
          className="iframe-external-btn"
          title="Open in new tab"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open in new tab
        </a>
      </div>
      <iframe
        key={tab.id}
        src={tab.url}
        title={tab.name}
        className="service-iframe"
        allow="fullscreen"
      />
    </div>
  );
}
