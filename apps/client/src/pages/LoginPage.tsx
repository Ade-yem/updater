import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../lib/api';
import { GoogleIcon } from '../components/icons';

export function LoginPage() {
  const { status, setSessionFromToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [oauthError, setOauthError] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
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
        </div>
      </div>
    </div>
  );
}
