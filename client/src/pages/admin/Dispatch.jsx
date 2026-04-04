import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { toast } from '../../components/Toast';
import config from '../../config';

const AMBULANCES = [
  { ambulanceId: 'AMB_101', vehicleNo: 'MH-01-AX-1234', driverName: 'Ravi Kumar' },
  { ambulanceId: 'AMB_102', vehicleNo: 'MH-02-BY-5678', driverName: 'Suresh Patel' },
  { ambulanceId: 'AMB_103', vehicleNo: 'MH-03-CZ-9012', driverName: 'Amit Singh' },
];

const HOSPITALS = ['City General Hospital', 'Apollo Mumbai', 'Lilavati Hospital', 'Kokilaben Hospital', 'Bombay Hospital'];

export default function Dispatch() {
  const { token } = useAuth();
  const { emit, connected } = useSocket();
  const [form, setForm] = useState({
    ambulanceId: 'AMB_101',
    destinationHospital: 'City General Hospital',
    priority: 'high',
    patientAge: '',
    patientCondition: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [dispatched, setDispatched] = useState([]);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleDispatch = async () => {
    if (!form.patientCondition) { toast('Enter patient condition', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${config.API_URL}/api/ambulance/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, patientInfo: { age: form.patientAge, condition: form.patientCondition, notes: form.notes } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Also emit socket event
      emit('dispatch_ambulance', {
        tripId: data.trip.tripId,
        ambulanceId: form.ambulanceId,
        destinationHospital: form.destinationHospital,
        priority: form.priority,
        eta: data.trip.eta,
      });

      toast(`🚑 ${form.ambulanceId} dispatched to ${form.destinationHospital}!`, 'success');
      setDispatched(prev => [{ ...data.trip, driverName: AMBULANCES.find(a => a.ambulanceId === form.ambulanceId)?.driverName }, ...prev]);
      setForm(p => ({ ...p, patientAge: '', patientCondition: '', notes: '' }));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>📡 Emergency Dispatch</h2>
        <p>Dispatch ambulances and trigger green corridor protocols</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Dispatch Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🚨</span>
            <h3 style={{ margin: 0 }}>New Dispatch</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Select Ambulance</label>
            <select className="form-input form-select" name="ambulanceId" value={form.ambulanceId} onChange={handleChange} id="dispatch-ambulance">
              {AMBULANCES.map(a => (
                <option key={a.ambulanceId} value={a.ambulanceId}>
                  {a.ambulanceId} – {a.driverName} ({a.vehicleNo})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Destination Hospital</label>
            <select className="form-input form-select" name="destinationHospital" value={form.destinationHospital} onChange={handleChange} id="dispatch-hospital">
              {HOSPITALS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Priority Level</label>
            <select className="form-input form-select" name="priority" value={form.priority} onChange={handleChange} id="dispatch-priority">
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Patient Age</label>
              <input className="form-input" type="number" name="patientAge" value={form.patientAge} onChange={handleChange} placeholder="e.g. 45" id="dispatch-age" />
            </div>
            <div className="form-group">
              <label className="form-label">Patient Condition *</label>
              <input className="form-input" type="text" name="patientCondition" value={form.patientCondition} onChange={handleChange} placeholder="e.g. Cardiac Arrest" id="dispatch-condition" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" name="notes" value={form.notes} onChange={handleChange} placeholder="Additional notes..." rows={3} id="dispatch-notes" style={{ resize: 'vertical' }} />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleDispatch}
            disabled={loading || !connected}
            id="dispatch-submit"
            style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', fontSize: '1rem' }}
          >
            {loading ? <><span className="spinner" /> Dispatching...</> : '🚑 Dispatch Ambulance'}
          </button>
          {!connected && <p style={{ fontSize: '0.78rem', color: 'var(--accent-amber)', textAlign: 'center' }}>⚠️ Server offline — connect to dispatch</p>}
        </div>

        {/* Dispatch History */}
        <div className="card">
          <div className="section-header">
            <h3>📋 Recent Dispatches</h3>
            <span className="badge badge-blue">{dispatched.length} this session</span>
          </div>
          {dispatched.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '3rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>📡</span>
              <p>No dispatches yet this session.<br />Use the form to dispatch an ambulance.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {dispatched.map(d => (
                <div key={d.tripId} className="alert-item" style={{ borderLeft: `3px solid ${d.priority === 'critical' ? 'var(--accent-red)' : d.priority === 'high' ? 'var(--accent-amber)' : 'var(--accent-green)'}` }}>
                  <span style={{ fontSize: '1.5rem' }}>🚑</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{d.ambulanceId} → {d.destinationHospital}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Driver: {d.driverName} · ETA: {d.eta ? new Date(d.eta).toLocaleTimeString() : 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{d.tripId}</div>
                  </div>
                  <span className={`badge badge-${d.priority === 'critical' ? 'red' : d.priority === 'high' ? 'amber' : 'green'}`}>
                    {d.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
