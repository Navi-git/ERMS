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
import { setUser, setCredentials, logout } from '../store/slices/authSlice';
import { resolvePhotoUrl } from '../utils/imageUrl';
import { useToast } from '../context/ToastContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: authUser } = useSelector((state) => state.auth);
  const { showToast } = useToast();

  const fileInputRef = useRef(null);

  // Profile state
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  // Field-level errors for personal info
  const [fullNameError, setFullNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Photo state
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Field-level errors for password
  const [currentPwError, setCurrentPwError] = useState('');
  const [newPwError, setNewPwError] = useState('');
  const [confirmPwError, setConfirmPwError] = useState('');

  // Linked logins
  const [identities, setIdentities] = useState([]);
  const [unlinkingId, setUnlinkingId] = useState(null);

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
      showToast('Failed to load profile settings.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update personal info handler
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setFullNameError('');
    setPhoneError('');

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setFullNameError('Full name is required.');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await userApi.updateProfile({ full_name: trimmedName, phone: phone.trim() });
      setProfile(res.data);
      dispatch(setUser({ ...authUser, ...res.data }));
      showToast('Personal information updated successfully.', 'success');
    } catch (err) {
      const data = err.response?.data;
      if (data?.full_name) {
        setFullNameError(Array.isArray(data.full_name) ? data.full_name[0] : data.full_name);
      } else if (data?.phone) {
        setPhoneError(Array.isArray(data.phone) ? data.phone[0] : data.phone);
      } else {
        showToast(data?.message || 'Failed to update personal information.', 'error');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  // Upload photo handler with immediate preview
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Photo must be smaller than 2 MB.', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP).', 'error');
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewPhoto(objectUrl);

    const formData = new FormData();
    formData.append('photo', file);

    setPhotoUploading(true);
    try {
      const res = await userApi.uploadPhoto(formData);
      setProfile((prev) => ({ ...prev, profile_picture_url: res.data.profile_picture_url }));
      dispatch(setUser({ ...authUser, profile_picture_url: res.data.profile_picture_url }));
      showToast('Profile photo updated successfully!', 'success');
    } catch (err) {
      setPreviewPhoto(null);
      showToast(err.response?.data?.message || 'Failed to upload photo.', 'error');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete photo handler
  const handleDeletePhoto = async () => {
    if (!window.confirm('Remove profile photo?')) return;
    setPhotoUploading(true);
    try {
      await userApi.deletePhoto();
      setPreviewPhoto(null);
      setProfile((prev) => ({ ...prev, profile_picture_url: null }));
      dispatch(setUser({ ...authUser, profile_picture_url: null }));
      showToast('Profile photo removed.', 'success');
    } catch (err) {
      showToast('Failed to remove photo.', 'error');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setCurrentPwError('');
    setNewPwError('');
    setConfirmPwError('');

    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    let hasClientError = false;

    if (profile?.has_password && !trimmedCurrent) {
      setCurrentPwError('Current password is required.');
      hasClientError = true;
    }

    if (!trimmedNew) {
      setNewPwError('New password is required.');
      hasClientError = true;
    } else if (trimmedNew.length < 8) {
      setNewPwError('Password must be at least 8 characters long.');
      hasClientError = true;
    }

    if (!trimmedConfirm) {
      setConfirmPwError('Please confirm your new password.');
      hasClientError = true;
    } else if (trimmedNew !== trimmedConfirm) {
      setConfirmPwError('New password and confirm password do not match.');
      hasClientError = true;
    }

    if (hasClientError) {
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await userApi.changePassword({
        current_password: trimmedCurrent || undefined,
        new_password: trimmedNew,
      });

      // Update Redux state and localStorage with the refreshed token pair
      if (res.data?.access && res.data?.refresh) {
        dispatch(
          setCredentials({
            access: res.data.access,
            refresh: res.data.refresh,
          })
        );
      }

      showToast('Password updated successfully! All other sessions have been logged out.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setProfile((prev) => ({ ...prev, has_password: true }));
    } catch (err) {
      const data = err.response?.data;
      const code = data?.code;
      const msg = data?.message;

      if (code === 'invalid_current_password' || code === 'current_password_required') {
        setCurrentPwError(msg || 'Current password is incorrect.');
      } else if (code === 'weak_password') {
        const errorText = Array.isArray(msg) ? msg.join(' ') : (msg || 'Password does not meet security requirements.');
        setNewPwError(errorText);
      } else if (data?.new_password) {
        const errorText = Array.isArray(data.new_password) ? data.new_password.join(' ') : data.new_password;
        setNewPwError(errorText);
      } else {
        const fallback = msg || 'Failed to update password. Please check your inputs.';
        showToast(fallback, 'error');
      }
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
      showToast('Google account disconnected successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to disconnect account.', 'error');
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

  const activeAvatarUrl = previewPhoto || resolvePhotoUrl(profile?.profile_picture_url);

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
                    {activeAvatarUrl ? (
                      <img
                        src={activeAvatarUrl}
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
                    {profile?.role?.replace('_', ' ')}
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
                  <span>{profile?.profile_picture_url || previewPhoto ? 'Change Photo' : 'Upload Photo'}</span>
                </button>

                {(profile?.profile_picture_url || previewPhoto) && (
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
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fullNameError) setFullNameError('');
                  }}
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none ${
                    fullNameError ? 'border-rose-400 focus:border-rose-500' : 'border-[#e5e8ec] focus:border-[#0058be]'
                  }`}
                />
                {fullNameError && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fullNameError}</span>
                  </p>
                )}
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
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none ${
                    phoneError ? 'border-rose-400 focus:border-rose-500' : 'border-[#e5e8ec] focus:border-[#0058be]'
                  }`}
                />
                {phoneError && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}
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
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (currentPwError) setCurrentPwError('');
                      }}
                      className={`w-full px-3 py-2 pr-10 text-xs border rounded-lg focus:outline-none ${
                        currentPwError ? 'border-rose-400 focus:border-rose-500' : 'border-[#e5e8ec] focus:border-[#0058be]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {currentPwError && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{currentPwError}</span>
                    </p>
                  )}
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
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (newPwError) setNewPwError('');
                    }}
                    className={`w-full px-3 py-2 pr-10 text-xs border rounded-lg focus:outline-none ${
                      newPwError ? 'border-rose-400 focus:border-rose-500' : 'border-[#e5e8ec] focus:border-[#0058be]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPwError && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{newPwError}</span>
                  </p>
                )}
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
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    required
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPwError) setConfirmPwError('');
                    }}
                    className={`w-full px-3 py-2 pr-10 text-xs border rounded-lg focus:outline-none ${
                      confirmPwError || (confirmPassword && newPassword !== confirmPassword)
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-[#e5e8ec] focus:border-[#0058be]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Live Real-time Confirm Password Matching Feedback */}
                {confirmPassword.length > 0 && (
                  <div
                    className={`mt-1 text-xs flex items-center gap-1.5 ${
                      newPassword === confirmPassword ? 'text-emerald-600 font-medium' : 'text-rose-600'
                    }`}
                  >
                    {newPassword === confirmPassword ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}

                {confirmPwError && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{confirmPwError}</span>
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving || (confirmPassword.length > 0 && newPassword !== confirmPassword)}
                  className="w-full py-2.5 bg-[#0058be] hover:bg-[#0047a0] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
