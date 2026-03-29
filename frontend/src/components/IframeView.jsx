import { useState, useRef } from 'react';

export default function IframeView({ tab }) {
  const [addressUrl, setAddressUrl] = useState(tab.url);
  const [iframeSrc, setIframeSrc]   = useState(tab.url);
  const [useProxy, setUseProxy]     = useState(false);
  const [status, setStatus]         = useState('loading'); // 'loading' | 'loaded' | 'blocked'
  const iframeRef = useRef(null);

  const effectiveSrc = useProxy
    ? `/api/proxy?url=${encodeURIComponent(iframeSrc)}`
    : iframeSrc;

  const navigate = (rawUrl) => {
    const raw = (rawUrl ?? addressUrl).trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
    setAddressUrl(url);
    setIframeSrc(url);
    setStatus('loading');
    // Reset proxy when navigating to a new URL
    setUseProxy(false);
  };

  const activateProxy = () => {
    setUseProxy(true);
    setStatus('loading');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') navigate();
    if (e.key === 'Escape') setAddressUrl(iframeSrc);
  };

  const handleLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc || doc.location.href === 'about:blank') {
        if (iframeSrc !== 'about:blank') setStatus('blocked');
        else setStatus('loaded');
      } else {
        setStatus('loaded');
      }
    } catch {
      // SecurityError — frame was blocked (X-Frame-Options / CSP)
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
        <button className="iframe-go-btn" onClick={() => navigate()} title="Navigate">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        {useProxy && (
          <span className="proxy-badge" title="Page is loaded through the home-browser proxy. JS-heavy apps may not work fully.">
            via proxy
          </span>
        )}
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
            <p className="iframe-error-title">Blocked by {tab.name}</p>
            <p className="iframe-error-desc">
              This service uses <code>X-Frame-Options</code> to prevent direct embedding.
              The proxy fetches the page server-side and strips that header — it works well
              for simple pages. JS-heavy apps (Home Assistant, Portainer) may load the shell
              but API calls won't function fully.
            </p>
            <div className="iframe-error-actions">
              <button className="iframe-proxy-btn" onClick={activateProxy}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                Try via proxy
              </button>
              <a
                href={iframeSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="iframe-open-external-large"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open in new tab
              </a>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          key={effectiveSrc}
          src={effectiveSrc}
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
