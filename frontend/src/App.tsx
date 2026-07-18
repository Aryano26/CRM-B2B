import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Components & Layout
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SubmitCase from './pages/SubmitCase';
import Cases from './pages/Cases';
import Escalations from './pages/Escalations';
import Export from './pages/Export';
import AdminPartners from './pages/AdminPartners';
import Profile from './pages/Profile';

// Route protection guard for authenticated routes
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: ('PARTNER' | 'ADMIN')[] }> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-semibold">Authorizing Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Private routes inside Layout container */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route 
                  path="submit" 
                  element={
                    <ProtectedRoute allowedRoles={['PARTNER']}>
                      <SubmitCase />
                    </ProtectedRoute>
                  } 
                />
                <Route path="cases" element={<Cases />} />
                <Route path="escalations" element={<Escalations />} />
                <Route path="reports" element={<Export />} />
                <Route path="profile" element={<Profile />} />
                <Route 
                  path="admin/partners" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminPartners />
                    </ProtectedRoute>
                  } 
                />
              </Route>

              {/* Catch-all redirect to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
