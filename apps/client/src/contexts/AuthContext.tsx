import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, clearToken, getToken, setToken as persistToken, UNAUTHORIZED_EVENT } from '../lib/api';
import { decodeJwt, isTokenExpired } from '../lib/jwt';
import { AuthContext, type AuthStatus, type AuthUser } from './auth-context';

function buildUserFromToken(token: string, extra?: { name?: string; image?: string | null }): AuthUser | null {
  const payload = decodeJwt(token);
  if (!payload || isTokenExpired(payload)) return null;
  return {
    id: payload.sub,
    email: payload.email,
    name: extra?.name,
    image: extra?.image,
  };
}

function readInitialSession(): { token: string | null; user: AuthUser | null; status: AuthStatus } {
  const existing = getToken();
  if (existing) {
    const restored = buildUserFromToken(existing);
    if (restored) return { token: existing, user: restored, status: 'authenticated' };
    clearToken();
  }
  return { token: null, user: null, status: 'unauthenticated' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ token, user, status }, setSession] = useState(readInitialSession);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearToken();
      setSession({ token: null, user: null, status: 'unauthenticated' });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const applySession = useCallback((newToken: string, extra?: { name?: string; image?: string | null }) => {
    const nextUser = buildUserFromToken(newToken, extra);
    if (!nextUser) throw new Error('Received an invalid session token.');
    persistToken(newToken);
    setSession({ token: newToken, user: nextUser, status: 'authenticated' });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      applySession(result.token, { name: result.user.name, image: result.user.image });
    },
    [applySession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await authApi.register(name, email, password);
      applySession(result.token, { name: result.user.name, image: result.user.image });
    },
    [applySession],
  );

  const setSessionFromToken = useCallback(
    (newToken: string) => {
      applySession(newToken);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    clearToken();
    setSession({ token: null, user: null, status: 'unauthenticated' });
  }, []);

  const value = useMemo(
    () => ({ user, token, status, login, register, logout, setSessionFromToken }),
    [user, token, status, login, register, logout, setSessionFromToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
