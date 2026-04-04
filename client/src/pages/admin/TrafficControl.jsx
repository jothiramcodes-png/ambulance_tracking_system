import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { toast } from '../../components/Toast';

export default function TrafficControl() {
  const { token } = useAuth();
  const { greenCorridors, emit } = useSocket();
  const [junctions, setJunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overriding, setOverriding] = useState({});

  useEffect(() => {
    fetch('http://localhost:5000/api/traffic/junctions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setJunctions(d.junctions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const override = async (junctionId, junctionName, status) => {
    setOverriding(p => ({ ...p, [junctionId]: true }));
    try {
      const res = await fetch('http://localhost:5000/api/traffic/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ junctionId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      emit('trigger_green_corridor', { junctionId, junctionName, status });
      toast(`🚦 ${junctionName} set to ${status}`, 'success');
      setJunctions(prev => prev.map(j => j.junctionId === junctionId ? { ...j, currentStatus: status, overrideActive: true } : j));

      // Auto-reset after 60s
      setTimeout(() => {
        setJunctions(prev => prev.map(j => j.junctionId === junctionId ? { ...j, currentStatus: 'RED', overrideActive: false } : j));
      }, 60000);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setOverriding(p => ({ ...p, [junctionId]: false }));
    }
  };

  const reset = async (junctionId) => {
    setOverriding(p => ({ ...p, [junctionId]: true }));
    try {
      await fetch(`http://localhost:5000/api/traffic/reset/${junctionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast(`🔴 Junction ${junctionId} reset`, 'info');
      setJunctions(prev => prev.map(j => j.junctionId === junctionId ? { ...j, currentStatus: 'RED', overrideActive: false } : j));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setOverriding(p => ({ ...p, [junctionId]: false }));
    }
  };

  const triggerAll = () => {
    junctions.forEach(j => override(j.junctionId, j.name, 'GREEN'));
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0 }}>🚦 Traffic Control</h2>
          <p>Manually override junction signals for green corridors</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-success" onClick={triggerAll} id="trigger-all-green">
            🟢 All Green
          </button>
        </div>
      </div>

      {/* Active corridors banner */}
      {greenCorridors.length > 0 && (
        <div style={{ background: 'var(--accent-green-glow)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🟢</span>
          <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
            Green Corridor Active: {greenCorridors.map(g => g.junctionId).join(', ')}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>Auto-resets in 60s</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {junctions.map(j => {
            const liveGreen = greenCorridors.some(g => g.junctionId === j.junctionId);
            const isGreen = liveGreen || j.currentStatus === 'GREEN';
            const isAmber = j.currentStatus === 'YELLOW';
            const isBusy = overriding[j.junctionId];
            return (
              <div key={j.junctionId} className="card" style={{ borderTop: `3px solid ${isGreen ? 'var(--accent-green)' : isAmber ? 'var(--accent-amber)' : 'var(--accent-red)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{j.name}</h3>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{j.junctionId}</div>
                  </div>
                  <span className={`badge badge-${isGreen ? 'green' : isAmber ? 'amber' : 'red'}`}>
                    <span className={`signal signal-${isGreen ? 'green' : isAmber ? 'amber' : 'red'}`} style={{ width: 8, height: 8 }} />
                    {isGreen ? 'GREEN' : isAmber ? 'YELLOW' : 'RED'}
                  </span>
                </div>

                {/* Traffic Light Visual */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '0.5rem' }}>
                  {['red', 'amber', 'green'].map(color => (
                    <div key={color} style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: (color === 'red' && !isGreen && !isAmber) ? 'var(--accent-red)'
                        : (color === 'amber' && isAmber) ? 'var(--accent-amber)'
                          : (color === 'green' && isGreen) ? 'var(--accent-green)'
                            : 'rgba(255,255,255,0.1)',
                      boxShadow: (color === 'red' && !isGreen && !isAmber) ? '0 0 10px var(--accent-red)'
                        : (color === 'amber' && isAmber) ? '0 0 10px var(--accent-amber)'
                          : (color === 'green' && isGreen) ? '0 0 10px var(--accent-green)'
                            : 'none',
                      transition: 'all 0.4s ease',
                    }} />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-success btn-sm"
                    style={{ flex: 1 }}
                    disabled={isGreen || isBusy}
                    onClick={() => override(j.junctionId, j.name, 'GREEN')}
                    id={`green-${j.junctionId}`}
                  >
                    {isBusy ? <span className="spinner" /> : '🟢 Set Green'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1 }}
                    disabled={!isGreen || isBusy}
                    onClick={() => reset(j.junctionId)}
                    id={`reset-${j.junctionId}`}
                  >
                    🔴 Reset
                  </button>
                </div>
                {j.overrideActive && <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--accent-amber)', textAlign: 'center' }}>⏱️ Override active – auto-resets in 60s</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
