import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastContainer } from './components/Toast';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import LiveMap from './pages/admin/LiveMap';
import FleetManagement from './pages/admin/FleetManagement';
import TrafficControl from './pages/admin/TrafficControl';
import Dispatch from './pages/admin/Dispatch';
import AdminAlerts from './pages/admin/AdminAlerts';

// Hospital pages
import HospitalDashboard from './pages/hospital/HospitalDashboard';

// Driver pages
import DriverDashboard from './pages/driver/DriverDashboard';

import './index.css';

function ProtectedLayout({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <span style={{ fontSize: '2.5rem' }}>🚑</span>
      <span className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'hospital_staff') return <Navigate to="/hospital" replace />;
  if (user.role === 'ambulance_driver') return <Navigate to="/driver" replace />;
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedLayout allowedRoles={['admin']}><AdminDashboard /></ProtectedLayout>} />
      <Route path="/admin/map" element={<ProtectedLayout allowedRoles={['admin']}><LiveMap /></ProtectedLayout>} />
      <Route path="/admin/fleet" element={<ProtectedLayout allowedRoles={['admin']}><FleetManagement /></ProtectedLayout>} />
      <Route path="/admin/traffic" element={<ProtectedLayout allowedRoles={['admin']}><TrafficControl /></ProtectedLayout>} />
      <Route path="/admin/dispatch" element={<ProtectedLayout allowedRoles={['admin']}><Dispatch /></ProtectedLayout>} />
      <Route path="/admin/alerts" element={<ProtectedLayout allowedRoles={['admin']}><AdminAlerts /></ProtectedLayout>} />

      {/* Hospital Routes */}
      <Route path="/hospital" element={<ProtectedLayout allowedRoles={['hospital_staff']}><HospitalDashboard /></ProtectedLayout>} />
      <Route path="/hospital/incoming" element={<ProtectedLayout allowedRoles={['hospital_staff']}><HospitalDashboard /></ProtectedLayout>} />
      <Route path="/hospital/map" element={<ProtectedLayout allowedRoles={['hospital_staff']}><LiveMap /></ProtectedLayout>} />

      {/* Driver Routes */}
      <Route path="/driver" element={<ProtectedLayout allowedRoles={['ambulance_driver']}><DriverDashboard /></ProtectedLayout>} />
      <Route path="/driver/tracking" element={<ProtectedLayout allowedRoles={['ambulance_driver']}><DriverDashboard /></ProtectedLayout>} />
      <Route path="/driver/trip" element={<ProtectedLayout allowedRoles={['ambulance_driver']}><DriverDashboard /></ProtectedLayout>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <ToastContainer />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
