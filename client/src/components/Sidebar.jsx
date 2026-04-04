import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './Sidebar.css';

const navItems = {
  admin: [
    { path: '/admin', label: 'Dashboard', icon: '📊', end: true },
    { path: '/admin/map', label: 'Live Map', icon: '🗺️' },
    { path: '/admin/fleet', label: 'Fleet', icon: '🚑' },
    { path: '/admin/traffic', label: 'Traffic Control', icon: '🚦' },
    { path: '/admin/dispatch', label: 'Dispatch', icon: '📡' },
    { path: '/admin/alerts', label: 'Alerts', icon: '🔔' },
  ],
  hospital_staff: [
    { path: '/hospital', label: 'Dashboard', icon: '🏥', end: true },
    { path: '/hospital/incoming', label: 'Incoming', icon: '🚑' },
    { path: '/hospital/map', label: 'Track Map', icon: '🗺️' },
  ],
  ambulance_driver: [
    { path: '/driver', label: 'Dashboard', icon: '🚗', end: true },
    { path: '/driver/tracking', label: 'My Location', icon: '📍' },
    { path: '/driver/trip', label: 'Active Trip', icon: '📋' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const items = navItems[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors = {
    admin: 'var(--accent-purple)',
    hospital_staff: 'var(--accent-blue)',
    ambulance_driver: 'var(--accent-red)',
  };

  const roleLabels = {
    admin: 'Administrator',
    hospital_staff: 'Hospital Staff',
    ambulance_driver: 'Ambulance Driver',
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">🚑</div>
        <div className="logo-text">
          <span className="logo-title">AMT</span>
          <span className="logo-sub">Smart Tracking</span>
        </div>
      </div>

      {/* Connection Status */}
      <div className="sidebar-status">
        <span className={`pulse-dot ${connected ? 'green' : 'red'}`} />
        <span className="status-text">{connected ? 'Live Connected' : 'Offline'}</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {items.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info */}
      <div className="sidebar-user">
        <div className="user-avatar" style={{ background: roleColors[user?.role] }}>
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="user-info">
          <span className="user-name">{user?.name}</span>
          <span className="user-role">{roleLabels[user?.role]}</span>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Logout">
          ⏻
        </button>
      </div>
    </aside>
  );
}
