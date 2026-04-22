import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import config from '../../config';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const { connected, locationUpdates, greenCorridors, alerts } = useSocket();
  const [ambulances, setAmbulances] = useState([]);
  const [junctions, setJunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDriverModal, setShowNewDriverModal] = useState(false);
  const [driverForm, setDriverForm] = useState({ driverName: '', driverPhone: '', vehicleNo: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetModal = () => {
    setShowNewDriverModal(false);
    setDriverForm({ driverName: '', driverPhone: '', vehicleNo: '', email: '', password: '' });
    setFormError('');
    setFormSuccess('');
  };

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!driverForm.driverName || !driverForm.driverPhone || !driverForm.vehicleNo) {
      setFormError('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${config.API_URL}/api/ambulance/add-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(driverForm),
      });
      const data = await res.json();
      if (!res.ok) {
        // Capture detailed error if available
        const errorMsg = data.details ? `${data.message}: ${data.details}` : (data.message || 'Failed to add driver');
        throw new Error(errorMsg);
      }
      setFormSuccess(`✅ ${data.ambulance.driverName} added as ${data.ambulance.ambulanceId}`);
      // Refresh ambulances list
      const ambRes = await fetch(`${config.API_URL}/api/ambulance`, { headers: { Authorization: `Bearer ${token}` } });
      const ambData = await ambRes.json();
      setAmbulances(ambData.ambulances || []);
      setTimeout(() => resetModal(), 1800);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${config.API_URL}/api/ambulance`, { headers }).then(r => r.json()),
      fetch(`${config.API_URL}/api/traffic/junctions`, { headers }).then(r => r.json()),
    ]).then(([ambData, jctData]) => {
      setAmbulances(ambData.ambulances || []);
      setJunctions(jctData.junctions || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  const activeCount = ambulances.filter(a => a.status === 'en-route').length;
  const idleCount = ambulances.filter(a => a.status === 'idle').length;
  const greenCount = greenCorridors.length;
  const alertCount = alerts.length;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="admin-dashboard page-enter">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h2 className="greeting">{greeting}, {user?.name?.split(' ')[0]} 👋</h2>
          <p className="dashboard-date">{now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="header-badges">
          <button
            id="btn-new-ambulance-driver"
            className="btn-new-driver"
            onClick={() => setShowNewDriverModal(true)}
          >
            <span className="btn-new-driver-icon">➕</span>
            New Ambulance Driver
          </button>
          <div className={`conn-badge ${connected ? 'online' : 'offline'}`}>
            <span className={`pulse-dot ${connected ? 'green' : 'red'}`} />
            {connected ? 'Live Feed Active' : 'Reconnecting...'}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card red">
          <div className="stat-icon">🚑</div>
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{activeCount}</div>
          <div className="stat-label">Active Ambulances</div>
          <div className="stat-trend">En-route right now</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{idleCount}</div>
          <div className="stat-label">Idle Ambulances</div>
          <div className="stat-trend">Ready to dispatch</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">🚦</div>
          <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>{greenCount}</div>
          <div className="stat-label">Green Corridors</div>
          <div className="stat-trend">Active overrides</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">🔔</div>
          <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{alertCount}</div>
          <div className="stat-label">Live Alerts</div>
          <div className="stat-trend">This session</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Fleet Status */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="section-header">
            <h3>🚑 Fleet Status</h3>
            <span className="badge badge-blue">{ambulances.length} vehicles</span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Ambulance ID</th>
                    <th>Vehicle No</th>
                    <th>Driver</th>
                    <th>Status</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {ambulances.map(amb => {
                    const live = locationUpdates.find(l => l.ambulanceId === amb.ambulanceId);
                    return (
                      <tr key={amb.ambulanceId}>
                        <td><span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--accent-blue)' }}>{amb.ambulanceId}</span></td>
                        <td>{amb.vehicleNo}</td>
                        <td>{amb.driverName}</td>
                        <td>
                          <span className={`badge ${amb.status === 'en-route' ? 'badge-red' : 'badge-green'}`}>
                            <span className={`pulse-dot ${amb.status === 'en-route' ? 'red' : 'green'}`} style={{ width: 6, height: 6 }} />
                            {amb.status}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {live
                            ? `${live.location.lat.toFixed(4)}, ${live.location.lng.toFixed(4)}`
                            : `${amb.currentLocation.lat.toFixed(4)}, ${amb.currentLocation.lng.toFixed(4)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Traffic Junctions */}
        <div className="card">
          <div className="section-header">
            <h3>🚦 Traffic Junctions</h3>
            <span className="badge badge-amber">{junctions.length} monitored</span>
          </div>
          <div className="junction-list">
            {junctions.map(j => {
              const isGreen = greenCorridors.some(g => g.junctionId === j.junctionId) || j.currentStatus === 'GREEN';
              const isAmber = j.currentStatus === 'YELLOW';
              return (
                <div key={j.junctionId} className="junction-item">
                  <div className="junction-info">
                    <span className={`signal signal-${isGreen ? 'green' : isAmber ? 'amber' : 'red'}`} />
                    <div>
                      <div className="junction-name">{j.name}</div>
                      <div className="junction-id">{j.junctionId}</div>
                    </div>
                  </div>
                  <span className={`badge badge-${isGreen ? 'green' : isAmber ? 'amber' : 'red'}`}>
                    {isGreen ? 'GREEN' : isAmber ? 'YELLOW' : 'RED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Alerts */}
        <div className="card">
          <div className="section-header">
            <h3>🔔 Live Alerts</h3>
            {alerts.length > 0 && <span className="badge badge-red">{alerts.length} new</span>}
          </div>
          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div className="empty-state">
                <span>🟢</span>
                <p>No emergency alerts at this time</p>
              </div>
            ) : alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="alert-item critical">
                <span style={{ fontSize: '1.25rem' }}>🚨</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{alert.ambulanceId} → {alert.destination}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    ETA: {alert.eta ? new Date(alert.eta).toLocaleTimeString() : 'N/A'} · Priority: {alert.priority}
                  </div>
                </div>
                <span className={`badge badge-${alert.priority === 'critical' ? 'red' : 'amber'}`}>{alert.priority}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── New Ambulance Driver Modal ── */}
      {showNewDriverModal && (
        <div className="modal-overlay" onClick={resetModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🚑 Add New Ambulance Driver</h3>
              <button className="modal-close" onClick={resetModal}>✕</button>
            </div>

            <form onSubmit={handleDriverSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Driver Name *</label>
                  <input
                    id="input-driver-name"
                    className="form-input"
                    placeholder="e.g. Ravi Kumar"
                    value={driverForm.driverName}
                    onChange={e => setDriverForm(p => ({ ...p, driverName: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    id="input-driver-phone"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={driverForm.driverPhone}
                    onChange={e => setDriverForm(p => ({ ...p, driverPhone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Vehicle Number *</label>
                  <input
                    id="input-vehicle-no"
                    className="form-input"
                    placeholder="e.g. MH-01-AX-1234"
                    value={driverForm.vehicleNo}
                    onChange={e => setDriverForm(p => ({ ...p, vehicleNo: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (optional)</label>
                  <input
                    id="input-driver-email"
                    className="form-input"
                    placeholder="e.g. driver@amt.com"
                    value={driverForm.email}
                    onChange={e => setDriverForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password (optional – for login)</label>
                <input
                  id="input-driver-password"
                  className="form-input"
                  type="password"
                  placeholder="Set a login password"
                  value={driverForm.password}
                  onChange={e => setDriverForm(p => ({ ...p, password: e.target.value }))}
                />
              </div>

              {formError && <div className="modal-msg modal-msg-error">{formError}</div>}
              {formSuccess && <div className="modal-msg modal-msg-success">{formSuccess}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={resetModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner" /> Adding...</> : '🚑 Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
