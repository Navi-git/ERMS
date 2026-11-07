import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * GuestRoute prevents authenticated users from accessing login, registration,
 * and password recovery pages.
 * - Authenticated Super Admins are redirected to /admin/dashboard
 * - Authenticated Candidates and Recruiters are redirected to /dashboard
 */
export default function GuestRoute() {
  const { user, accessToken } = useSelector((state) => state.auth);
  const token = accessToken || localStorage.getItem('erms_access_token');

  let storedUser = user;
  if (!storedUser) {
    try {
      const raw = localStorage.getItem('erms_user');
      if (raw) storedUser = JSON.parse(raw);
    } catch {
      storedUser = null;
    }
  }

  if (token) {
    if (storedUser?.role === 'super_admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
