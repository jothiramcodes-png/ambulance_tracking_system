import { useSocket } from '../../context/SocketContext';

export default function AdminAlerts() {
  const { alerts, greenCorridors } = useSocket();

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>🔔 Live Alerts</h2>
        <p>Real-time emergency alerts and green corridor notifications</p>
      </div>

      {/* Green Corridors Active */}
      <div className="card">
        <div className="section-header">
          <h3>🚦 Active Green Corridors</h3>
          <span className="badge badge-green">{greenCorridors.length} active</span>
        </div>
        {greenCorridors.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>No active green corridors</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem' }}>
            {greenCorridors.map(g => (
              <div key={g.junctionId} style={{ background: 'var(--accent-green-glow)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius-md)', padding: '0.6rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '0.9rem' }}>🟢 {g.junctionId}</div>
                {g.ambulanceId && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Triggered by {g.ambulanceId}</div>}
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{g.timestamp ? new Date(g.timestamp).toLocaleTimeString() : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency Alerts */}
      <div className="card">
        <div className="section-header">
          <h3>🚨 Emergency Alerts</h3>
          {alerts.length > 0 && <span className="badge badge-red">{alerts.length} alerts</span>}
        </div>
        {alerts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '3rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>🟢</span>
            <h3 style={{ color: 'var(--text-secondary)', margin: 0 }}>All Clear</h3>
            <p style={{ margin: 0 }}>No emergency alerts at this time.<br />Alerts will appear here when ambulances are dispatched.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
            {[...alerts].sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)).map(alert => (
              <div key={alert.id} className={`alert-item ${alert.priority === 'critical' ? 'critical' : alert.priority === 'high' ? 'high' : 'normal'}`}>
                <div style={{ fontSize: '2rem' }}>🚨</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{alert.ambulanceId} dispatched → {alert.destination}</div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    {alert.eta && <span>📍 ETA: {new Date(alert.eta).toLocaleTimeString()}</span>}
                    <span>⏱️ {new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <span className={`badge badge-${alert.priority === 'critical' ? 'red' : alert.priority === 'high' ? 'amber' : 'green'}`}>
                  {alert.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
