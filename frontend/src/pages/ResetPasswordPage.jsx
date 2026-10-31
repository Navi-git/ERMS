import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import authApi from '../api/authApi';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const isLinkMissing = !uid || !token;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await authApi.confirmPasswordReset({
        uid,
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        if (data.message) {
          setErrorMessage(data.message);
        } else if (data.new_password) {
          const passErr = data.new_password;
          setErrorMessage(Array.isArray(passErr) ? passErr[0] : passErr);
        } else if (data.detail) {
          setErrorMessage(data.detail);
        } else {
          setErrorMessage('Failed to reset password. The link may have expired or is invalid.');
        }
      } else {
        setErrorMessage('Cannot reach server. Please verify the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 group mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#0058be] text-white flex items-center justify-center font-bold text-xl shadow-sm">
            <span>TB</span>
          </div>
          <span className="font-bold text-2xl tracking-tight text-[#191c1e]">
            Talent<span className="text-[#0058be]">Bridge</span>
          </span>
        </Link>
        <div className="w-12 h-12 rounded-full bg-[#d8e2ff] text-[#0058be] flex items-center justify-center mx-auto mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#191c1e]">
          Set a new password
        </h2>
        <p className="mt-1 text-sm text-[#45464d]">
          {success
            ? 'Your credentials have been securely updated.'
            : 'Please enter and confirm your new password below.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#e0e3e5] rounded-xl sm:px-10">
          
          {/* Missing Token Alert */}
          {isLinkMissing && !success && (
            <div className="mb-5 p-4 rounded-lg bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-[#93000a] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Invalid Password Reset Link</p>
                <p className="mt-1">
                  This reset link is incomplete or missing necessary verification tokens. Please request a new one.
                </p>
                <Link
                  to="/forgot-password"
                  className="mt-2 inline-block font-semibold text-[#0058be] hover:underline"
                >
                  Request a new reset link &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-md bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-[#93000a] text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Screen */}
          {success ? (
            <div className="space-y-5 animate-fade-in text-center">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start gap-3 text-left">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800">Password reset complete</p>
                  <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                    Your password has been changed successfully. Older sessions have been revoked. You can now log in with your new credentials.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 bg-[#0058be] hover:bg-[#0047a0] text-white font-semibold py-3 px-4 rounded-[4px] text-sm shadow-sm transition-all cursor-pointer"
              >
                <span>Sign In with New Password</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            !isLinkMissing && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be] text-[#191c1e] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#76777d] hover:text-[#191c1e] p-0.5 focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be] text-[#191c1e] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#76777d] hover:text-[#191c1e] p-0.5 focus:outline-none"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#0058be] hover:bg-[#0047a0] text-white font-semibold py-3 px-4 rounded-[4px] text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )
          )}

          <div className="mt-6 text-center border-t border-[#e0e3e5] pt-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#45464d] hover:text-[#0058be]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

