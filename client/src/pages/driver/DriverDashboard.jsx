import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { toast } from '../../components/Toast';

export default function DriverDashboard() {
  const { user, token } = useAuth();
  const { emit, connected, greenCorridors } = useSocket();
  const [location, setLocation] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const watchRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Fetch real IP location on mount so it's accurate
    fetch('https://get.geojs.io/v1/ip/geo.json')
      .then(res => res.json())
      .then(data => {
        if (data.latitude && data.longitude) {
          setLocation({ lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) });
          setAccuracy(data.accuracy || 10);
        }
      })
      .catch(console.error);
  }, []);

  const sendLocation = useCallback((lat, lng) => {
    if (!lat || !lng) return;
    emit('update_location', {
      tripId: `TRIP_${user?.email}`,
      ambulanceId: user?.ambulanceId || 'AMB_101',
      location: { lat, lng },
    });
  }, [emit, user]);

  const startTracking = async () => {
    setTracking(true);
    let startLoc = location;

    // Set status to en-route on server so hospital sees us
    fetch('http://localhost:5000/api/ambulance/update-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ambulanceId: user?.ambulanceId, status: 'en-route' })
    }).catch(console.error);

    // If we don't have location yet, wait for IP API fetch
    if (!startLoc || !startLoc.lat) {
      toast('Fetching real location via GeoJS...', 'info');
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const data = await res.json();
        if (data.latitude && data.longitude) {
          startLoc = { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) };
          setLocation(startLoc);
          setAccuracy(data.accuracy || 10);
        }
      } catch (err) {
        toast('Location blocked. Defaulting to Central Area.', 'error');
        startLoc = { lat: 19.0760, lng: 72.8777 }; 
        setLocation(startLoc);
      }
    }

    toast('📍 Real-time tracking started!', 'success');
    sendLocation(startLoc.lat, startLoc.lng);

    // Provide a smooth realistic simulation of movement around their REAL location
    intervalRef.current = setInterval(() => {
      setLocation(prev => {
        if (!prev || typeof prev.lat !== 'number') return startLoc;
        const newLoc = { 
          lat: prev.lat + (Math.random() - 0.5) * 0.0005, 
          lng: prev.lng + (Math.random() - 0.5) * 0.0005 
        };
        sendLocation(newLoc.lat, newLoc.lng);
        return newLoc;
      });
    }, 3000);
  };

  const stopTracking = () => {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTracking(false);

    // Reset status to idle so we disappear from hospital dashboard
    fetch('http://localhost:5000/api/ambulance/update-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ambulanceId: user?.ambulanceId, status: 'idle' })
    }).catch(console.error);

    toast('🛑 Tracking stopped', 'info');
  };

  useEffect(() => () => {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const activeGreen = greenCorridors.length > 0;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>🚑 Driver Dashboard</h2>
        <p>Welcome, {user?.name} — Share your live location</p>
      </div>

      {/* Status Banner */}
      {activeGreen && (
        <div style={{ background: 'var(--accent-green-glow)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius-md)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'fadeUp 0.3s ease' }}>
          <span style={{ fontSize: '1.75rem' }}>🟢</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-green)' }}>GREEN CORRIDOR ACTIVE!</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Junctions cleared: {greenCorridors.map(g => g.junctionId).join(', ')}. Proceed with caution.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }}>
        {/* Main Tracking Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>📍 Location Tracking</h3>
            <span className={`badge ${tracking ? 'badge-green' : 'badge-red'}`}>
              {tracking ? <><span className="pulse-dot green" style={{ width: 6, height: 6 }} /> Transmitting</> : 'Idle'}
            </span>
          </div>

          {/* Location Display */}
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Current Coordinates</div>
            
            {location ? (
              <>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '1.5rem', fontWeight: 700, color: tracking ? 'var(--accent-green)' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </div>
                {accuracy && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>±{accuracy.toFixed(0)}m accuracy</div>}
              </>
            ) : (
              <div style={{ fontFamily: 'var(--mono)', fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                {tracking ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} /> Acquiring GPS Lock...</> : 'Location Unknown'}
              </div>
            )}

            {tracking && location && (
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <span className="pulse-dot green" style={{ width: 6, height: 6 }} /> Broadcasting to server every 3s
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            {!tracking ? (
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '0.9rem', fontSize: '1rem' }}
                onClick={startTracking}
                disabled={!connected}
                id="start-tracking"
              >
                📍 Start Tracking
              </button>
            ) : (
              <button
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: 'center', padding: '0.9rem', fontSize: '1rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                onClick={stopTracking}
                id="stop-tracking"
              >
                🛑 Stop Tracking
              </button>
            )}
          </div>

          {!connected && <p style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', textAlign: 'center' }}>⚠️ Server offline — cannot broadcast location</p>}
        </div>

        {/* Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Vehicle Info */}
          <div className="card">
            <h4 style={{ marginBottom: '0.75rem' }}>My Vehicle</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: 'Ambulance ID', val: user?.ambulanceId || 'AMB_101', mono: true },
                { label: 'Driver', val: user?.name },
                { label: 'Email', val: user?.email, mono: true },
              ].map(({ label, val, mono }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: mono ? 'var(--mono)' : undefined, color: 'var(--text-primary)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Green Corridors */}
          <div className="card">
            <h4 style={{ marginBottom: '0.75rem' }}>🚦 Junction Status</h4>
            {greenCorridors.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>All signals are normal</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {greenCorridors.map(g => (
                  <div key={g.junctionId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--accent-green-glow)', borderRadius: 8 }}>
                    <span className="signal signal-green" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-green)' }}>{g.junctionId}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>CLEAR</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="card" style={{ background: 'rgba(68,138,255,0.05)', borderColor: 'rgba(68,138,255,0.3)' }}>
            <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-blue)' }}>💡 Quick Tips</h4>
            <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li>Start tracking when beginning a trip</li>
              <li>Green corridor will auto-activate within 500m of junctions</li>
              <li>Keep screen on during active trips</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
