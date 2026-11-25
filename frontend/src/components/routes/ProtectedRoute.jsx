import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute() {
  const { user, accessToken } = useSelector((state) => state.auth);
  const token = accessToken || localStorage.getItem('erms_access_token');
  const storedUser = user || (localStorage.getItem('erms_user') ? JSON.parse(localStorage.getItem('erms_user')) : null);

  // Not logged in -> send to user login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin should not be accessing candidate / recruiter portal -> send to admin portal
  if (storedUser?.role === 'super_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}
