import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import ServiceCard from './components/ServiceCard.jsx';
import IframeView from './components/IframeView.jsx';
import LinkModal from './components/LinkModal.jsx';

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

  // Custom links
  const [customLinks, setCustomLinks] = useState([]);
  const [editingLink, setEditingLink] = useState(null); // null=closed, {}=new, {id,...}=edit


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

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/links');
      if (res.ok) setCustomLinks(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const handleSaveLink = useCallback(async (data) => {
    const isEdit = !!data.id;
    await fetch(isEdit ? `/api/links/${data.id}` : '/api/links', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    fetchLinks();
    setEditingLink(null);
  }, [fetchLinks]);

  const handleDeleteLink = useCallback(async (id) => {
    if (!window.confirm('Delete this custom link?')) return;
    await fetch(`/api/links/${id}`, { method: 'DELETE' });
    fetchLinks();
  }, [fetchLinks]);

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

  // Split into accessible (has URL) and no-url groups
  const allServices = services ?? [];
  const accessible = allServices.filter((s) => s.url).sort((a, b) => a.name.localeCompare(b.name));
  const noUrl     = allServices.filter((s) => !s.url).sort((a, b) => a.name.localeCompare(b.name));

  // Apply filter
  const showAccessible = filter === 'all' || filter === 'accessible';
  const showNoUrl      = filter === 'all' || filter === 'no-url';

  const totalRunning = services?.filter((s) => s.state === 'running').length ?? 0;
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isHome = activeTabId === 'home';

  return (
    <div className="app">
      {editingLink !== null && (
        <LinkModal
          link={editingLink.id ? editingLink : null}
          onSave={handleSaveLink}
          onClose={() => setEditingLink(null)}
        />
      )}

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
              {[
                { key: 'all',        label: 'All',        count: allServices.length },
                { key: 'accessible', label: 'Accessible', count: accessible.length, dot: true },
                { key: 'no-url',     label: 'No URL',     count: noUrl.length },
              ].map(({ key, label, count, dot }) => (
                <button
                  key={key}
                  className={`filter-btn ${filter === key ? 'active' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {dot && <span className="filter-dot" />}
                  {label}
                  <span className="filter-count">{count}</span>
                </button>
              ))}
            </div>
          )}

          {showAccessible && accessible.length > 0 && (
            <section className="group-section">
              <h2 className="group-title"><span>Accessible</span></h2>
              <div className={viewMode === 'list' ? 'cards-list' : 'cards-grid'}>
                {accessible.map((service) => (
                  <ServiceCard key={service.id} service={service} onOpen={openTab} viewMode={viewMode} />
                ))}
              </div>
            </section>
          )}

          {showNoUrl && noUrl.length > 0 && (
            <section className="group-section">
              <h2 className="group-title"><span>No URL — add a <code>homepage.url</code> label to access</span></h2>
              <div className={viewMode === 'list' ? 'cards-list' : 'cards-grid'}>
                {noUrl.map((service) => (
                  <ServiceCard key={service.id} service={service} onOpen={openTab} viewMode={viewMode} />
                ))}
              </div>
            </section>
          )}

          <section className="group-section">
            <h2 className="group-title">
              <span>Custom Links</span>
              <button className="add-link-btn" onClick={() => setEditingLink({})}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add
              </button>
            </h2>
            {customLinks.length === 0 ? (
              <button className="add-link-cta" onClick={() => setEditingLink({})}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add your first custom link
              </button>
            ) : (
              <div className={viewMode === 'list' ? 'cards-list' : 'cards-grid'}>
                {customLinks.map((link) => (
                  <ServiceCard
                    key={link.id}
                    service={{ ...link, state: 'running', status: 'custom', ports: [] }}
                    onOpen={openTab}
                    viewMode={viewMode}
                    isCustom
                    onEdit={() => setEditingLink(link)}
                    onDelete={() => handleDeleteLink(link.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      ) : (
        activeTab && <IframeView key={activeTab.id} tab={activeTab} />
      )}
    </div>
  );
}
