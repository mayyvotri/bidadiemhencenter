import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import AttendanceRequest from '../pages/AttendanceRequest';
import AttendanceRequestHistory from '../pages/AttendanceRequestHistory';
import AttendanceApproval from '../pages/AttendanceApproval';
import Schedule from '../pages/Schedule';
import Payroll from '../pages/Payroll';
import StaffList from '../pages/StaffList';
import StaffManagement from '../pages/StaffManagement';
import Tasks from '../pages/Tasks';
import TaskManagement from '../pages/TaskManagement';
import Settings from '../pages/Settings';
import SystemAdmin from '../pages/SystemAdmin';
import MainLayout from '../layouts/MainLayout';
import ChangePassword from '../pages/ChangePassword';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import AccountApproval from '../pages/AccountApproval';
import Notifications from '../pages/Notifications';
import Reports from '../pages/Reports';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div>Đang tải...</div>;
  return isAuthenticated ? (
    <MainLayout>{children}</MainLayout>
  ) : (
    <Navigate to="/login" replace />
  );
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <div>Đang tải...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <MainLayout>{children}</MainLayout>;
};

const ManagerRoute = ({ children }) => {
  const { isAuthenticated, isManager, loading } = useAuth();
  if (loading) return <div>Đang tải...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isManager) return <Navigate to="/dashboard" replace />;
  return <MainLayout>{children}</MainLayout>;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div>Đang tải...</div>;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

const ChangePasswordRoute = ({ children }) => {
  const { isAuthenticated, mustChangePassword, loading } = useAuth();
  if (loading) return <div>Đang tải...</div>;
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
      <Route path="/attendance" element={<PrivateRoute><AttendanceRequest /></PrivateRoute>} />
      <Route path="/attendance-history" element={<PrivateRoute><AttendanceRequestHistory /></PrivateRoute>} />
      <Route path="/schedule" element={<PrivateRoute><Schedule /></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

      <Route path="/staff-list" element={<AdminRoute><StaffList /></AdminRoute>} />
      <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
      <Route path="/system-admin" element={<AdminRoute><SystemAdmin /></AdminRoute>} />
      <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
      <Route path="/account-approval" element={<ManagerRoute><AccountApproval /></ManagerRoute>} />
      <Route path="/attendance-approval" element={<ManagerRoute><AttendanceApproval /></ManagerRoute>} />
      <Route path="/staff-management" element={<ManagerRoute><StaffManagement /></ManagerRoute>} />
      <Route path="/task-management" element={<ManagerRoute><TaskManagement /></ManagerRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
