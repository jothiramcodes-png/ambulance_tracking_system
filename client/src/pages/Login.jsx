import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import config from '../config';
import './Login.css';

const ROLE_REDIRECT = {
  admin: '/admin',
  hospital_staff: '/hospital',
  ambulance_driver: '/driver',
};

const FALLBACK_DRIVERS = [
  { driverName: 'Ravi Kumar', email: 'driver@amt.com', ambulanceId: 'AMB_101' },
  { driverName: 'Suresh Patel', email: 'suresh@amt.com', ambulanceId: 'AMB_102' },
  { driverName: 'Amit Singh', email: 'amit@amt.com', ambulanceId: 'AMB_103' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState(FALLBACK_DRIVERS);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Fetch live driver list so newly added drivers appear automatically
  useEffect(() => {
    const fetchDrivers = () => {
      fetch(`${config.API_URL}/api/ambulance/drivers-public?t=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => { if (data.drivers?.length) setDrivers(data.drivers); })
        .catch(() => {}); // silently fall back to FALLBACK_DRIVERS
    };

    fetchDrivers();
    const interval = setInterval(fetchDrivers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast('Please enter email and password', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${config.API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      login(data.token, data.user);
      toast(`Welcome back, ${data.user.name}!`, 'success');
      navigate(ROLE_REDIRECT[data.user.role] || '/admin');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFastLogin = async (driver) => {
    setLoading(true);
    try {
      const res = await fetch(`${config.API_URL}/api/auth/fast-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambulanceId: driver.ambulanceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      login(data.token, data.user);
      toast(`Signed in as ${driver.driverName}`, 'success');
      navigate('/driver');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background Effects */}
      <div className="login-bg">
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-orb orb-3" />
        <div className="grid-overlay" />
      </div>

      <div className="login-container">
        {/* Left Panel */}
        <div className="login-left">
          <div className="login-brand">
            <div className="brand-icon">🚑</div>
            <h1 className="brand-name">AMT System</h1>
            <p className="brand-tagline">Smart Ambulance Tracking &<br />Green Corridor Management</p>
          </div>
          <div className="login-features">
            {[
              { icon: '📍', label: 'Real-time GPS Tracking' },
              { icon: '🚦', label: 'Automated Green Corridors' },
              { icon: '🏥', label: 'Hospital Coordination' },
              { icon: '⚡', label: 'Live Emergency Dispatch' },
            ].map(f => (
              <div key={f.label} className="feature-pill">
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
          <div className="login-stats">
            <div className="login-stat"><span className="ls-value">3</span><span className="ls-label">Active Ambulances</span></div>
            <div className="login-stat"><span className="ls-value">5</span><span className="ls-label">Monitored Junctions</span></div>
            <div className="login-stat"><span className="ls-value">24/7</span><span className="ls-label">Live Monitoring</span></div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="login-right">
          <div className="login-card glass">
            <div className="login-header">
              <h2>Sign In</h2>
              <p>Access your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@hospital.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  id="login-email"
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  id="login-password"
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" className="btn btn-primary login-submit" disabled={loading} id="login-submit">
                {loading ? <><span className="spinner" /> Signing in...</> : <><span>🔐</span> Sign In</>}
              </button>

              {/* Fast Login - All Drivers (dynamic) */}
              <div className="fast-login-section">
                <div className="fast-login-label">⚡ Fast Login as Driver</div>
                <div className="fast-login-list">
                  {drivers.map(driver => (
                    <button
                      key={driver.ambulanceId}
                      type="button"
                      className="fast-login-item"
                      disabled={loading}
                      onClick={() => handleFastLogin(driver)}
                    >
                      <span className="fli-icon">🚑</span>
                      <div className="fli-info">
                        <span className="fli-name">{driver.driverName}</span>
                        <span className="fli-id">{driver.ambulanceId}</span>
                      </div>
                      <span className="fli-arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
