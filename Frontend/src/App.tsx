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
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
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
