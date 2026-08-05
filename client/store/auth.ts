import { create } from 'zustand';
import { api, ApiError } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

function persistToken(token: string) {
  localStorage.setItem('relay_token', token);
  // Mirror to cookie so Next.js middleware can read it for SSR route protection
  document.cookie = `relay_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearToken() {
  localStorage.removeItem('relay_token');
  document.cookie = 'relay_token=; Max-Age=0; path=/';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  status: 'idle',

  login: async (email, password) => {
    set({ status: 'loading' });
    const data = await api.post<{ user: AuthUser; token: string }>(
      '/auth/login',
      { email, password },
      false,
    );
    persistToken(data.token);
    set({ user: data.user, token: data.token, status: 'authenticated' });
  },

  register: async (name, email, password) => {
    set({ status: 'loading' });
    const data = await api.post<{ user: AuthUser; token: string }>(
      '/auth/register',
      { name, email, password },
      false,
    );
    persistToken(data.token);
    set({ user: data.user, token: data.token, status: 'authenticated' });
  },

  logout: () => {
    clearToken();
    // Lazy import to avoid circular dep — brand store resets its own localStorage key
    import('@/store/brand').then(({ useBrandStore }) => useBrandStore.getState().reset());
    import('@/store/account').then(({ useAccountStore }) => useAccountStore.getState().reset());
    set({ user: null, token: null, status: 'unauthenticated' });
  },

  hydrate: async () => {
    if (get().status === 'authenticated') return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('relay_token') : null;

    if (!token) {
      set({ status: 'unauthenticated' });
      return;
    }

    set({ token, status: 'loading' });
    try {
      const user = await api.get<AuthUser>('/auth/me');
      set({ user, status: 'authenticated' });
    } catch {
      // Token invalid/expired
      clearToken();
      set({ user: null, token: null, status: 'unauthenticated' });
    }
  },
}));
