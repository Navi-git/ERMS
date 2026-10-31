import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff, Building2, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import authApi from '../api/authApi';
import { setCredentials } from '../store/slices/authSlice';

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'recruiter' ? 'recruiter' : 'candidate';

  const [role, setRole] = useState(initialRole);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyName: '',
    acceptTerms: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [socialNotice, setSocialNotice] = useState('');
  const googleBtnRef = useRef(null);

  useEffect(() => {
    const r = searchParams.get('role');
    if (r === 'recruiter' || r === 'candidate') {
      setRole(r);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errorMessage) {
      setErrorMessage('');
    }
    if (socialNotice) {
      setSocialNotice('');
    }
  };

  const isPasswordMismatch = Boolean(
    formData.confirmPassword && formData.password !== formData.confirmPassword
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Client-side validations
    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters with letters and numbers.');
      return;
    }

    if (!formData.confirmPassword) {
      setErrorMessage('Please confirm your password.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    // Strip confirmPassword before sending to backend API
    const payload = {
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: role,
      accept_terms: formData.acceptTerms,
      ...(role === 'candidate'
        ? { full_name: formData.fullName.trim() }
        : { company_name: formData.companyName.trim() }),
    };

    try {
      const response = await authApi.register(payload);
      // Navigate to OTP verification screen
      navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}&role=${role}`);
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          setErrorMessage(data);
        } else if (data.email) {
          setErrorMessage(Array.isArray(data.email) ? data.email[0] : data.email);
        } else if (data.message) {
          setErrorMessage(data.message);
        } else if (data.detail) {
          setErrorMessage(data.detail);
        } else if (data.password) {
          setErrorMessage(Array.isArray(data.password) ? data.password[0] : data.password);
        } else if (data.full_name || data.company_name) {
          setErrorMessage(data.full_name?.[0] || data.company_name?.[0] || 'Invalid input.');
        } else {
          setErrorMessage('Registration failed. Please check your inputs.');
        }
      } else {
        setErrorMessage('Cannot connect to server. Is the Django backend running?');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await authApi.googleLogin({
        id_token: credentialResponse.credential,
        accept_terms: true,
      });
      const { access, refresh, user } = response.data;
      dispatch(setCredentials({ access, refresh, user }));
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        setErrorMessage(data.message || data.detail || 'Google sign-up failed. Please try again.');
      } else {
        setErrorMessage('Cannot reach backend server. Please verify Django is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '846662571863-g24i255q0g6varljducpo98m2ci3p8n4.apps.googleusercontent.com';

    const renderGoogleButton = () => {
      if (window.google?.accounts?.id && googleBtnRef.current && role === 'candidate') {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleSuccess,
        });

        const btnWidth = googleBtnRef.current.clientWidth
          ? Math.min(Math.max(googleBtnRef.current.clientWidth, 200), 400)
          : 360;

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: btnWidth,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          renderGoogleButton();
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [role]);

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 group mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#0058be] text-white flex items-center justify-center font-bold text-xl shadow-sm">
            <span>TB</span>
          </div>
          <span className="font-bold text-2xl tracking-tight text-[#191c1e]">
            Talent<span className="text-[#0058be]">Bridge</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-[#191c1e]">
          Create your account
        </h2>
        <p className="mt-1 text-sm text-[#45464d]">
          Already have an account?{' '}
          <Link
            to={`/login?role=${role}`}
            className="font-semibold text-[#0058be] hover:underline"
          >
            Sign in here
          </Link>
        </p>
      </div>

      {/* Form Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#e0e3e5] rounded-xl sm:px-10">
          
          {/* Role Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#eceef0] rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setRole('candidate');
                setErrorMessage('');
                setSocialNotice('');
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${
                role === 'candidate'
                  ? 'bg-white text-[#191c1e] shadow-sm'
                  : 'text-[#45464d] hover:text-[#191c1e]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Candidate
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('recruiter');
                setErrorMessage('');
                setSocialNotice('');
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${
                role === 'recruiter'
                  ? 'bg-white text-[#191c1e] shadow-sm'
                  : 'text-[#45464d] hover:text-[#191c1e]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Recruiter / Company
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-md bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-[#93000a] text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Social Notice */}
          {socialNotice && (
            <div className="mb-5 p-3 rounded-md bg-[#d8e2ff]/50 border border-[#0058be]/20 text-[#001a42] text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#0058be]" />
              <span>{socialNotice}</span>
            </div>
          )}

          {/* Candidate-specific Google OAuth Button & Divider */}
          {role === 'candidate' && (
            <div className="animate-fade-in">
              <div className="w-full flex justify-center mb-2 min-h-[44px]">
                <div ref={googleBtnRef} className="w-full flex justify-center" />
              </div>

              {/* Divider: OR SIGN UP WITH EMAIL */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e0e3e5]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-[11px] font-semibold tracking-wider text-[#76777d] uppercase">
                    OR SIGN UP WITH EMAIL
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Conditional Name Field */}
            {role === 'candidate' ? (
              <div>
                <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="Alex Mercer"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be] text-[#191c1e]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  required
                  placeholder="Acme Technologies Inc."
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be] text-[#191c1e]"
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                {role === 'candidate' ? 'Email Address' : 'Work Email Address'}
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder={role === 'candidate' ? 'alex@example.com' : 'recruiter@company.com'}
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be] text-[#191c1e]"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be] text-[#191c1e] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#76777d] hover:text-[#191c1e]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-[#76777d]">
                Must be at least 8 characters with letters and numbers.
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  placeholder="••••••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 text-sm bg-white border ${
                    isPasswordMismatch
                      ? 'border-[#ba1a1a] focus:border-[#ba1a1a]'
                      : 'border-[#c6c6cd] focus:border-[#0058be]'
                  } rounded-[4px] focus:outline-none text-[#191c1e] pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#76777d] hover:text-[#191c1e]"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isPasswordMismatch ? (
                <p className="mt-1 text-[11px] text-[#ba1a1a]">
                  Passwords do not match.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-[#76777d]">
                  Please re-enter your password to confirm.
                </p>
              )}
            </div>

            {/* Terms of Service Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="acceptTerms"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                required
                className="mt-1 h-4 w-4 rounded border-[#c6c6cd] text-[#0058be] focus:ring-[#0058be]"
              />
              <label htmlFor="acceptTerms" className="text-xs text-[#45464d] leading-normal">
                I agree to the{' '}
                <a href="#terms" className="text-[#0058be] font-medium hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#privacy" className="text-[#0058be] font-medium hover:underline">
                  Privacy Policy
                </a>.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isPasswordMismatch}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-[#0058be] hover:bg-[#0047a0] text-white font-semibold py-3 px-4 rounded-[4px] text-sm shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}
