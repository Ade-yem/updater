import type { ApiResponse, DigestDto, PushSubscribeInput, UserDto } from '@repo/shared';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'auth_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Dispatched when a request comes back 401 so AuthContext can clear session state. */
export const UNAUTHORIZED_EVENT = 'api:unauthorized';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection.', 0, 'NETWORK_ERROR');
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    const message = json?.message || `Request failed with status ${res.status}`;
    const code = json?.error || 'UNKNOWN_ERROR';
    throw new ApiError(message, res.status, code);
  }

  return json as T;
}

export interface AuthResult {
  token: string;
  user: UserDto;
}

export const authApi = {
  register: (name: string, email: string, password: string) =>
    request<AuthResult>('/auth/register', { method: 'POST', body: { name, email, password }, auth: false }),

  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  googleRedirectUrl: () => `${API_BASE}/auth/google`,
};

export interface DigestListParams {
  skip?: number;
  take?: number;
  startDate?: string;
  endDate?: string;
}

export const digestApi = {
  getToday: async () => {
    const res = await request<ApiResponse<DigestDto | null>>('/digests/today');
    return res.data;
  },

  list: async (params: DigestListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.set('skip', String(params.skip));
    if (params.take !== undefined) query.set('take', String(params.take));
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const res = await request<ApiResponse<{ items: DigestDto[]; total: number }>>(
      `/digests?${query.toString()}`,
    );
    return res.data;
  },

  getById: async (id: string) => {
    const res = await request<ApiResponse<DigestDto>>(`/digests/${id}`);
    return res.data;
  },

  refresh: async () => {
    const res = await request<ApiResponse<{ triggered: boolean }>>('/digests/refresh', { method: 'POST' });
    return res.data;
  },
};

export const pushApi = {
  getVapidPublicKey: async () => {
    const res = await request<ApiResponse<{ publicKey: string }>>('/push/vapid-public-key');
    return res.data.publicKey;
  },

  subscribe: (subscription: PushSubscribeInput) =>
    request<ApiResponse<null>>('/push/subscribe', { method: 'POST', body: subscription }),

  unsubscribe: (endpoint: string) =>
    request<ApiResponse<null>>('/push/unsubscribe', { method: 'POST', body: { endpoint } }),
};

export const userApi = {
  getProfile: async () => {
    const res = await request<ApiResponse<UserDto>>('/users/me');
    return res.data;
  },

  updateProfile: async (data: Partial<UserDto>) => {
    const res = await request<ApiResponse<UserDto>>('/users/me', {
      method: 'PATCH',
      body: data,
    });
    return res.data;
  },
};

/** DigestDto's date fields are typed as `Date` but arrive over JSON as ISO strings. */
export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
