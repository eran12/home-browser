import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import ServiceCard from './components/ServiceCard.jsx';

const REFRESH_MS = parseInt(import.meta.env.VITE_REFRESH_INTERVAL || '30', 10) * 1000;

export default function App() {
  const [services, setServices] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  // Group by homepage.group label, default group = null (shown as "Services")
  const groups = {};
  if (services) {
    for (const service of services) {
      const key = service.group || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(service);
    }
  }

  // Sort: named groups first (alphabetically), then default group last
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  });

  const totalRunning = services?.filter((s) => s.state === 'running').length ?? 0;

  return (
    <div className="app">
      <Header
        totalServices={services?.length ?? 0}
        totalRunning={totalRunning}
        lastUpdated={lastUpdated}
        onRefresh={fetchContainers}
        loading={loading}
      />
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
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
