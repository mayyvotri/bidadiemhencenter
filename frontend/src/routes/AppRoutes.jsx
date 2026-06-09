import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Attendance from '../pages/Attendance';
import Schedule from '../pages/Schedule';
import Salary from '../pages/Salary';
import StaffList from '../pages/StaffList';
import Tasks from '../pages/Tasks';
import Inventory from '../pages/Inventory';
import Settings from '../pages/Settings';
import SystemAdmin from '../pages/SystemAdmin';
import MainLayout from '../layouts/MainLayout';
import ChangePassword from '../pages/ChangePassword';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import EmployeeManagement from '../pages/EmployeeManagement';
import AccountApproval from '../pages/AccountApproval';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return isAuthenticated ? (
    <MainLayout>{children}</MainLayout>
  ) : (
    <Navigate to="/login" replace />
  );
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  
  return <MainLayout>{children}</MainLayout>;
};

const ManagerRoute = ({ children }) => {
  const { isAuthenticated, isManager, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isManager) return <Navigate to="/dashboard" replace />;
  
  return <MainLayout>{children}</MainLayout>;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

const ChangePasswordRoute = ({ children }) => {
  const { isAuthenticated, mustChangePassword, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!mustChangePassword) return <Navigate to="/dashboard" replace />;
  
  return <MainLayout>{children}</MainLayout>;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

      <Route path="/change-password" element={<ChangePasswordRoute><ChangePassword /></ChangePasswordRoute>} />
      
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
      <Route path="/schedule" element={<PrivateRoute><Schedule /></PrivateRoute>} />
      <Route path="/salary" element={<PrivateRoute><Salary /></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />

      <Route path="/staff-list" element={<AdminRoute><StaffList /></AdminRoute>} />
      <Route path="/inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
      <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
      <Route path="/system-admin" element={<AdminRoute><SystemAdmin /></AdminRoute>} />
      <Route path="/employee-management" element={<AdminRoute><EmployeeManagement /></AdminRoute>} />
      <Route path="/account-approval" element={<ManagerRoute><AccountApproval /></ManagerRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
