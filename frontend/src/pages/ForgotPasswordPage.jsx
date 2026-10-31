import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import authApi from '../api/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await authApi.requestPasswordReset({ email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch (err) {
      if (err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else if (err.response?.data?.email) {
        const emailErr = err.response.data.email;
        setErrorMessage(Array.isArray(emailErr) ? emailErr[0] : emailErr);
      } else {
        setErrorMessage('Failed to send reset link. Please check the email and try again.');
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
          <Mail className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#191c1e]">
          Reset your password
        </h2>
        <p className="mt-1 text-sm text-[#45464d]">
          {submitted
            ? 'Password reset instructions have been sent.'
            : 'Enter your registered email and we will send you a reset link.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#e0e3e5] rounded-xl sm:px-10">
          
          {errorMessage && (
            <div className="mb-5 p-3 rounded-md bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-[#93000a] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!submitted ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be] text-[#191c1e]"
                />
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
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5 animate-fade-in text-center">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start gap-3 text-left">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800">Check your email</p>
                  <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                    If an account exists for <span className="font-medium text-emerald-900">{email}</span>, we have sent a secure password reset link. Please click the link in your email to set a new password.
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#76777d]">
                Didn't receive the email? Check your spam folder or wait a moment before trying again.
              </p>

              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs font-semibold text-[#0058be] hover:underline"
              >
                Try another email
              </button>
            </div>
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
