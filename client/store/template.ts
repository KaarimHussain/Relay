import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Template {
  id: string;
  brandId: string;
  name: string;
  category: string;
  platforms: string[];
  caption: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplatePayload {
  name: string;
  category: string;
  platforms: string[];
  caption: string;
}

export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

interface TemplateState {
  templates: Template[];
  brandId: string | null;
  status: 'idle' | 'loading' | 'error' | 'ready';
  error: string | null;

  fetchTemplates: (brandId: string) => Promise<void>;
  createTemplate: (brandId: string, payload: CreateTemplatePayload) => Promise<Template>;
  updateTemplate: (brandId: string, id: string, payload: UpdateTemplatePayload) => Promise<Template>;
  deleteTemplate: (brandId: string, id: string) => Promise<void>;
  reset: () => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  brandId: null,
  status: 'idle',
  error: null,

  fetchTemplates: async (brandId) => {
    if (get().brandId === brandId && get().status === 'ready') return;
    set({ status: 'loading', error: null, brandId });
    try {
      const templates = await api.get<Template[]>(`/brands/${brandId}/templates`);
      set({ templates, status: 'ready' });
    } catch (err: any) {
      set({ status: 'error', error: err?.message ?? 'Failed to load templates' });
    }
  },

  createTemplate: async (brandId, payload) => {
    const created = await api.post<Template>(`/brands/${brandId}/templates`, payload);
    set((s) => ({ templates: [created, ...s.templates] }));
    return created;
  },

  updateTemplate: async (brandId, id, payload) => {
    const updated = await api.patch<Template>(`/brands/${brandId}/templates/${id}`, payload);
    set((s) => ({ templates: s.templates.map((t) => (t.id === id ? updated : t)) }));
    return updated;
  },

  deleteTemplate: async (brandId, id) => {
    await api.delete(`/brands/${brandId}/templates/${id}`);
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
  },

  reset: () => set({ templates: [], brandId: null, status: 'idle', error: null }),
}));
