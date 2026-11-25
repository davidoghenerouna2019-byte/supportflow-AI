import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractApiError } from '../services/api';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate();
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeAfterAuth = (role: string) => {
    if (role === 'ADMIN' || role === 'AGENT') {
      navigate('/dashboard');
    } else {
      navigate('/chat');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user =
        mode === 'login'
          ? await loginWithEmail(email, password)
          : await registerWithEmail({ fullName, email, password, phone });
      routeAfterAuth(user.role);
    } catch (err) {
      setError(extractApiError(err, 'Authentication failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const user = await loginWithGoogle();
      routeAfterAuth(user.role);
    } catch (err) {
      setError(extractApiError(err, 'Google Sign-In failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#062D48]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <span className="text-sm font-bold text-[#062D48]">
            Support Flow AI
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#062D48]">
              {mode === 'login'
                ? 'Sign in to your account'
                : 'Create a customer account'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {mode === 'login'
                ? 'Customers, support agents, and administrators sign in here.'
                : 'Register to save your support chat history and track escalations.'}
            </p>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-800 transition-colors cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center text-xs text-slate-400">
            <span className="absolute inset-x-0 border-t border-slate-200" />
            <span className="relative bg-white px-3">
              or continue with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Amara Okafor"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#062D48]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#062D48]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#062D48]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#062D48]"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#062D48] hover:bg-[#093e63] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            {mode === 'login' ? (
              <>
                <span>Need a customer account?</span>
                <Link
                  to="/register"
                  className="font-semibold text-[#0D9488] hover:underline"
                >
                  Register here
                </Link>
              </>
            ) : (
              <>
                <span>Already have an account?</span>
                <Link
                  to="/login"
                  className="font-semibold text-[#0D9488] hover:underline"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
          <span>Role-based access control &amp; encrypted session security</span>
        </p>
      </div>
    </div>
  );
}
