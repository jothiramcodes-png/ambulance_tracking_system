import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ambIcon = L.divIcon({
  html: `<div style="font-size:1.6rem;filter:drop-shadow(0 2px 6px rgba(255,62,94,0.8));animation:bounce 1s infinite alternate;">🚑</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const junctionIcon = (isGreen) => L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:${isGreen ? '#00e676' : '#ff3e5e'};box-shadow:0 0 10px ${isGreen ? '#00e676' : '#ff3e5e'};border:2px solid white;"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const DEMO_JUNCTIONS = [
  { junctionId: 'JCT_001', name: 'Andheri Junction', lat: 19.1136, lng: 72.8697 },
  { junctionId: 'JCT_002', name: 'Bandra Signal', lat: 19.0596, lng: 72.8295 },
  { junctionId: 'JCT_003', name: 'Dadar Crossing', lat: 19.0178, lng: 72.8478 },
  { junctionId: 'JCT_004', name: 'Kurla Signal', lat: 19.0726, lng: 72.8800 },
  { junctionId: 'JCT_005', name: 'Ghatkopar Junction', lat: 19.0858, lng: 72.9081 },
];

const DEMO_AMBULANCES = [
  { ambulanceId: 'AMB_101', vehicleNo: 'MH-01-AX-1234', driverName: 'Ravi Kumar', location: { lat: 19.0760, lng: 72.8777 } },
  { ambulanceId: 'AMB_102', vehicleNo: 'MH-02-BY-5678', driverName: 'Suresh Patel', location: { lat: 19.0900, lng: 72.8650 } },
  { ambulanceId: 'AMB_103', vehicleNo: 'MH-03-CZ-9012', driverName: 'Amit Singh', location: { lat: 19.0650, lng: 72.8900 } },
];

function MapStyler() {
  const map = useMap();
  useEffect(() => {
    map.getContainer().style.background = '#1a1c24';
  }, [map]);
  return null;
}

function MapCenterer({ selectedAmb, ambulancePositions }) {
  const map = useMap();
  useEffect(() => {
    if (selectedAmb) {
      const amb = ambulancePositions.find(a => a.ambulanceId === selectedAmb);
      if (amb && amb.location) map.setView([amb.location.lat, amb.location.lng], 14, { animate: true });
    } else {
      const active = ambulancePositions.find(a => (a.location && a.status === 'en-route') || (a.location && a.location.lat !== 19.0760 && a.location.lat !== 19.0900 && a.location.lat !== 19.0650));
      if (active) map.setView([active.location.lat, active.location.lng], 13, { animate: true });
    }
  }, [selectedAmb, ambulancePositions, map]);
  return null;
}

export default function LiveMap() {
  const { locationUpdates, greenCorridors } = useSocket();
  const { token } = useAuth();
  const [selectedAmb, setSelectedAmb] = useState(null);

  const ambulancePositions = DEMO_AMBULANCES.map(amb => {
    const live = locationUpdates.find(l => l.ambulanceId === amb.ambulanceId);
    return { ...amb, location: live?.location || amb.location };
  });

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>🗺️ Live Map</h2>
        <p>Real-time ambulance tracking and green corridor visualization (Click on an ambulance to track it)</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        {/* Legend */}
        <div className="card" style={{ minWidth: 200, height: 'fit-content' }}>
          <h4>Map Legend</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
              <span>🚑</span><span style={{ color: 'var(--text-secondary)' }}>Active Ambulance</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
              <span className="signal signal-green" /><span style={{ color: 'var(--text-secondary)' }}>Green Signal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
              <span className="signal signal-red" /><span style={{ color: 'var(--text-secondary)' }}>Red Signal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent-green)', display: 'inline-block', opacity: 0.5 }} />
              <span style={{ color: 'var(--text-secondary)' }}>500m Radius</span>
            </div>
          </div>
          <hr />
          <h4>Ambulances</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {ambulancePositions.map(a => (
              <div key={a.ambulanceId}
                style={{ fontSize: '0.78rem', padding: '0.4rem', borderRadius: 6, cursor: 'pointer', background: selectedAmb === a.ambulanceId ? 'rgba(255,62,94,0.1)' : 'transparent', border: `1px solid ${selectedAmb === a.ambulanceId ? 'var(--accent-red)' : 'transparent'}` }}
                onClick={() => setSelectedAmb(a.ambulanceId)}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.ambulanceId}</div>
                <div style={{ color: 'var(--text-muted)' }}>{a.driverName}</div>
              </div>
            ))}
          </div>
          <hr />
          <h4>Green Corridors</h4>
          <div style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
            {greenCorridors.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None active</p>
              : greenCorridors.map(g => (
                <div key={g.junctionId} style={{ color: 'var(--accent-green)', fontWeight: 600 }}>✅ {g.junctionId}</div>
              ))}
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, height: '70vh', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <style>{`
            .leaflet-container { background: #1a1c24; }
            .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important; }
            .leaflet-control-zoom a { background-color: var(--bg-card) !important; color: var(--text-primary) !important; border-bottom-color: var(--border) !important; }
            .leaflet-control-zoom a:hover { background-color: var(--bg-card-hover) !important; }
          `}</style>
          <MapContainer
            center={[19.076, 72.8777]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapStyler />
            <MapCenterer selectedAmb={selectedAmb} ambulancePositions={ambulancePositions} />

            {/* Ambulance markers */}
            {ambulancePositions.map(amb => (
              <Marker key={amb.ambulanceId} position={[amb.location.lat, amb.location.lng]} icon={ambIcon}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <strong style={{ color: '#ff3e5e' }}>{amb.ambulanceId}</strong><br />
                    {amb.vehicleNo}<br />
                    Driver: {amb.driverName}<br />
                    <span style={{ fontSize: '0.75em', color: '#999' }}>
                      {amb.location.lat.toFixed(5)}, {amb.location.lng.toFixed(5)}
                    </span>
                  </div>
                </Popup>
                <Circle
                  center={[amb.location.lat, amb.location.lng]}
                  radius={500}
                  pathOptions={{ color: '#ff3e5e', fillColor: '#ff3e5e', fillOpacity: 0.05, weight: 1, dashArray: '4 4' }}
                />
              </Marker>
            ))}

            {/* Junction markers */}
            {DEMO_JUNCTIONS.concat(
              greenCorridors
                .filter(g => !DEMO_JUNCTIONS.some(dj => dj.junctionId === g.junctionId))
                .map(g => ({ junctionId: g.junctionId, name: 'Dynamic Smart Junction', lat: g.location?.lat || (ambulancePositions.find(a => a.ambulanceId === g.ambulanceId)?.location.lat || 19.076) + 0.002, lng: g.location?.lng || (ambulancePositions.find(a => a.ambulanceId === g.ambulanceId)?.location.lng || 72.877) + 0.002 }))
            ).map(j => {
              const isGreen = greenCorridors.some(g => g.junctionId === j.junctionId);
              return (
                <Marker key={j.junctionId} position={[j.lat, j.lng]} icon={junctionIcon(isGreen)}>
                  <Popup>
                    <div>
                      <strong>{j.name}</strong><br />
                      Status: <strong style={{ color: isGreen ? '#00e676' : '#ff3e5e' }}>{isGreen ? '🟢 GREEN' : '🔴 RED'}</strong>
                    </div>
                  </Popup>
                  {isGreen && (
                    <Circle
                      center={[j.lat, j.lng]}
                      radius={300}
                      pathOptions={{ color: '#00e676', fillColor: '#00e676', fillOpacity: 0.1, weight: 2 }}
                    />
                  )}
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
