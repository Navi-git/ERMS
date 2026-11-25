import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Shield, Lock, Mail, KeyRound, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import authApi from '../../api/authApi';
import { setCredentials } from '../../store/slices/authSlice';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const response = await authApi.adminLogin({
        email: email.trim().toLowerCase(),
        password,
      });

      const { access, refresh, user } = response.data;

      if (user.role !== 'super_admin') {
        setErrorMessage('Access denied. Administrator privileges required.');
        return;
      }

      dispatch(setCredentials({ access, refresh, user }));
      navigate('/admin/dashboard');
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        if (data.message) {
          setErrorMessage(data.message);
        } else if (data.detail) {
          setErrorMessage(data.detail);
        } else if (data.non_field_errors) {
          setErrorMessage(data.non_field_errors[0]);
        } else {
          setErrorMessage('Invalid administrator credentials.');
        }
      } else {
        setErrorMessage('Cannot reach server. Please verify backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Super Admin Login Card */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-[#e5e8ec] overflow-hidden">
        {/* Top Accent Stripe */}
        <div className="h-1.5 bg-gradient-to-r from-[#0058be] via-[#2563eb] to-[#3b82f6]" />

        <div className="p-8 sm:p-10">
          {/* Top Shield Badge */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-[#0058be] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <div className="relative">
                <Shield className="w-7 h-7 stroke-[2.2]" />
                <Lock className="w-3.5 h-3.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-white stroke-none" />
              </div>
            </div>
          </div>

          {/* Heading & Subtitle */}
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-[#191c1e]">
              Super Admin
            </h1>
            <p className="mt-1 text-xs text-[#5c5f66]">
              Access the TalentBridge master control panel.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-[#93000a] text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[#191c1e] mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-lg bg-[#f4f6f8] border border-[#e0e3e6] focus-within:border-[#0058be] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0058be]/10 transition-all">
                <Mail className="w-4 h-4 text-[#8a8d94] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="admin@talentbridge.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#191c1e] placeholder-[#9ca3af] focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-[#191c1e] mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg bg-[#f4f6f8] border border-[#e0e3e6] focus-within:border-[#0058be] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0058be]/10 transition-all">
                <KeyRound className="w-4 h-4 text-[#8a8d94] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent pl-10 pr-10 py-2.5 text-xs sm:text-sm text-[#191c1e] placeholder-[#9ca3af] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8d94] hover:text-[#191c1e] p-1 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security Disclaimer Notice */}
            <div className="bg-[#f4f6f8] border border-[#e5e8ec] rounded-lg p-3 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#717680] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-[#5c5f66]">
                This is a highly restricted area. All activities are logged and monitored.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#0058be] hover:bg-[#0047a0] active:bg-[#003982] text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer Security Badge */}
      <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#8a8d94]">
        <Shield className="w-3.5 h-3.5" />
        <span>TalentBridge Secure System v4.2.1</span>
      </div>
    </div>
  );
}

