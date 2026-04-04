import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { toast } from '../../components/Toast';

export default function FleetManagement() {
  const { token } = useAuth();
  const { locationUpdates } = useSocket();
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    fetch('http://localhost:5000/api/ambulance', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setAmbulances(d.ambulances || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const updateStatus = async (ambulanceId, status) => {
    setUpdating(p => ({ ...p, [ambulanceId]: true }));
    try {
      const res = await fetch('http://localhost:5000/api/ambulance/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ambulanceId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAmbulances(prev => prev.map(a => a.ambulanceId === ambulanceId ? { ...a, status } : a));
      toast(`${ambulanceId} status → ${status}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUpdating(p => ({ ...p, [ambulanceId]: false }));
    }
  };

  const statusConfig = {
    idle: { color: 'var(--accent-green)', badge: 'badge-green', label: 'Idle' },
    'en-route': { color: 'var(--accent-red)', badge: 'badge-red', label: 'En-Route' },
    maintenance: { color: 'var(--accent-amber)', badge: 'badge-amber', label: 'Maintenance' },
    offline: { color: 'var(--text-muted)', badge: 'badge-blue', label: 'Offline' },
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>🚑 Fleet Management</h2>
        <p>Monitor and manage all ambulances in the system</p>
      </div>

      {/* Summary Stats */}
      <div className="grid-4">
        {Object.entries(statusConfig).map(([status, cfg]) => (
          <div key={status} className="stat-card" style={{ borderTop: `3px solid ${cfg.color}` }}>
            <div className="stat-value" style={{ color: cfg.color, fontSize: '1.75rem' }}>
              {ambulances.filter(a => a.status === status).length}
            </div>
            <div className="stat-label">{cfg.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
          {ambulances.map(amb => {
            const live = locationUpdates.find(l => l.ambulanceId === amb.ambulanceId);
            const loc = live?.location || amb.currentLocation;
            const cfg = statusConfig[amb.status] || statusConfig['idle'];
            const isBusy = updating[amb.ambulanceId];

            return (
              <div key={amb.ambulanceId} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', filter: `drop-shadow(0 0 8px ${cfg.color}40)` }}>🚑</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: cfg.color }}>{amb.ambulanceId}</div>
                      <div style={{ fontSize: '0.78rem', fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{amb.vehicleNo}</div>
                    </div>
                  </div>
                  <span className={`badge ${cfg.badge}`}>
                    {amb.status === 'en-route' && <span className="pulse-dot red" style={{ width: 6, height: 6 }} />}
                    {cfg.label}
                  </span>
                </div>

                {/* Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.6rem', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Driver</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{amb.driverName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{amb.driverPhone}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.6rem', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Location</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', color: live ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                      {loc ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : 'Unknown'}
                    </div>
                    {live && <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)' }}>● LIVE</div>}
                  </div>
                </div>

                {amb.assignedHospital && (
                  <div style={{ background: 'var(--accent-red-glow)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--accent-red)' }}>
                    🏥 Assigned → {amb.assignedHospital}
                  </div>
                )}

                {/* Status Controls */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['idle', 'en-route', 'maintenance'].map(s => (
                    <button
                      key={s}
                      className={`btn btn-sm btn-ghost`}
                      disabled={amb.status === s || isBusy}
                      onClick={() => updateStatus(amb.ambulanceId, s)}
                      style={{ fontSize: '0.72rem', flex: 1 }}
                      id={`status-${amb.ambulanceId}-${s}`}
                    >
                      {isBusy && amb.status !== s ? <span className="spinner" style={{ width: 12, height: 12 }} /> : s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
