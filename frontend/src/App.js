import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SurveyForm from './components/SurveyForm';
import ImportPage from './components/ImportPage';
import PublicSurveyPage from './components/PublicSurveyPage';
import LoginPage from './components/LoginPage';
import AuditorPage from './components/AuditorPage';
import ManagerDashboard from './components/ManagerDashboard';
import ManageUsersPage from './components/ManageUsersPage';
import ProfilePage from './components/ProfilePage';
import LegacyImportPage from './components/LegacyImportPage';
import AdminPage from './components/AdminPage';
import NotFound from './components/NotFound';
import './App.css';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
};

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'manager') return <Navigate to="/manager" replace />;
  return <Navigate to="/auditor" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/fill-survey" element={<PublicSurveyPage />} />
          <Route path="/survey/:token" element={<PublicSurveyPage />} />

          {/* Role-based routes */}
          <Route path="/auditor" element={<ProtectedRoute roles={['auditor']}><AuditorPage /></ProtectedRoute>} />
          <Route path="/manager" element={<ProtectedRoute roles={['manager', 'admin']}><ManagerDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><ManageUsersPage /></ProtectedRoute>} />
          <Route path="/admin/import-legacy" element={<ProtectedRoute roles={['admin']}><LegacyImportPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute roles={['admin','manager','auditor']}><ProfilePage /></ProtectedRoute>} />

          {/* Root redirects based on auth/role */}
          <Route path="/" element={<RootRedirect />} />

          {/* Legacy layout routes (admin access only) */}
          <Route path="/legacy" element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="survey" element={<SurveyForm />} />
            <Route path="import" element={<ImportPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
