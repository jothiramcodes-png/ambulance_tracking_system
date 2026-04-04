import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import './Login.css';

const ROLE_REDIRECT = {
  admin: '/admin',
  hospital_staff: '/hospital',
  ambulance_driver: '/driver',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast('Please enter email and password', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
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

              <button 
                type="button" 
                className="btn btn-ghost" 
                style={{ width: '100%', marginTop: '0.5rem', color: 'var(--accent-red)', borderColor: 'rgba(255, 62, 94, 0.3)' }} 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch('http://localhost:5000/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: 'driver@amt.com', password: 'driver123' }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Login failed');
                    login(data.token, data.user);
                    navigate('/driver');
                  } catch (err) {
                    toast(err.message, 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                ⚡ Fast Login as Driver
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
