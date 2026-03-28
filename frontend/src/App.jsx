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

  // View mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState('grid');

  // Filter: 'all' | 'active' | 'inactive'
  const [filter, setFilter] = useState('all');


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

  // Filter + group services for the dashboard view
  const filteredServices = services?.filter((s) => {
    if (filter === 'active') return s.state === 'running';
    if (filter === 'inactive') return s.state !== 'running';
    return true;
  }) ?? [];

  const groups = {};
  for (const service of filteredServices) {
    const key = service.group || '';
    if (!groups[key]) groups[key] = [];
    groups[key].push(service);
  }
  // Within each group: running first, then stopped (alphabetical within each tier)
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      const aRun = a.state === 'running' ? 0 : 1;
      const bRun = b.state === 'running' ? 0 : 1;
      return aRun - bRun || a.name.localeCompare(b.name);
    });
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
        viewMode={viewMode}
        onSetViewMode={setViewMode}
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

          {services && (
            <div className="filter-bar">
              {['all', 'active', 'inactive'].map((f) => (
                <button
                  key={f}
                  className={`filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' && 'All'}
                  {f === 'active' && <><span className="filter-dot" />Active</>}
                  {f === 'inactive' && 'Inactive'}
                  <span className="filter-count">
                    {f === 'all' && services.length}
                    {f === 'active' && services.filter(s => s.state === 'running').length}
                    {f === 'inactive' && services.filter(s => s.state !== 'running').length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredServices.length === 0 && services && !error && (
            <div className="empty">No {filter !== 'all' ? filter : ''} services found.</div>
          )}

          {sortedGroupKeys.map((groupKey) => (
            <section key={groupKey || '__default'} className="group-section">
              <h2 className="group-title">
                <span>{groupKey || 'Services'}</span>
              </h2>
              <div className={viewMode === 'list' ? 'cards-list' : 'cards-grid'}>
                {groups[groupKey].map((service) => (
                  <ServiceCard key={service.id} service={service} onOpen={openTab} viewMode={viewMode} inactive={service.state !== 'running'} />
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
