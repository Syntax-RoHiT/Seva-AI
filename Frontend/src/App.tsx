import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme } from './theme';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AwaitingApprovalPage from './pages/AwaitingApprovalPage';
import Shell from './components/layout/Shell';
import NGOAdminDashboard from './pages/admin/NGOAdminDashboard';
import ReporterPage from './pages/reporter/ReporterPage';
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';
import HeatmapPage from './pages/heatmap/HeatmapPage';
import TeamsPage from './pages/admin/TeamsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import SettingsPage from './pages/admin/SettingsPage';
import PlaceholderPage from './pages/PlaceholderPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppRoutes() {
  const { user, role, approved, loading } = useAuth();

  if (loading) return (
    <div className="h-screen w-screen bg-gray-50 flex items-center justify-center font-sans">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Initializing...</p>
      </div>
    </div>
  );

  // If logged in but not approved → hold page
  const approvalGate = user && !approved && !user.isAnonymous
    ? <Navigate to="/awaiting-approval" />
    : null;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage initialTab="login" />} />
      <Route path="/signup" element={<AuthPage initialTab="signup" />} />
      <Route path="/awaiting-approval" element={<AwaitingApprovalPage />} />

      {/* Field Reporter — no login required */}
      <Route path="/report" element={<ReporterPage />} />

      {/* Protected Dashboard */}
      <Route path="/dashboard" element={
        !user ? <Navigate to="/login" /> :
        approvalGate ??
        <Shell role={role}>
          {role === 'NGO_ADMIN' && <NGOAdminDashboard />}
          {role === 'SUPER_ADMIN' && <NGOAdminDashboard />}
          {role === 'VOLUNTEER' && <VolunteerDashboard />}
        </Shell>
      } />

      {/* Shell routes */}
      <Route path="/heatmap" element={
        !user ? <Navigate to="/login" /> :
        approvalGate ??
        <Shell role={role}><HeatmapPage /></Shell>
      } />
      <Route path="/volunteers" element={
        !user ? <Navigate to="/login" /> :
        approvalGate ??
        <Shell role={role}><NGOAdminDashboard /></Shell>
      } />
      <Route path="/cases" element={
        !user ? <Navigate to="/login" /> :
        approvalGate ??
        <Shell role={role}><NGOAdminDashboard /></Shell>
      } />
      <Route path="/tasks" element={
        !user ? <Navigate to="/login" /> :
        approvalGate ??
        <Shell role={role}><PlaceholderPage title="Task Management" /></Shell>
      } />
      <Route path="/teams" element={
        !user ? <Navigate to="/login" /> :
        approvalGate ??
        <Shell role={role}><TeamsPage /></Shell>
      } />
      <Route path="/analytics" element={
        !user ? <Navigate to="/login" /> :
        approvalGate ??
        <Shell role={role}><AnalyticsPage /></Shell>
      } />
      <Route path="/settings" element={
        !user ? <Navigate to="/login" /> :
        approvalGate ??
        <Shell role={role}><SettingsPage /></Shell>
      } />
      <Route path="/users" element={
        !user ? <Navigate to="/login" /> :
        approvalGate ??
        <Shell role={role}><TeamsPage /></Shell>
      } />
      <Route path="/logs" element={
        !user ? <Navigate to="/login" /> :
        approvalGate ??
        <Shell role={role}><PlaceholderPage title="System Logs" /></Shell>
      } />

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
        .then(reg => console.log('[SW] Registered', reg.scope))
        .catch(err => console.error('[SW] Failed', err));
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
