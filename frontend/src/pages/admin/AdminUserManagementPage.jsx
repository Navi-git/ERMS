import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Briefcase,
  Shield,
  Ban,
  Search,
  Plus,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import adminApi from '../../api/adminApi';

export default function AdminUserManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    count: 0,
    total_pages: 1,
    current_page: 1,
    stats: { total_users: 0, candidates: 0, recruiters: 0, admins: 0, suspended: 0 },
    results: [],
  });

  // Query params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Action states & Modals
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [suspendModalUser, setSuspendModalUser] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [suspendError, setSuspendError] = useState('');

  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let role = roleFilter;
      let status = statusFilter;

      // Handle tab presets
      if (activeTab === 'candidates') role = 'candidate';
      else if (activeTab === 'recruiters') role = 'recruiter';
      else if (activeTab === 'admins') role = 'super_admin';
      else if (activeTab === 'suspended') status = 'suspended';

      const response = await adminApi.getUsers({
        search: search.trim() || undefined,
        role: role !== 'all' ? role : undefined,
        status: status !== 'all' ? status : undefined,
        page,
        page_size: 10,
      });
      setData(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [search, activeTab, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search handling
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    if (tab === 'all') {
      setRoleFilter('all');
      setStatusFilter('all');
    }
  };

  // Suspend action
  const handleOpenSuspend = (user) => {
    setActionMenuOpenId(null);
    setSuspendModalUser(user);
    setSuspendReason('');
    setSuspendError('');
  };

  const handleConfirmSuspend = async (e) => {
    e.preventDefault();
    if (!suspendReason.trim() || suspendReason.trim().length < 3) {
      setSuspendError('Please provide a reason (minimum 3 characters).');
      return;
    }
    setSuspendLoading(true);
    setSuspendError('');
    try {
      await adminApi.suspendUser(suspendModalUser.id, suspendReason.trim());
      setFeedbackMsg({ type: 'success', text: `Account ${suspendModalUser.email} has been suspended.` });
      setSuspendModalUser(null);
      fetchUsers();
    } catch (err) {
      setSuspendError(err.response?.data?.message || err.response?.data?.error || 'Failed to suspend user.');
    } finally {
      setSuspendLoading(false);
    }
  };

  // Reactivate action
  const handleReactivate = async (user) => {
    setActionMenuOpenId(null);
    try {
      await adminApi.reactivateUser(user.id);
      setFeedbackMsg({ type: 'success', text: `Account ${user.email} reactivated.` });
      fetchUsers();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to reactivate user.' });
    }
  };

  // Soft delete action
  const handleDelete = async (user) => {
    setActionMenuOpenId(null);
    if (!window.confirm(`Are you sure you want to deactivate ${user.email}?`)) return;
    try {
      await adminApi.deleteUser(user.id);
      setFeedbackMsg({ type: 'success', text: `Account ${user.email} deactivated.` });
      fetchUsers();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to deactivate user.' });
    }
  };

  // Restore action
  const handleRestore = async (user) => {
    setActionMenuOpenId(null);
    try {
      await adminApi.restoreUser(user.id);
      setFeedbackMsg({ type: 'success', text: `Account ${user.email} restored.` });
      fetchUsers();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to restore user.' });
    }
  };

  // Create admin
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (adminForm.password !== adminForm.confirmPassword) {
      setAdminError('Passwords do not match.');
      return;
    }
    setAdminLoading(true);
    setAdminError('');
    try {
      await adminApi.createAdmin({
        full_name: adminForm.fullName,
        email: adminForm.email,
        password: adminForm.password,
      });
      setFeedbackMsg({ type: 'success', text: `Super Administrator ${adminForm.email} created!` });
      setAddAdminModalOpen(false);
      setAdminForm({ fullName: '', email: '', password: '', confirmPassword: '' });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.password
        ? err.response.data.password.join(' ')
        : err.response?.data?.message || err.response?.data?.email || 'Failed to create admin.';
      setAdminError(msg);
    } finally {
      setAdminLoading(false);
    }
  };

  // Status badge styling
  const renderStatusBadge = (user) => {
    if (user.is_suspended) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Suspended
        </span>
      );
    }
    if (!user.is_active) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          Deactivated
        </span>
      );
    }
    if (!user.is_email_verified) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  };

  // Role badge styling
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-[#eef4ff] text-[#0058be] border border-[#d0e1fd]">
            Super Admin
          </span>
        );
      case 'recruiter':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            Recruiter
          </span>
        );
      case 'candidate':
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-sky-50 text-sky-700 border border-sky-200">
            Candidate
          </span>
        );
    }
  };

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
      <div className="space-y-6">
        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center justify-between ${
              feedbackMsg.type === 'success'
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

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#191c1e]">User Management</h1>
            <p className="text-sm text-[#717680] mt-0.5">Manage access, roles, and status for all platform members.</p>
          </div>

          <button
            onClick={() => setAddAdminModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0058be] hover:bg-[#0047a0] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Super Admin</span>
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Users */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0058be] flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#717680] uppercase tracking-wider">TOTAL USERS</span>
              <p className="text-2xl font-bold text-[#191c1e] mt-0.5">{data.stats.total_users.toLocaleString()}</p>
            </div>
          </div>

          {/* Candidates */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#717680] uppercase tracking-wider">CANDIDATES</span>
              <p className="text-2xl font-bold text-[#191c1e] mt-0.5">{data.stats.candidates.toLocaleString()}</p>
            </div>
          </div>

          {/* Recruiters */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#717680] uppercase tracking-wider">RECRUITERS</span>
              <p className="text-2xl font-bold text-[#191c1e] mt-0.5">{data.stats.recruiters.toLocaleString()}</p>
            </div>
          </div>

          {/* Admins & Suspended dual card */}
          <div className="bg-white p-5 rounded-xl border border-[#e5e8ec] shadow-2xs flex flex-col justify-center gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-[#45464d]">
                <Shield className="w-3.5 h-3.5 text-[#0058be]" /> Admins
              </span>
              <span className="font-bold text-[#191c1e]">{data.stats.admins}</span>
            </div>
            <div className="border-t border-[#f0f2f5] pt-2 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-rose-600">
                <Ban className="w-3.5 h-3.5 text-rose-600" /> Suspended
              </span>
              <span className="font-bold text-rose-600">{data.stats.suspended}</span>
            </div>
          </div>
        </div>

        {/* Main Users Table Section */}
        <div className="bg-white rounded-xl border border-[#e5e8ec] shadow-2xs overflow-hidden">
          {/* Filter Tabs */}
          <div className="border-b border-[#e5e8ec] px-6 flex items-center gap-6 overflow-x-auto">
            {[
              { id: 'all', label: 'All Users' },
              { id: 'candidates', label: 'Candidates' },
              { id: 'recruiters', label: 'Recruiters' },
              { id: 'admins', label: 'Admins' },
              { id: 'suspended', label: 'Blocked/Suspended' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-[#0058be] text-[#0058be]'
                    : 'border-transparent text-[#717680] hover:text-[#191c1e]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Secondary Filters Bar */}
          <div className="p-4 border-b border-[#f0f2f5] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#fafbfc]">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-[#8a8d94] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be] text-[#191c1e]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 text-xs bg-white border border-[#e5e8ec] rounded-lg text-[#45464d] focus:outline-none focus:border-[#0058be]"
              >
                <option value="all">Role: All</option>
                <option value="candidate">Candidate</option>
                <option value="recruiter">Recruiter</option>
                <option value="super_admin">Super Admin</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 text-xs bg-white border border-[#e5e8ec] rounded-lg text-[#45464d] focus:outline-none focus:border-[#0058be]"
              >
                <option value="all">Status: All</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="deleted">Deactivated</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f9fb] border-b border-[#e5e8ec] text-[11px] font-bold text-[#717680] uppercase tracking-wider">
                  <th className="py-3 px-6">USER</th>
                  <th className="py-3 px-6">ROLE</th>
                  <th className="py-3 px-6">STATUS</th>
                  <th className="py-3 px-6">JOINED</th>
                  <th className="py-3 px-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f5] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#717680]">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#0058be]" />
                        <span>Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.results.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#717680]">
                      No users found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  data.results.map((u) => (
                    <tr key={u.id} className="hover:bg-[#fafbfc] transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#191c1e] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {u.profile_picture_url ? (
                              <img
                                src={u.profile_picture_url}
                                alt={u.full_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span>{getInitials(u.full_name)}</span>
                            )}
                          </div>
                          <div>
                            <button
                              onClick={() => navigate(`/admin/users/${u.id}`)}
                              className="font-bold text-[#191c1e] hover:text-[#0058be] text-left transition-colors cursor-pointer"
                            >
                              {u.full_name || 'Unnamed User'}
                            </button>
                            <div className="text-[11px] text-[#717680]">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-6">{renderRoleBadge(u.role)}</td>

                      <td className="py-3.5 px-6">{renderStatusBadge(u)}</td>

                      <td className="py-3.5 px-6 text-[#717680]">
                        {new Date(u.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-6 text-right relative">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#0058be] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          >
                            View
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setActionMenuOpenId(actionMenuOpenId === u.id ? null : u.id)}
                              className="p-1 text-[#717680] hover:text-[#191c1e] rounded hover:bg-[#f2f4f7] cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {actionMenuOpenId === u.id && (
                              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-[#e5e8ec] py-1 z-30 text-left">
                                <button
                                  onClick={() => navigate(`/admin/users/${u.id}`)}
                                  className="w-full px-4 py-2 text-xs text-[#191c1e] hover:bg-[#f4f6f8] flex items-center gap-2 cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                                  <span>View Details</span>
                                </button>

                                {u.role !== 'super_admin' && (
                                  <>
                                    {u.is_suspended ? (
                                      <button
                                        onClick={() => handleReactivate(u)}
                                        className="w-full px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Reactivate User</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenSuspend(u)}
                                        className="w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Suspend User</span>
                                      </button>
                                    )}

                                    {u.is_active ? (
                                      <button
                                        onClick={() => handleDelete(u)}
                                        className="w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Deactivate User</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleRestore(u)}
                                        className="w-full px-4 py-2 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Restore Account</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-[#e5e8ec] flex items-center justify-between text-xs text-[#717680] bg-[#fafbfc]">
            <div>
              Showing {data.results.length === 0 ? 0 : (page - 1) * 10 + 1} to{' '}
              {Math.min(page * 10, data.count)} of {data.count} users
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#e5e8ec] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-[#191c1e]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-[#191c1e]">
                {page} / {Math.max(1, data.total_pages)}
              </span>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                className="p-1.5 rounded-lg border border-[#e5e8ec] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-[#191c1e]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Suspend Modal */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Suspend User Account</span>
              </div>
              <button onClick={() => setSuspendModalUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#717680]">
              You are about to suspend <strong>{suspendModalUser.email}</strong>. This will revoke all active sessions
              and prevent them from logging in.
            </p>

            {suspendError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {suspendError}
              </div>
            )}

            <form onSubmit={handleConfirmSuspend} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">
                  Reason for Suspension <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Terms of Service violation, spamming, fraudulent credentials..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full p-3 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-rose-500 text-[#191c1e]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSuspendModalUser(null)}
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
                  <span>Confirm Suspension</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Super Admin Modal */}
      {addAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#0058be] font-bold text-base">
                <Shield className="w-5 h-5" />
                <span>Add Super Administrator</span>
              </div>
              <button onClick={() => setAddAdminModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {adminError}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={adminForm.fullName}
                  onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="admin@talentbridge.com"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminForm.confirmPassword}
                  onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddAdminModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0058be] hover:bg-[#0047a0] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {adminLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Administrator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

