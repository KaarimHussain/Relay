import { create } from 'zustand';
import { api } from '@/lib/api';

export type PostStatus = 'Draft' | 'Scheduled' | 'Publishing' | 'Published' | 'Failed';

export interface PostTarget {
  id: string;
  accountId: string;
  caption: string;
  hashtags: string | null;
  status: PostStatus;
  publishedAt: string | null;
  errorMessage: string | null;
  account: { platform: string; platformHandle: string };
}

export interface Post {
  id: string;
  title: string;
  status: PostStatus;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  targets: PostTarget[];
  media: Array<{ id: string; url: string; filename: string }>;
}

export interface CreatePostDto {
  title: string;
  scheduledAt?: string;
  targets?: Array<{ accountId: string; caption: string; hashtags?: string }>;
}

interface PostState {
  posts: Post[];
  brandId: string | null;
  status: 'idle' | 'loading' | 'error' | 'ready';
  error: string | null;

  fetchPosts: (brandId: string) => Promise<void>;
  createPost: (brandId: string, dto: CreatePostDto) => Promise<Post>;
  deletePost: (brandId: string, postId: string) => Promise<void>;
  schedulePost: (brandId: string, postId: string, scheduledAt: string) => Promise<Post>;
  publishNow: (brandId: string, postId: string) => Promise<Post>;
  cancelPost: (brandId: string, postId: string) => Promise<void>;
  reset: () => void;
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  brandId: null,
  status: 'idle',
  error: null,

  fetchPosts: async (brandId) => {
    if (get().brandId === brandId && get().status === 'ready') return;
    set({ status: 'loading', error: null, brandId });
    try {
      const posts = await api.get<Post[]>(`/brands/${brandId}/posts`);
      set({ posts, status: 'ready' });
    } catch (err: any) {
      set({ status: 'error', error: err?.message ?? 'Failed to load posts' });
    }
  },

  createPost: async (brandId, dto) => {
    const post = await api.post<Post>(`/brands/${brandId}/posts`, dto);
    set((s) => ({ posts: [post, ...s.posts] }));
    return post;
  },

  deletePost: async (brandId, postId) => {
    await api.delete(`/brands/${brandId}/posts/${postId}`);
    set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) }));
  },

  schedulePost: async (brandId, postId, scheduledAt) => {
    const updated = await api.post<Post>(`/brands/${brandId}/posts/${postId}/schedule`, { scheduledAt });
    set((s) => ({ posts: s.posts.map((p) => (p.id === postId ? updated : p)) }));
    return updated;
  },

  publishNow: async (brandId, postId) => {
    const updated = await api.post<Post>(`/brands/${brandId}/posts/${postId}/publish-now`);
    set((s) => ({ posts: s.posts.map((p) => (p.id === postId ? updated : p)) }));
    return updated;
  },

  cancelPost: async (brandId, postId) => {
    await api.post(`/brands/${brandId}/posts/${postId}/cancel`);
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, status: 'Draft' as PostStatus, scheduledAt: null } : p
      ),
    }));
  },

  reset: () => set({ posts: [], brandId: null, status: 'idle', error: null }),
}));
