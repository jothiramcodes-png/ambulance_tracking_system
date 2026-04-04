import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { toast } from '../../components/Toast';

export default function HospitalDashboard() {
  const { token, user } = useAuth();
  const { alerts, greenCorridors, connected } = useSocket();
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState({});

  useEffect(() => {
    fetch('http://localhost:5000/api/hospital/incoming', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setIncoming(d.incoming || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const markReady = async (alertId) => {
    setMarking(p => ({ ...p, [alertId]: true }));
    try {
      const res = await fetch(`http://localhost:5000/api/hospital/ready/${alertId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setIncoming(prev => prev.map(a => a.alertId === alertId ? { ...a, hospitalReady: true } : a));
      toast('✅ Hospital marked as ready!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setMarking(p => ({ ...p, [alertId]: false }));
    }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0 }}>🏥 Hospital Dashboard</h2>
          <p>Welcome, {user?.name} — Stay ready for incoming ambulances</p>
        </div>
        <div className={`conn-badge ${connected ? 'online' : 'offline'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700, background: connected ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)', color: connected ? 'var(--accent-green)' : 'var(--accent-red)', border: `1px solid ${connected ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
          <span className={`pulse-dot ${connected ? 'green' : 'red'}`} />
          {connected ? 'Live Feed' : 'Offline'}
        </div>
      </div>

      {/* Summary */}
      <div className="grid-3">
        <div className="stat-card red">
          <div className="stat-icon">🚑</div>
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{incoming.length}</div>
          <div className="stat-label">Incoming Ambulances</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{incoming.filter(a => a.hospitalReady).length}</div>
          <div className="stat-label">Hospital Ready</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">🟡</div>
          <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>{incoming.filter(a => !a.hospitalReady).length}</div>
          <div className="stat-label">Awaiting Prep</div>
        </div>
      </div>

      {/* Incoming Ambulances */}
      <div className="card">
        <div className="section-header">
          <h3>🚑 Incoming Ambulances</h3>
          {incoming.length > 0 && <span className="badge badge-red">{incoming.filter(a => !a.hospitalReady).length} pending</span>}
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><span className="spinner" /></div>
        ) : incoming.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '3rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem' }}>🏥</span><p>No incoming ambulances at this time</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
            {incoming.map(alert => (
              <div key={alert.alertId} className={`alert-item ${alert.priority === 'critical' ? 'critical' : alert.priority === 'high' ? 'high' : 'normal'}`} style={{ gap: '1rem' }}>
                <div style={{ fontSize: '2.5rem' }}>🚑</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{alert.ambulanceId}</span>
                    <span className={`badge badge-${alert.priority === 'critical' ? 'red' : alert.priority === 'high' ? 'amber' : 'green'}`}>{alert.priority}</span>
                    {alert.hospitalReady && <span className="badge badge-green">✅ Ready</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                    {[
                      { label: 'Vehicle', val: alert.vehicleNo },
                      { label: 'Driver', val: alert.driverName },
                      { label: 'Condition', val: alert.patientCondition },
                      { label: 'ETA', val: alert.etaMinutes ? `${alert.etaMinutes} min` : (alert.eta ? new Date(alert.eta).toLocaleTimeString() : 'N/A') },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: 8 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{label}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{val || 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {!alert.hospitalReady && (
                  <button
                    className="btn btn-success"
                    onClick={() => markReady(alert.alertId)}
                    disabled={marking[alert.alertId]}
                    id={`ready-${alert.alertId}`}
                    style={{ flexShrink: 0, alignSelf: 'center' }}
                  >
                    {marking[alert.alertId] ? <span className="spinner" /> : '✅ Mark Ready'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Socket Alerts */}
      {alerts.length > 0 && (
        <div className="card" style={{ borderTop: '3px solid var(--accent-red)' }}>
          <div className="section-header">
            <h3>🔔 Live Socket Alerts</h3>
            <span className="badge badge-red">{alerts.length} new</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.5rem' }}>
            {alerts.slice(0, 3).map(a => (
              <div key={a.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'var(--accent-red-glow)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
                <span>🚨</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-red)' }}>
                  {a.ambulanceId} en route to {a.destination} — ETA {a.eta ? new Date(a.eta).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
