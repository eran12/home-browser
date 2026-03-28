import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import ServiceCard from './components/ServiceCard.jsx';
import IframeView from './components/IframeView.jsx';

const REFRESH_MS = parseInt(import.meta.env.VITE_REFRESH_INTERVAL || '30', 10) * 1000;

export default function App() {
  const [services, setServices] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Tab state
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState('home');

  // Open mode: 'embed' = in-app iframe tabs, 'new-tab' = browser tab
  const [openMode, setOpenMode] = useState('embed');
  const toggleOpenMode = useCallback(() => {
    setOpenMode((prev) => (prev === 'embed' ? 'new-tab' : 'embed'));
  }, []);

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/containers');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setServices(data.services);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  const openTab = useCallback((service) => {
    if (!service.url) return;
    setTabs((prev) => {
      if (prev.find((t) => t.id === service.id)) return prev;
      return [...prev, { id: service.id, name: service.name, url: service.url, icon: service.icon }];
    });
    setActiveTabId(service.id);
  }, []);

  const closeTab = useCallback((id) => {
    setTabs((prev) => prev.filter((t) => t.id !== id));
    setActiveTabId((prev) => (prev === id ? 'home' : prev));
  }, []);

  // Group services for the dashboard view
  const groups = {};
  if (services) {
    for (const service of services) {
      const key = service.group || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(service);
    }
  }

  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  });

  const totalRunning = services?.filter((s) => s.state === 'running').length ?? 0;
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isHome = activeTabId === 'home';

  return (
    <div className="app">
      <Header
        totalServices={services?.length ?? 0}
        totalRunning={totalRunning}
        lastUpdated={lastUpdated}
        onRefresh={fetchContainers}
        loading={loading}
        openMode={openMode}
        onToggleOpenMode={toggleOpenMode}
      />

      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
        onClose={closeTab}
      />

      {isHome ? (
        <main className="main">
          {error && (
            <div className="error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Could not reach Docker: {error}
            </div>
          )}

          {loading && !services && (
            <div className="loading">
              <div className="spinner" />
              Scanning containers...
            </div>
          )}

          {services && services.length === 0 && !error && (
            <div className="empty">
              No accessible services found. Make sure containers have published ports or a{' '}
              <code>homepage.url</code> label.
            </div>
          )}

          {sortedGroupKeys.map((groupKey) => (
            <section key={groupKey || '__default'} className="group-section">
              <h2 className="group-title">
                <span>{groupKey || 'Services'}</span>
              </h2>
              <div className="cards-grid">
                {groups[groupKey].map((service) => (
                  <ServiceCard key={service.id} service={service} onOpen={openTab} openMode={openMode} />
                ))}
              </div>
            </section>
          ))}
        </main>
      ) : (
        activeTab && <IframeView key={activeTab.id} tab={activeTab} />
      )}
    </div>
  );
}
