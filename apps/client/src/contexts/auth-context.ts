import { createContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setSessionFromToken: (token: string) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
