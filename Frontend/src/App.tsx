import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme } from './theme';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Shell from './components/layout/Shell';
import NGOAdminDashboard from './pages/admin/NGOAdminDashboard';
import ReporterPage from './pages/reporter/ReporterPage';
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';
import GovernmentDashboard from './pages/government/GovernmentDashboard';
import HeatmapPage from './pages/heatmap/HeatmapPage';
import PlaceholderPage from './pages/PlaceholderPage';
import { AuthProvider, useAuth } from './context/AuthContext';


function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) return null; // Or a loading spinner

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      
      {/* Protected Routes Wrapper */}
      <Route path="/dashboard" element={
        user ? (
          <Shell role={role}>
            {role === 'NGO_ADMIN' && <NGOAdminDashboard />}
            {role === 'VOLUNTEER' && <VolunteerDashboard />}
            {role === 'REPORTER' && <Navigate to="/report" />}
            {role === 'GOVERNMENT' && <GovernmentDashboard />}
            {role === 'SUPER_ADMIN' && <NGOAdminDashboard />} {/* Demo fallback */}
          </Shell>
        ) : (
          <Navigate to="/login" />
        )
      } />

      <Route path="/report" element={<ReporterPage />} />
      
      {/* Shared shell routes */}
      <Route path="/heatmap" element={user ? <Shell role={role}><HeatmapPage /></Shell> : <Navigate to="/login" />} />
      <Route path="/volunteers" element={user ? <Shell role={role}><NGOAdminDashboard /></Shell> : <Navigate to="/login" />} />
      <Route path="/cases" element={user ? <Shell role={role}><NGOAdminDashboard /></Shell> : <Navigate to="/login" />} />
      <Route path="/analytics" element={user ? <Shell role={role}><GovernmentDashboard /></Shell> : <Navigate to="/login" />} />
      
      {/* Placeholder Routes for Sidebar Links */}
      <Route path="/teams" element={user ? <Shell role={role}><PlaceholderPage title="Teams & Units" /></Shell> : <Navigate to="/login" />} />
      <Route path="/settings" element={user ? <Shell role={role}><PlaceholderPage title="System Settings" /></Shell> : <Navigate to="/login" />} />
      <Route path="/tasks" element={user ? <Shell role={role}><PlaceholderPage title="Task Management" /></Shell> : <Navigate to="/login" />} />
      <Route path="/inventory" element={user ? <Shell role={role}><PlaceholderPage title="Inventory Network" /></Shell> : <Navigate to="/login" />} />
      <Route path="/policy" element={user ? <Shell role={role}><PlaceholderPage title="Policy Directives" /></Shell> : <Navigate to="/login" />} />
      <Route path="/reports" element={user ? <Shell role={role}><PlaceholderPage title="Global Reports" /></Shell> : <Navigate to="/login" />} />
      <Route path="/my-reports" element={user ? <Shell role={role}><PlaceholderPage title="My Submissions" /></Shell> : <Navigate to="/login" />} />
      <Route path="/users" element={user ? <Shell role={role}><PlaceholderPage title="User Registry" /></Shell> : <Navigate to="/login" />} />
      <Route path="/logs" element={user ? <Shell role={role}><PlaceholderPage title="System Logs" /></Shell> : <Navigate to="/login" />} />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      const config = {
        apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId:             import.meta.env.VITE_FIREBASE_APP_ID,
      };
      
      const queryParams = new URLSearchParams(config as any).toString();
      
      navigator.serviceWorker
        .register(`/firebase-messaging-sw.js?${queryParams}`)
        .then((reg) => console.log('[SW] Registered with dynamic config', reg.scope))
        .catch((err) => console.error('[SW] Registration failed', err));
    }
  }, []);

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
