import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function AdminRoute() {
  const { user, accessToken } = useSelector((state) => state.auth);

  // If there's no access token or the user is not a super_admin, redirect to admin login
  if (!accessToken || user?.role !== 'super_admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

