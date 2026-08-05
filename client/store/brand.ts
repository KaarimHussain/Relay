import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  colorHex: string;
  logoUrl: string | null;
  voiceTone: string | null;
  pillars: string | null;
  role: 'Owner' | 'Admin' | 'Editor';
  createdAt: string;
}

interface BrandState {
  brands: Brand[];
  activeBrandId: string | null;
  status: 'idle' | 'loading' | 'error' | 'ready';
  error: string | null;

  activeBrand: () => Brand | null;
  fetchBrands: () => Promise<void>;
  setActiveBrand: (id: string) => void;
  addBrand: (brand: Brand) => void;
  updateBrand: (id: string, data: Partial<Pick<Brand, 'name' | 'colorHex' | 'voiceTone' | 'pillars'>>) => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY = 'relay_active_brand';

export const useBrandStore = create<BrandState>((set, get) => ({
  brands: [],
  activeBrandId:
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null,
  status: 'idle',
  error: null,

  activeBrand: () => {
    const { brands, activeBrandId } = get();
    return brands.find((b) => b.id === activeBrandId) ?? brands[0] ?? null;
  },

  fetchBrands: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const brands = await api.get<Brand[]>('/brands');
      const stored = localStorage.getItem(STORAGE_KEY);
      const validStored = brands.find((b) => b.id === stored);
      const activeBrandId = validStored ? stored : (brands[0]?.id ?? null);
      if (activeBrandId) localStorage.setItem(STORAGE_KEY, activeBrandId);
      set({ brands, activeBrandId, status: 'ready' });
    } catch (err: any) {
      set({ status: 'error', error: err?.message ?? 'Failed to load brands' });
    }
  },

  setActiveBrand: (id) => {
    localStorage.setItem(STORAGE_KEY, id);
    set({ activeBrandId: id });
  },

  addBrand: (brand) => {
    localStorage.setItem(STORAGE_KEY, brand.id);
    set((s) => ({ brands: [...s.brands, brand], activeBrandId: brand.id }));
  },

  updateBrand: async (id, data) => {
    const updated = await api.patch<Brand>(`/brands/${id}`, data);
    set((s) => ({ brands: s.brands.map((b) => (b.id === id ? { ...b, ...updated } : b)) }));
  },

  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ brands: [], activeBrandId: null, status: 'idle', error: null });
  },
}));
