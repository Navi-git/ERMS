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
import CandidateApplicationsPage from './pages/candidate/CandidateApplicationsPage';
import CandidateApplicationDetailPage from './pages/candidate/CandidateApplicationDetailPage';
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
import BrowseJobsPage from './pages/candidate/BrowseJobsPage';
import JobDetailPage from './pages/candidate/JobDetailPage';
import SavedJobsPage from './pages/candidate/SavedJobsPage';
import RecruiterCompanyProfilePage from './pages/recruiter/RecruiterCompanyProfilePage';
import EditCompanyProfilePage from './pages/recruiter/EditCompanyProfilePage';
import CompanyVerificationPage from './pages/recruiter/CompanyVerificationPage';
import RecruiterJobPostingsPage from './pages/recruiter/RecruiterJobPostingsPage';
import RecruiterCreateJobPage from './pages/recruiter/RecruiterCreateJobPage';
import RecruiterEditJobPage from './pages/recruiter/RecruiterEditJobPage';
import RecruiterJobOverviewPage from './pages/recruiter/RecruiterJobOverviewPage';
import RecruiterJobPipelinePage from './pages/recruiter/RecruiterJobPipelinePage';
import RecruiterAllApplicantsPage from './pages/recruiter/RecruiterAllApplicantsPage';
import RecruiterApplicationDetailPage from './pages/recruiter/RecruiterApplicationDetailPage';
import AdminJobsManagementPage from './pages/admin/AdminJobsManagementPage';
import AdminJobDetailPage from './pages/admin/AdminJobDetailPage';
import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Public Landing & Company Directory & Job Discovery */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/companies" element={<BrowseCompaniesPage />} />
        <Route path="/companies/:id" element={<PublicCompanyProfilePage />} />
        <Route path="/jobs" element={<BrowseJobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />

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
          {/* Candidate Applications */}
          <Route path="/candidate/applications" element={<CandidateApplicationsPage />} />
          <Route path="/candidate/applications/:id" element={<CandidateApplicationDetailPage />} />
          <Route path="/candidate/saved-jobs" element={<SavedJobsPage />} />

          {/* Recruiter Company Management & Verification */}
          <Route path="/recruiter/company/profile" element={<RecruiterCompanyProfilePage />} />
          <Route path="/recruiter/company/edit" element={<EditCompanyProfilePage />} />
          <Route path="/recruiter/company/verify" element={<CompanyVerificationPage />} />

          {/* Recruiter Jobs Lifecycle */}
          <Route path="/recruiter/jobs" element={<RecruiterJobPostingsPage />} />
          <Route path="/recruiter/jobs/new" element={<RecruiterCreateJobPage />} />
          <Route path="/recruiter/jobs/:id/edit" element={<RecruiterEditJobPage />} />
          <Route path="/recruiter/jobs/:id/overview" element={<RecruiterJobOverviewPage />} />
          <Route path="/recruiter/jobs/:id/pipeline" element={<RecruiterJobPipelinePage />} />

          {/* Recruiter Applications & Screening */}
          <Route path="/recruiter/applicants" element={<RecruiterAllApplicantsPage />} />
          <Route path="/recruiter/applications/:id" element={<RecruiterApplicationDetailPage />} />

          {/* Fallbacks for routes under development to keep users in their portal dashboard */}
          <Route path="/recruiter/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/candidate/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/help" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Super Admin Portal Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUserManagementPage />} />
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/master-data" element={<AdminMasterDataPage />} />
          <Route path="/admin/companies" element={<AdminCompanyVerificationQueuePage />} />
          <Route path="/admin/companies/:id" element={<AdminCompanyVerificationDetailPage />} />
          <Route path="/admin/jobs" element={<AdminJobsManagementPage />} />
          <Route path="/admin/jobs/:id" element={<AdminJobDetailPage />} />
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
