import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import CandidateProfilePage from './pages/candidate/CandidateProfilePage';
import ResumeManagementPage from './pages/candidate/ResumeManagementPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUserManagementPage from './pages/admin/AdminUserManagementPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminMasterDataPage from './pages/admin/AdminMasterDataPage';
import AdminCompanyVerificationQueuePage from './pages/admin/AdminCompanyVerificationQueuePage';
import AdminCompanyVerificationDetailPage from './pages/admin/AdminCompanyVerificationDetailPage';
import AdminComingSoonPage from './pages/admin/AdminComingSoonPage';
import AdminRoute from './components/admin/AdminRoute';
import ProtectedRoute from './components/routes/ProtectedRoute';
import GuestRoute from './components/routes/GuestRoute';
import BrowseCompaniesPage from './pages/candidate/BrowseCompaniesPage';
import PublicCompanyProfilePage from './pages/candidate/PublicCompanyProfilePage';
import RecruiterCompanyProfilePage from './pages/recruiter/RecruiterCompanyProfilePage';
import EditCompanyProfilePage from './pages/recruiter/EditCompanyProfilePage';
import CompanyVerificationPage from './pages/recruiter/CompanyVerificationPage';
import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Public Landing & Company Directory Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/companies" element={<BrowseCompaniesPage />} />
        <Route path="/companies/:id" element={<PublicCompanyProfilePage />} />

        {/* Guest Routes (Prevent access if already logged in) */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
        </Route>

        {/* Protected Candidate & Recruiter Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/candidate/profile" element={<CandidateProfilePage />} />
          <Route path="/candidate/resumes" element={<ResumeManagementPage />} />
          <Route path="/candidate/applications" element={<Navigate to="/dashboard" replace />} />
          <Route path="/candidate/saved-jobs" element={<Navigate to="/dashboard" replace />} />

          {/* Recruiter Company Management & Verification */}
          <Route path="/recruiter/company/profile" element={<RecruiterCompanyProfilePage />} />
          <Route path="/recruiter/company/edit" element={<EditCompanyProfilePage />} />
          <Route path="/recruiter/company/verify" element={<CompanyVerificationPage />} />
        </Route>

        {/* Super Admin Portal Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUserManagementPage />} />
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/master-data" element={<AdminMasterDataPage />} />
          <Route path="/admin/companies" element={<AdminCompanyVerificationQueuePage />} />
          <Route path="/admin/companies/:id" element={<AdminCompanyVerificationDetailPage />} />
          <Route path="/admin/jobs" element={<AdminComingSoonPage />} />
          <Route path="/admin/subscriptions" element={<AdminComingSoonPage />} />
          <Route path="/admin/payments" element={<AdminComingSoonPage />} />
          <Route path="/admin/reports" element={<AdminComingSoonPage />} />
          <Route path="/admin/analytics" element={<AdminComingSoonPage />} />
          <Route path="/admin/audit-log" element={<AdminComingSoonPage />} />
          <Route path="/admin/notifications" element={<AdminComingSoonPage />} />
          <Route path="/admin/settings" element={<AdminComingSoonPage />} />
          <Route path="/admin/help" element={<AdminComingSoonPage />} />
          <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
