import { useState } from 'react';

export default function IframeView({ tab }) {
  const [addressUrl, setAddressUrl] = useState(tab.url);
  const [iframeSrc, setIframeSrc] = useState(tab.url);

  const navigate = () => {
    const url = addressUrl.trim();
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `http://${url}`;
    setAddressUrl(normalized);
    setIframeSrc(normalized);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') navigate();
    if (e.key === 'Escape') setAddressUrl(iframeSrc);
  };

  return (
    <div className="iframe-wrapper">
      <div className="iframe-toolbar">
        <span className="iframe-service-name">{tab.name}</span>
        <input
          className="iframe-address-bar"
          type="text"
          value={addressUrl}
          onChange={(e) => setAddressUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          spellCheck={false}
          aria-label="URL"
        />
        <button className="iframe-go-btn" onClick={navigate} title="Navigate">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <a
          href={iframeSrc}
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
          New tab
        </a>
      </div>
      <iframe
        key={iframeSrc}
        src={iframeSrc}
        title={tab.name}
        className="service-iframe"
        allow="fullscreen"
      />
    </div>
  );
}
