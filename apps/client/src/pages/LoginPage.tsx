import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authApi, ApiError } from '../lib/api';
import { GoogleIcon, MailIcon, LockIcon, UserIcon, SpinnerIcon } from '../components/icons';

type Mode = 'login' | 'register';

export function LoginPage() {
  const { status, setSessionFromToken, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [oauthError, setOauthError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google OAuth callback lands here as /login?token=<jwt> (see AuthController.googleCallback).
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;

    const consumeToken = () => {
      try {
        setSessionFromToken(token);
        navigate('/digest/today', { replace: true });
      } catch {
        setOauthError('Google sign-in did not complete. Please try again.');
        navigate('/login', { replace: true });
      }
    };

    consumeToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (status === 'authenticated') {
    return <Navigate to="/digest/today" replace />;
  }

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setFormError('Please enter your name.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate('/digest/today', { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-600 text-white shadow-sm dark:bg-accent-500">
            <MailIcon className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Digest</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Your inbox, summarized every day.
          </p>
        </div>

        <div className="rounded-lg border border-ink-200 bg-white p-6 shadow-sm dark:border-ink-800 dark:bg-ink-900">
          {oauthError && (
            <p role="alert" className="mb-4 rounded-md bg-status-failed-bg px-3 py-2 text-sm text-status-failed">
              {oauthError}
            </p>
          )}

          <a
            href={authApi.googleRedirectUrl()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-ink-300 bg-white py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200 dark:hover:bg-ink-900"
          >
            <GoogleIcon className="h-4 w-4" />
            Continue with Google
          </a>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
            <span className="text-xs font-medium uppercase tracking-wide text-ink-400">or</span>
            <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {formError && (
              <p role="alert" className="rounded-md bg-status-failed-bg px-3 py-2 text-sm text-status-failed">
                {formError}
              </p>
            )}

            {mode === 'register' && (
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-ink-300 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
                />
              </div>
            )}

            <div className="relative">
              <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-ink-300 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
              />
            </div>

            <div className="relative">
              <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-ink-300 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-600 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-accent-500 dark:hover:bg-accent-600"
            >
              {isSubmitting && <SpinnerIcon className="h-4 w-4" />}
              {mode === 'register' ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-500 dark:text-ink-400">
            {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-accent-700 hover:underline dark:text-accent-400"
            >
              {mode === 'register' ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
