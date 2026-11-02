import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Building2,
  Shield,
  Key,
  Lock,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  RotateCcw,
  Trash2,
  Send,
  Loader2,
  X,
  Ban,
  User,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import adminApi from '../../api/adminApi';
import { resolvePhotoUrl } from '../../utils/imageUrl';
import { useToast } from '../../context/ToastContext';

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('account');
  const { showToast } = useToast();

  // Suspend modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);

  // Password reset state
  const [resetLoading, setResetLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getUserDetail(id);
      setUserData(response.data);
    } catch (err) {
      console.error('Failed to load user details:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to load user details.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleToggleSuspend = async () => {
    if (!userData) return;
    const isSuspended = !!userData.user.suspended_at;

    if (isSuspended) {
      // Reactivate
      try {
        await adminApi.reactivateUser(id);
        setFeedbackMsg({ type: 'success', text: 'User reactivated successfully.' });
        fetchDetail();
      } catch (err) {
        setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to reactivate user.' });
      }
    } else {
      // Open suspend reason modal
      setSuspendReason('');
      setSuspendModalOpen(true);
    }
  };

  const handleConfirmSuspend = async (e) => {
    e.preventDefault();
    if (!suspendReason.trim() || suspendReason.trim().length < 3) {
      alert('Please enter a reason with at least 3 characters.');
      return;
    }
    setSuspendLoading(true);
    try {
      await adminApi.suspendUser(id, suspendReason.trim());
      showToast('User suspended successfully.', 'success');
      setSuspendModalOpen(false);
      fetchDetail();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to suspend user.', 'error');
    } finally {
      setSuspendLoading(false);
    }
  };

  const handleDeleteOrRestore = async () => {
    if (!userData) return;
    const isActive = userData.user.is_active;

    if (isActive) {
      if (!window.confirm(`Are you sure you want to deactivate ${userData.user.email}?`)) return;
      try {
        await adminApi.deleteUser(id);
        showToast('User deactivated successfully.', 'success');
        fetchDetail();
      } catch (err) {
        showToast(err.response?.data?.message || 'Failed to deactivate user.', 'error');
      }
    } else {
      try {
        await adminApi.restoreUser(id);
        showToast('User restored successfully.', 'success');
        fetchDetail();
      } catch (err) {
        showToast(err.response?.data?.message || 'Failed to restore user.', 'error');
      }
    }
  };

  const handleSendPasswordReset = async () => {
    setResetLoading(true);
    try {
      await adminApi.sendPasswordReset(id);
      showToast(`Password reset link sent to ${userData.user.email}!`, 'success');
    } catch (err) {
      showToast('Failed to send password reset email.', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
        </div>
      </AdminLayout>
    );
  }

  if (!userData) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">User not found.</p>
          <Link to="/admin/users" className="text-[#0058be] text-xs font-semibold mt-2 inline-block">
            &larr; Back to User Management
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const { user, security, company, recent_activity } = userData;
  const isSuperAdmin = user.role === 'super_admin';
  const isSuspended = !!user.suspended_at;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#717680]">
          <Link to="/admin/users" className="hover:text-[#191c1e] transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>User Management</span>
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#191c1e]">User Details</span>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center justify-between ${feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-[#f0f2f5] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-white text-[#191c1e] flex items-center justify-center font-bold text-2xl shadow-sm border-2 border-white overflow-hidden">
                {user.profile_picture_url ? (
                  <img
                    src={resolvePhotoUrl(user.profile_picture_url)}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitials(user.full_name)}</span>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-[#191c1e]">{user.full_name || 'Unnamed User'}</h1>
                <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-[#191c1e] text-white">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#5f6368] mt-1.5 font-medium">
                <span>{user.email}</span>
                <span>&bull;</span>
                <span>
                  Joined{' '}
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons on banner */}
          {!isSuperAdmin && (
            <div className="flex items-center gap-4 self-end md:self-center">
              {/* Account Status Switch */}
              <div className="flex items-center gap-3 bg-white/80 px-4 py-2 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-xs font-bold text-[#191c1e]">ACCOUNT STATUS</span>
                <button
                  type="button"
                  onClick={handleToggleSuspend}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${!isSuspended ? 'bg-emerald-600' : 'bg-rose-500'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isSuspended ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
                <span className={`text-xs font-semibold ${!isSuspended ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {!isSuspended ? 'Active' : 'Suspended'}
                </span>
              </div>

              {/* Delete / Restore Button */}
              {user.is_active ? (
                <button
                  onClick={handleDeleteOrRestore}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete User</span>
                </button>
              ) : (
                <button
                  onClick={handleDeleteOrRestore}
                  className="px-4 py-2 bg-[#0058be] hover:bg-[#0047a0] text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore User</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-[#e5e8ec] flex items-center gap-8">
          <button
            onClick={() => setActiveTab('account')}
            className={`pb-3 text-xs font-bold tracking-tight border-b-2 transition-colors cursor-pointer ${activeTab === 'account'
                ? 'border-[#0058be] text-[#0058be]'
                : 'border-transparent text-[#717680] hover:text-[#191c1e]'
              }`}
          >
            Account Info
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 text-xs font-bold tracking-tight border-b-2 transition-colors cursor-pointer ${activeTab === 'activity'
                ? 'border-[#0058be] text-[#0058be]'
                : 'border-transparent text-[#717680] hover:text-[#191c1e]'
              }`}
          >
            Activity Log ({recent_activity?.length || 0})
          </button>
        </div>

        {/* Tab 1: Account Info Content */}
        {activeTab === 'account' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Personal Details & Company Affiliation */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Details Card */}
              <div className="bg-white rounded-xl border border-[#e5e8ec] p-6 shadow-2xs">
                <div className="flex items-center gap-2 mb-6 text-[#191c1e] font-bold text-sm">
                  <User className="w-4 h-4 text-[#0058be]" />
                  <span>Personal Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#717680] uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <div className="p-3 bg-[#f8f9fb] border border-[#e5e8ec] rounded-lg text-xs font-medium text-[#191c1e]">
                      {user.full_name || 'Not provided'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#717680] uppercase tracking-wider mb-1">
                      Role
                    </label>
                    <div className="p-3 bg-[#f8f9fb] border border-[#e5e8ec] rounded-lg text-xs font-medium text-[#191c1e]">
                      {user.role}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#717680] uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="p-3 bg-[#f8f9fb] border border-[#e5e8ec] rounded-lg text-xs font-medium text-[#191c1e] flex items-center justify-between">
                      <span>{user.email}</span>
                      {user.is_email_verified ? (
                        <span className="text-emerald-600 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#717680] uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <div className="p-3 bg-[#f8f9fb] border border-[#e5e8ec] rounded-lg text-xs font-medium text-[#191c1e]">
                      {user.phone || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Affiliation Card (if Recruiter) */}
              {user.role === 'recruiter' && (
                <div className="bg-white rounded-xl border border-[#e5e8ec] p-6 shadow-2xs">
                  <div className="flex items-center gap-2 mb-6 text-[#191c1e] font-bold text-sm">
                    <Building2 className="w-4 h-4 text-[#0058be]" />
                    <span>Company Affiliation</span>
                  </div>

                  {company ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-[#f8f9fb] rounded-xl border border-[#e5e8ec] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-[#191c1e]">{company.name}</div>
                            <div className="text-[11px] text-[#717680]">Company ID: #{company.id}</div>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {company.verification_status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#717680]">No company linked to this recruiter yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Right 1 col: Security & Activity preview */}
            <div className="space-y-6">
              {/* Security Card */}
              <div className="bg-white rounded-xl border border-[#e5e8ec] p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-2 text-[#191c1e] font-bold text-sm">
                  <Shield className="w-4 h-4 text-[#0058be]" />
                  <span>Security</span>
                </div>

                <p className="text-xs text-[#717680]">
                  Manage password reset and authentication status for this account.
                </p>

                {/* Send Password Reset Button */}
                <button
                  onClick={handleSendPasswordReset}
                  disabled={resetLoading}
                  className="w-full flex items-center justify-between p-3.5 bg-[#f8f9fb] hover:bg-[#f0f2f5] border border-[#e5e8ec] rounded-xl text-xs font-semibold text-[#191c1e] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#0058be]" />
                    <span>Send Password Reset Link</span>
                  </span>
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <Send className="w-3.5 h-3.5 text-gray-400" />}
                </button>

                {/* Security metrics */}
                <div className="space-y-3 pt-2 border-t border-[#f0f2f5] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#717680]">Password Last Changed:</span>
                    <span className="font-semibold text-[#191c1e]">
                      {security?.password_last_changed_at
                        ? new Date(security.password_last_changed_at).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#717680]">Failed Login Attempts:</span>
                    <span className="font-semibold text-[#191c1e]">
                      {security?.failed_login_count || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#717680]">Account Lockout:</span>
                    <span className={`font-semibold ${security?.locked_until ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {security?.locked_until ? `Locked until ${new Date(security.locked_until).toLocaleTimeString()}` : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-xl border border-[#e5e8ec] p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between text-[#191c1e] font-bold text-sm">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#0058be]" />
                    <span>Recent Activity</span>
                  </div>
                </div>

                {recent_activity && recent_activity.length > 0 ? (
                  <div className="space-y-3">
                    {recent_activity.slice(0, 5).map((log) => (
                      <div key={log.id} className="text-xs border-l-2 border-[#0058be] pl-3 py-1">
                        <div className="font-semibold text-[#191c1e]">
                          {log.action.replace('_', ' ')}
                        </div>
                        {log.details?.reason && (
                          <div className="text-[11px] text-rose-600">Reason: {log.details.reason}</div>
                        )}
                        <div className="text-[10px] text-[#717680]">
                          {new Date(log.created_at).toLocaleString()} &bull; IP: {log.ip_address || 'system'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#717680]">No recent administrative logs recorded.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Activity Log Full List */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-xl border border-[#e5e8ec] p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-[#191c1e] mb-4">Complete Audit Log for this User</h3>
            {recent_activity && recent_activity.length > 0 ? (
              <div className="divide-y divide-[#f0f2f5]">
                {recent_activity.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                    <div>
                      <span className="font-bold text-[#191c1e] uppercase tracking-wider text-[11px]">
                        {log.action}
                      </span>
                      {log.details?.reason && (
                        <span className="ml-2 text-rose-600 font-medium">({log.details.reason})</span>
                      )}
                      <div className="text-[11px] text-[#717680] mt-0.5">
                        Actor: {log.actor_type} &bull; IP: {log.ip_address || 'N/A'}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#717680] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#717680]">No logs recorded for this account.</p>
            )}
          </div>
        )}
      </div>

      {/* Suspend Modal */}
      {suspendModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Suspend User</span>
              </div>
              <button onClick={() => setSuspendModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#717680]">
              Please state the reason for suspending <strong>{user.email}</strong>. This reason will be logged in the
              audit system.
            </p>

            <form onSubmit={handleConfirmSuspend} className="space-y-4">
              <div>
                <textarea
                  rows={3}
                  required
                  placeholder="Reason for suspension..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full p-3 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSuspendModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={suspendLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {suspendLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Suspend Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

