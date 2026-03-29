import { useState, useRef } from 'react';

export default function IframeView({ tab }) {
  const [addressUrl, setAddressUrl] = useState(tab.url);
  const [iframeSrc, setIframeSrc]   = useState(tab.url);
  const [status, setStatus]         = useState('loading'); // 'loading' | 'loaded' | 'blocked'
  const iframeRef = useRef(null);

  const navigate = () => {
    const raw = addressUrl.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
    setAddressUrl(url);
    setIframeSrc(url);
    setStatus('loading');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') navigate();
    if (e.key === 'Escape') setAddressUrl(iframeSrc);
  };

  const handleLoad = () => {
    try {
      // Accessing contentDocument throws SecurityError when X-Frame-Options
      // or CSP blocks the frame — we use this to detect silent blocks.
      const doc = iframeRef.current?.contentDocument;
      if (!doc || doc.location.href === 'about:blank') {
        // Frame loaded but is blank — likely blocked without a network error
        // (some services do this silently). Only flag if the src isn't blank.
        if (iframeSrc !== 'about:blank') setStatus('blocked');
        else setStatus('loaded');
      } else {
        setStatus('loaded');
      }
    } catch {
      // SecurityError = frame was blocked
      setStatus('blocked');
    }
  };

  const handleError = () => setStatus('blocked');

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

      <div className="iframe-content">
        {status === 'loading' && (
          <div className="iframe-overlay">
            <div className="spinner" />
            <span>Loading {tab.name}…</span>
          </div>
        )}

        {status === 'blocked' && (
          <div className="iframe-overlay iframe-error">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <p className="iframe-error-title">Can't embed this service</p>
            <p className="iframe-error-desc">
              This service blocks iframe embedding via <code>X-Frame-Options</code> or <code>Content-Security-Policy</code>,
              or the URL isn't reachable from your browser (mixed HTTP/HTTPS, wrong IP).
            </p>
            <a
              href={iframeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="iframe-open-external-large"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open {tab.name} in new tab
            </a>
          </div>
        )}

        <iframe
          ref={iframeRef}
          key={iframeSrc}
          src={iframeSrc}
          title={tab.name}
          className="service-iframe"
          allow="fullscreen"
          onLoad={handleLoad}
          onError={handleError}
          style={{ visibility: status === 'loaded' ? 'visible' : 'hidden' }}
        />
      </div>
    </div>
  );
}
