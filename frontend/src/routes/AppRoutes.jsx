import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Attendance from '../pages/Attendance';
import Schedule from '../pages/Schedule';
import Salary from '../pages/Salary';
import MainLayout from '../layouts/MainLayout';

// PrivateRoute wrapper component
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('auth_token');
  return isAuthenticated ? (
    <MainLayout>{children}</MainLayout>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Private Routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <PrivateRoute>
            <Attendance />
          </PrivateRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <PrivateRoute>
            <Schedule />
          </PrivateRoute>
        }
      />
      <Route
        path="/salary"
        element={
          <PrivateRoute>
            <Salary />
          </PrivateRoute>
        }
      />

      {/* Fallback routing */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
