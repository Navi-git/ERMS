import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  User,
  Shield,
  Key,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Loader2,
  X,
  ArrowLeft,
  Lock,
  Phone,
  Mail,
} from 'lucide-react';
import userApi from '../api/userApi';
import authApi from '../api/authApi';
import { setUser, logout } from '../store/slices/authSlice';

export default function SettingsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: authUser } = useSelector((state) => state.auth);

  const fileInputRef = useRef(null);

  // Profile state
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  // Photo state
  const [photoUploading, setPhotoUploading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Linked logins
  const [identities, setIdentities] = useState([]);
  const [unlinkingId, setUnlinkingId] = useState(null);

  // Feedback notification
  const [feedback, setFeedback] = useState(null);

  // Load profile and linked accounts
  const loadData = async () => {
    setProfileLoading(true);
    try {
      const [profileRes, identitiesRes] = await Promise.all([
        userApi.getProfile(),
        userApi.getLinkedLogins(),
      ]);
      setProfile(profileRes.data);
      setFullName(profileRes.data.full_name || '');
      setPhone(profileRes.data.phone || '');
      setIdentities(identitiesRes.data || []);
      dispatch(setUser({ ...authUser, ...profileRes.data }));
    } catch (err) {
      console.error('Failed to load settings data:', err);
      setFeedback({ type: 'error', text: 'Failed to load profile settings.' });
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update profile handler
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setFeedback(null);
    try {
      const res = await userApi.updateProfile({ full_name: fullName, phone });
      setProfile(res.data);
      dispatch(setUser({ ...authUser, ...res.data }));
      setFeedback({ type: 'success', text: 'Personal information updated successfully.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update personal information.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // Upload photo handler
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'Photo must be smaller than 2 MB.' });
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    setPhotoUploading(true);
    setFeedback(null);
    try {
      const res = await userApi.uploadPhoto(formData);
      setProfile((prev) => ({ ...prev, profile_picture_url: res.data.profile_picture_url }));
      dispatch(setUser({ ...authUser, profile_picture_url: res.data.profile_picture_url }));
      setFeedback({ type: 'success', text: 'Profile photo updated!' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to upload photo.',
      });
    } finally {
      setPhotoUploading(false);
    }
  };

  // Delete photo handler
  const handleDeletePhoto = async () => {
    if (!window.confirm('Remove profile photo?')) return;
    setPhotoUploading(true);
    try {
      await userApi.deletePhoto();
      setProfile((prev) => ({ ...prev, profile_picture_url: null }));
      dispatch(setUser({ ...authUser, profile_picture_url: null }));
      setFeedback({ type: 'success', text: 'Profile photo removed.' });
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to remove photo.' });
    } finally {
      setPhotoUploading(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await userApi.changePassword({
        current_password: currentPassword || undefined,
        new_password: newPassword,
      });

      alert('Password updated successfully! All active sessions have been logged out. Please log in again.');
      dispatch(logout());
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.new_password
        ? err.response.data.new_password.join(' ')
        : err.response?.data?.message || 'Failed to update password.';
      setPasswordError(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  // Unlink Google account handler
  const handleUnlink = async (id) => {
    if (!window.confirm('Are you sure you want to disconnect this Google account?')) return;
    setUnlinkingId(id);
    try {
      await userApi.unlinkLogin(id);
      setIdentities((prev) => prev.filter((i) => i.id !== id));
      setFeedback({ type: 'success', text: 'Google account disconnected successfully.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to disconnect account.',
      });
    } finally {
      setUnlinkingId(null);
    }
  };

  // Password rules validation
  const rules = [
    { label: 'At least 8 characters', valid: newPassword.length >= 8 },
    { label: 'At least one uppercase letter', valid: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter', valid: /[a-z]/.test(newPassword) },
    { label: 'At least one number', valid: /[0-9]/.test(newPassword) },
    { label: 'At least one special character', valid: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0058be]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col text-[#191c1e]">
      {/* Top Navbar */}
      <header className="bg-white border-b border-[#e5e8ec] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0058be] text-white flex items-center justify-center font-bold text-sm">
              <span>TB</span>
            </div>
            <span className="font-extrabold text-lg tracking-tight text-[#191c1e]">
              Talent<span className="text-[#0058be]">Bridge</span>
            </span>
          </Link>

          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#717680] hover:text-[#191c1e] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#191c1e]">Account Settings</h1>
          <p className="text-sm text-[#717680] mt-0.5">Manage your personal information and security preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (5 cols): Profile & Personal Information */}
          <div className="lg:col-span-5 space-y-6">
            {/* Profile Avatar Card */}
            <div className="bg-white rounded-2xl border border-[#e5e8ec] p-6 shadow-2xs space-y-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-[#0058be] text-white flex items-center justify-center font-extrabold text-2xl shadow-sm border-2 border-white overflow-hidden">
                    {profile?.profile_picture_url ? (
                      <img
                        src={profile.profile_picture_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(profile?.full_name)}</span>
                    )}
                  </div>
                  {photoUploading && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-base text-[#191c1e]">{profile?.full_name || 'Unnamed User'}</h3>
                  <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-[#eef4ff] text-[#0058be] uppercase tracking-wider">
                    {profile?.role}
                  </span>
                </div>
              </div>

              {/* Photo Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#f0f2f5]">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={photoUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f4f6f8] hover:bg-[#e9ecf0] text-xs font-semibold text-[#191c1e] rounded-lg transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-[#0058be]" />
                  <span>Change Photo</span>
                </button>

                {profile?.profile_picture_url && (
                  <button
                    type="button"
                    disabled={photoUploading}
                    onClick={handleDeletePhoto}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#717680]">JPG, PNG, or WebP. Max 2 MB.</p>
            </div>

            {/* Personal Information Card */}
            <form onSubmit={handleUpdateProfile} className="bg-white rounded-2xl border border-[#e5e8ec] p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm text-[#191c1e]">
                <User className="w-4 h-4 text-[#0058be]" />
                <span>Personal Information</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#191c1e]">Email Address</label>
                  <span className="text-[10px] text-[#717680] flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Read-only
                  </span>
                </div>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg bg-[#f8f9fb] text-[#717680] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full py-2.5 bg-[#0058be] hover:bg-[#0047a0] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {profileSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Personal Information</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column (7 cols): Security & Connected Accounts */}
          <div className="lg:col-span-7 space-y-6">
            {/* Change Password Card */}
            <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-[#e5e8ec] p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm text-[#191c1e]">
                <Key className="w-4 h-4 text-[#0058be]" />
                <span>Security & Password</span>
              </div>

              <p className="text-xs text-[#717680]">
                {profile?.has_password
                  ? 'Update your password to keep your account secure.'
                  : 'You currently log in via Google. Set a password below to also enable email & password login.'}
              </p>

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {passwordError}
                </div>
              )}

              {/* Current Password (if user already has a usable password) */}
              {profile?.has_password && (
                <div>
                  <label className="block text-xs font-bold text-[#191c1e] mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      required
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    required
                    placeholder="Create a new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Checklist */}
              {newPassword.length > 0 && (
                <div className="p-3 bg-[#f8f9fb] rounded-xl border border-[#e5e8ec] space-y-1.5">
                  <div className="text-[11px] font-bold text-[#717680] uppercase tracking-wider mb-1">
                    Password Requirements:
                  </div>
                  {rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className={`text-xs flex items-center gap-2 ${
                        rule.valid ? 'text-emerald-600 font-medium' : 'text-gray-400'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${rule.valid ? 'text-emerald-500' : 'text-gray-300'}`} />
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="w-full py-2.5 bg-[#0058be] hover:bg-[#0047a0] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {passwordSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{profile?.has_password ? 'Update Password' : 'Set Password'}</span>
                </button>
              </div>
            </form>

            {/* Connected Logins / OAuth Card */}
            <div className="bg-white rounded-2xl border border-[#e5e8ec] p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm text-[#191c1e]">
                <LinkIcon className="w-4 h-4 text-[#0058be]" />
                <span>Connected Accounts</span>
              </div>

              <p className="text-xs text-[#717680]">
                Manage third-party login providers linked to this TalentBridge account.
              </p>

              {identities.length > 0 ? (
                <div className="space-y-3">
                  {identities.map((identity) => (
                    <div
                      key={identity.id}
                      className="p-3.5 bg-[#f8f9fb] border border-[#e5e8ec] rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-sm text-red-500 shadow-2xs">
                          G
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#191c1e] capitalize">{identity.provider}</div>
                          <div className="text-[11px] text-[#717680]">
                            {identity.provider_email || profile?.email}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnlink(identity.id)}
                        disabled={unlinkingId === identity.id}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        {unlinkingId === identity.id ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-[#f8f9fb] rounded-xl border border-[#e5e8ec] text-xs text-[#717680] text-center">
                  No third-party login accounts connected.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

