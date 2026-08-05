import { create } from 'zustand';
import { api } from '@/lib/api';

export type AccountStatus = 'Active' | 'Expired' | 'Disconnected';
export type Platform = 'Instagram' | 'LinkedIn' | 'X' | 'Facebook' | 'TikTok';

export interface SocialAccount {
  id: string;
  platform: Platform;
  platformHandle: string;
  status: AccountStatus;
  tokenExpiresAt: string | null;
  createdAt: string;
}

export interface ConnectAccountPayload {
  platform: Platform;
  platformUserId: string;
  platformHandle: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

interface AccountState {
  accounts: SocialAccount[];
  brandId: string | null;
  status: 'idle' | 'loading' | 'error' | 'ready';
  error: string | null;

  fetchAccounts: (brandId: string) => Promise<void>;
  connectAccount: (brandId: string, payload: ConnectAccountPayload) => Promise<SocialAccount>;
  disconnectAccount: (brandId: string, accountId: string) => Promise<void>;
  checkHealth: (brandId: string, accountId: string) => Promise<void>;
  reset: () => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  brandId: null,
  status: 'idle',
  error: null,

  fetchAccounts: async (brandId) => {
    // Skip if already loaded for this brand
    if (get().brandId === brandId && get().status === 'ready') return;
    set({ status: 'loading', error: null, brandId });
    try {
      const accounts = await api.get<SocialAccount[]>(`/brands/${brandId}/accounts`);
      set({ accounts, status: 'ready' });
    } catch (err: any) {
      set({ status: 'error', error: err?.message ?? 'Failed to load accounts' });
    }
  },

  connectAccount: async (brandId, payload) => {
    const account = await api.post<SocialAccount>(`/brands/${brandId}/accounts`, payload);
    set((s) => ({
      accounts: s.accounts.some((a) => a.id === account.id)
        ? s.accounts.map((a) => (a.id === account.id ? account : a))
        : [...s.accounts, account],
    }));
    return account;
  },

  disconnectAccount: async (brandId, accountId) => {
    await api.delete(`/brands/${brandId}/accounts/${accountId}`);
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, status: 'Disconnected' as AccountStatus } : a
      ),
    }));
  },

  checkHealth: async (brandId, accountId) => {
    const result = await api.get<{ accountId: string; status: AccountStatus }>(
      `/brands/${brandId}/accounts/${accountId}/health`
    );
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, status: result.status } : a
      ),
    }));
  },

  reset: () => set({ accounts: [], brandId: null, status: 'idle', error: null }),
}));
