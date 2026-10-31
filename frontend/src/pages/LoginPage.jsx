import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle, User, Building2 } from 'lucide-react';
import authApi from '../api/authApi';
import { setCredentials } from '../store/slices/authSlice';

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const isVerifiedParam = searchParams.get('verified') === 'true';
  const initialEmail = searchParams.get('email') || '';
  const initialRole = searchParams.get('role') === 'recruiter' ? 'recruiter' : 'candidate';

  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password,
        role,
      };

      const response = await authApi.login(payload);
      const { access, refresh, user } = response.data;
      dispatch(setCredentials({ access, refresh, user }));
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        if (data.detail) {
          setErrorMessage(data.detail);
        } else if (data.non_field_errors) {
          setErrorMessage(data.non_field_errors[0]);
        } else if (data.message) {
          setErrorMessage(data.message);
        } else {
          setErrorMessage('Invalid email or password.');
        }
      } else {
        setErrorMessage('Cannot reach backend server. Please verify Django is running.');
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
        setErrorMessage(data.message || data.detail || 'Google sign-in failed. Please try again.');
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
      {/* TalentBridge Branding Header */}
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
          Sign in to your account
        </h2>
        <p className="mt-1 text-sm text-[#45464d]">
          Don't have an account yet?{' '}
          <Link
            to={`/register?role=${role}`}
            className="font-semibold text-[#0058be] hover:underline"
          >
            Register now
          </Link>
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#e0e3e5] rounded-xl sm:px-10 transition-all duration-200">

          {/* Role Toggle Bar */}
          <div className="grid grid-cols-2 p-1 bg-[#eceef0] rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setRole('candidate');
                setErrorMessage('');
                setSocialNotice('');
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${role === 'candidate'
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
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${role === 'recruiter'
                  ? 'bg-white text-[#191c1e] shadow-sm'
                  : 'text-[#45464d] hover:text-[#191c1e]'
                }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Recruiter / Company
            </button>
          </div>

          {/* Email Verified Alert */}
          {isVerifiedParam && (
            <div className="mb-5 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Email verified successfully! You can now sign in.</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-md bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-[#93000a] text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Social / OAuth Notice */}
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

              {/* Divider: OR SIGN IN WITH EMAIL */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e0e3e5]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-[11px] font-semibold tracking-wider text-[#76777d] uppercase">
                    OR SIGN IN WITH EMAIL
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                {role === 'recruiter' ? 'Work Email Address' : 'Email Address'}
              </label>
              <input
                type="email"
                required
                placeholder={role === 'recruiter' ? 'recruiter@company.com' : 'name@company.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#c6c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be] text-[#191c1e]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#191c1e]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#0058be] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
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

            {/* Blue Primary Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-[#0058be] hover:bg-[#0047a0] text-white font-semibold py-3 px-4 rounded-[4px] text-sm shadow-sm transition-all disabled:opacity-50 active:scale-[0.99] cursor-pointer"
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
    </div>
  );
}
