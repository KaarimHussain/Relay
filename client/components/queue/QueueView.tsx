'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, MoreHorizontal, Edit2, Clock,
  Trash2, Send, Plus, AlertCircle, Loader2, X, ImageIcon, CalendarDays, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePostStore, Post, PostStatus } from '@/store/post';
import { useBrandStore } from '@/store/brand';
import { useToast } from '@/components/ui/toast';
import { formatScheduledAt, sortDate } from '@/lib/format';
import { ApiError } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Config ───────────────────────────────────────────────────────────────────

type FilterStatus = PostStatus | 'all';
type SortKey = 'date-asc' | 'date-desc';

const STATUS_CONFIG: Record<PostStatus, { label: string; dot: string; bg: string; text: string }> = {
  Draft: { label: 'Draft', dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-500' },
  Scheduled: { label: 'Scheduled', dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  Publishing: { label: 'Publishing', dot: 'bg-blue-400', bg: 'bg-blue-50', text: 'text-blue-700' },
  Published: { label: 'Published', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  Failed: { label: 'Failed', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600' },
};

function SvgIcon({ d, viewBox = '0 0 24 24', size = 10, fill = 'currentColor' }: { d: string | React.ReactNode; viewBox?: string; size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill={fill} aria-hidden="true">
      {typeof d === 'string' ? <path d={d} /> : d}
    </svg>
  );
}

const PLATFORM_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  LinkedIn: {
    color: 'bg-blue-700',
    icon: <SvgIcon d={<><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></>} />,
  },
  Instagram: {
    color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    icon: <SvgIcon fill="none" d={<><rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2" /><circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.2" fill="white" /></>} />,
  },
  X: {
    color: 'bg-gray-900',
    icon: <SvgIcon d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.626L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />,
  },
  Facebook: {
    color: 'bg-blue-600',
    icon: <SvgIcon d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  },
  TikTok: {
    color: 'bg-gray-950',
    icon: <SvgIcon d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" />,
  },
  YouTube: {
    color: 'bg-red-600',
    icon: <SvgIcon d={<><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white" /></>} />,
  },
};

const TABS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Scheduled', label: 'Scheduled' },
  { key: 'Published', label: 'Published' },
  { key: 'Draft', label: 'Drafts' },
  { key: 'Failed', label: 'Failed' },
];

// ─── Row menu ─────────────────────────────────────────────────────────────────

function RowMenu({
  post, brandId, onClose,
}: { post: Post; brandId: string; onClose: () => void }) {
  const { deletePost, publishNow, retryFailed, cancelPost } = usePostStore();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const canEdit = post.status !== 'Published' && post.status !== 'Publishing';

  const run = async (action: () => Promise<void>, msg: string) => {
    setBusy(true);
    try { await action(); toast(msg, 'success'); onClose(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 overflow-hidden">
      {canEdit ? (
        <Link href={`/posts/${post.id}/edit`} onClick={onClose} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
          <Edit2 size={13} className="text-gray-400" /> Edit post
        </Link>
      ) : (
        <span title="Published posts cannot be edited" className="flex w-full cursor-not-allowed items-center gap-2.5 px-3 py-2 text-[13px] text-gray-300">
          <Edit2 size={13} /> Edit post
        </span>
      )}
      {post.status === 'Scheduled' && (
        <button disabled={busy} onClick={() => run(() => cancelPost(brandId, post.id), 'Post moved back to draft')}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
          <X size={13} className="text-gray-400" /> Cancel schedule
        </button>
      )}
      {(post.status === 'Draft' || post.status === 'Failed') && (
        <button disabled={busy} onClick={() => run(async () => { post.status === 'Failed' ? await retryFailed(brandId, post.id) : await publishNow(brandId, post.id); }, post.status === 'Failed' ? 'Retry started for failed destinations only' : 'Post queued for publishing')}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50">
          {post.status === 'Failed' ? <RotateCcw size={13} /> : <Send size={13} />} {post.status === 'Failed' ? 'Retry failed only' : 'Publish now'}
        </button>
      )}
      <div className="my-1 h-px bg-gray-100" />
      <button disabled={busy} onClick={() => run(() => deletePost(brandId, post.id), 'Post deleted')}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}

// ─── Post row ─────────────────────────────────────────────────────────────────

function QueueRow({
  post, brandId, selected, active, onToggle, onOpen,
}: { post: Post; brandId: string; selected: boolean; active: boolean; onToggle: () => void; onOpen: () => void }) {
  const { publishNow, retryFailed } = usePostStore();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cfg = STATUS_CONFIG[post.status];
  const excerpt = post.targets[0]?.caption ?? '—';
  const platforms = [...new Set(post.targets.map((t) => t.account?.platform).filter(Boolean))];

  const handlePublishNow = async () => {
    setBusy(true);
    try {
      if (post.status === 'Failed') {
        await retryFailed(brandId, post.id);
        toast('Retry started for failed destinations only', 'success');
      } else {
        await publishNow(brandId, post.id);
        toast('Post queued for publishing', 'success');
      }
    }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed to publish'); }
    finally { setBusy(false); }
  };

  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(); }} className={cn('flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors group relative cursor-pointer', active ? 'bg-orange-50/70 ring-1 ring-inset ring-orange-200' : selected ? 'bg-orange-50/50' : 'hover:bg-gray-50/70')}>
      <input type="checkbox" checked={selected} onClick={(event) => event.stopPropagation()} onChange={onToggle}
        className="w-3.5 h-3.5 rounded border-gray-300 accent-orange-500 cursor-pointer shrink-0" />

      {/* Media thumbnail */}
      <div className="w-8 h-8 rounded-md shrink-0 overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
        {post.media[0]?.url
          ? <img src={post.media[0].url} alt="" className="w-full h-full object-cover" />
          : <ImageIcon size={13} className="text-gray-300" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-gray-900 truncate leading-none">{post.title}</p>
          <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0', cfg.bg, cfg.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {/* Platform icons */}
          <div className="flex -space-x-0.5 shrink-0">
            {platforms.map((p) => {
              const pcfg = PLATFORM_CONFIG[p] ?? { icon: <span className="text-[7px] font-bold">{p[0]}</span>, color: 'bg-gray-400' };
              return (
                <div key={p} title={p}
                  className={cn('w-4 h-4 rounded-full ring-1 ring-white flex items-center justify-center text-white', pcfg.color)}>
                  {pcfg.icon}
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-400 truncate">{excerpt}</p>

          <span className="text-[11px] text-gray-400 flex items-center gap-1 shrink-0 ml-auto">
            <Clock size={10} className="text-gray-300" />
            {formatScheduledAt(post.scheduledAt)}
          </span>
        </div>

        {/* Failed error message — one line per platform that failed */}
        {post.status === 'Failed' && post.targets.some((t) => t.errorMessage) && (
          <div className="mt-0.5 flex flex-col gap-0.5">
            {post.targets
              .filter((t) => t.errorMessage)
              .map((t) => (
                <p key={t.id} className="text-[11px] text-red-500 truncate" title={t.errorMessage ?? ''}>
                  <span className="font-semibold">{t.account?.platform ?? 'Platform'}:</span> {t.errorMessage}
                </p>
              ))}
          </div>
        )}
      </div>

      {/* Row actions */}
      <div className="relative shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {(post.status === 'Draft' || post.status === 'Failed') && (
          <button disabled={busy} onClick={(event) => { event.stopPropagation(); void handlePublishNow(); }}
            className="h-6 px-2 text-[11px] font-medium text-orange-600 bg-orange-50 border border-orange-100 rounded-md hover:bg-orange-100 transition-colors disabled:opacity-50">
            {busy ? '…' : post.status === 'Failed' ? 'Retry failed' : 'Publish'}
          </button>
        )}
        <button onClick={(event) => { event.stopPropagation(); setMenuOpen((v) => !v); }}
          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && <RowMenu post={post} brandId={brandId} onClose={() => setMenuOpen(false)} />}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: FilterStatus }) {
  const messages: Record<FilterStatus, { title: string; body: string }> = {
    all: { title: 'Your queue is empty', body: 'Create your first post to get started.' },
    Scheduled: { title: 'No scheduled posts', body: 'Schedule a post and it will appear here.' },
    Published: { title: 'No published posts yet', body: 'Published posts will show up here.' },
    Draft: { title: 'No drafts', body: 'Save a post as a draft to revisit it later.' },
    Failed: { title: 'No failed posts', body: 'Any posts that fail to publish appear here.' },
    Publishing: { title: 'Nothing publishing', body: 'Posts being published will appear here.' },
  };
  const { title, body } = messages[tab] ?? messages.all;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
        <SlidersHorizontal size={20} className="text-gray-400" />
      </div>
      <p className="text-[15px] font-semibold text-gray-700 mb-1">{title}</p>
      <p className="text-[13px] text-gray-400 max-w-xs">{body}</p>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function QueueView() {
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const { posts, status, error, fetchPosts, deletePost, publishNow, retryFailed } = usePostStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date-asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [focusedPostId, setFocusedPostId] = useState<string | null>(null);

  const canPublish = (post: Post) => post.status === 'Draft' || post.status === 'Failed';

  useEffect(() => {
    if (activeBrand?.id) fetchPosts(activeBrand.id);
  }, [activeBrand?.id, fetchPosts]);

  const filtered = useMemo(() => {
    let list = posts;
    if (activeTab !== 'all') list = list.filter((p) => p.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.targets[0]?.caption.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) =>
      sort === 'date-asc'
        ? sortDate(a.scheduledAt ?? a.createdAt) - sortDate(b.scheduledAt ?? b.createdAt)
        : sortDate(b.scheduledAt ?? b.createdAt) - sortDate(a.scheduledAt ?? a.createdAt)
    );
  }, [posts, activeTab, search, sort]);

  const counts = useMemo(() => {
    const c: Partial<Record<FilterStatus, number>> = { all: posts.length };
    for (const p of posts) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [posts]);

  const focusedPost = filtered.find((post) => post.id === focusedPostId) ?? filtered[0] ?? null;

  const selectablePosts = filtered;
  const allSelected = selectablePosts.length > 0 && selectablePosts.every((post) => selected.has(post.id));
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectablePosts.map((post) => post.id)));
  const toggleRow = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const hasPublishable = useMemo(() => [...selected].some((id) => filtered.find((p) => p.id === id && canPublish(p))), [selected, filtered]);

  const handleBulkDelete = async () => {
    if (!activeBrand) return;
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => deletePost(activeBrand.id, id)));
      toast(`Deleted ${selected.size} post${selected.size > 1 ? 's' : ''}`, 'success');
      setSelected(new Set());
    } catch { toast('Some posts could not be deleted'); }
    finally { setBulkBusy(false); }
  };

  const handleBulkPublish = async () => {
    if (!activeBrand) return;
    const toPublish = [...selected].filter((id) => filtered.find((p) => p.id === id && canPublish(p)));
    if (toPublish.length === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all(toPublish.map((id) => {
        const post = filtered.find((item) => item.id === id);
        return post?.status === 'Failed' ? retryFailed(activeBrand.id, id) : publishNow(activeBrand.id, id);
      }));
      toast(`Sent ${toPublish.length} post${toPublish.length > 1 ? 's' : ''} for publishing`, 'success');
      setSelected(new Set());
    } catch { toast('Some posts could not be published'); }
    finally { setBulkBusy(false); }
  };

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-gray-200 rounded-xl">
        <p className="text-sm font-medium text-gray-500">No brand selected</p>
        <p className="text-xs text-gray-400 mt-1">Select a brand from the sidebar to see its posts.</p>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20 gap-2 bg-white border border-gray-200 rounded-xl text-gray-400">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading posts…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl">
        <AlertCircle size={15} className="text-red-500 shrink-0" />
        <p className="text-[13px] text-red-700 font-medium flex-1">{error}</p>
        <button onClick={() => fetchPosts(activeBrand.id)} className="text-xs font-semibold text-red-600 hover:underline shrink-0">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] overflow-hidden border-y border-gray-200 bg-white">
      <header className="flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-orange-50/75 via-white to-amber-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-xl font-bold tracking-tight text-gray-900">Post Queue</h1><p className="mt-0.5 text-sm text-gray-500">Manage all your scheduled, published, and draft posts in one place.</p></div>
        <Link href="/posts/new" className="btn-clay-primary inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-3.5 text-xs font-semibold"><Plus size={14} strokeWidth={2.5} /> New post</Link>
      </header>
      <div className="grid min-h-[680px] grid-cols-1 lg:grid-cols-[190px_minmax(330px,0.9fr)_minmax(320px,1.1fr)]">
        <aside className="border-b border-gray-100 bg-gray-50/70 p-3 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Post status</p>
          <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {TABS.map(({ key, label }) => <button key={key} onClick={() => { setActiveTab(key); setSelected(new Set()); setFocusedPostId(null); }} className={cn('flex min-w-max items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors', activeTab === key ? 'bg-white text-orange-600 shadow-sm ring-1 ring-orange-100' : 'text-gray-600 hover:bg-white hover:text-gray-900')}><span className={cn('h-1.5 w-1.5 rounded-full', key === 'Failed' ? 'bg-red-500' : key === 'Scheduled' ? 'bg-amber-400' : key === 'Published' ? 'bg-emerald-500' : key === 'Draft' ? 'bg-gray-400' : 'bg-orange-400')} /><span className="flex-1">{label}</span><span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', activeTab === key ? 'bg-orange-100 text-orange-600' : 'bg-gray-200/70 text-gray-400')}>{counts[key] ?? 0}</span></button>)}
          </div>
          <div className="mt-5 hidden rounded-xl border border-orange-100 bg-orange-50/70 p-3 lg:block"><CalendarDays size={16} className="text-orange-500" /><p className="mt-2 text-xs font-bold text-gray-800">Plan ahead</p><p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">Use Calendar to see the full publishing rhythm.</p><Link href="/calendar" className="mt-2 inline-block text-[11px] font-semibold text-orange-600 hover:underline">Open calendar →</Link></div>
        </aside>

        <section className="flex min-h-0 flex-col border-b border-gray-100 lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-100 p-3"><div className="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3"><Search size={14} className="shrink-0 text-gray-400" /><input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search posts…" className="min-w-0 flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400" /></div><div className="mt-2 flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-gray-400">{filtered.length} post{filtered.length !== 1 ? 's' : ''}</span><Select value={sort} onValueChange={(value) => value && setSort(value as SortKey)}><SelectTrigger className="h-7 min-w-[124px] border-gray-200 bg-white text-[11px] text-gray-600"><SelectValue placeholder="Sort order" /></SelectTrigger><SelectContent><SelectItem value="date-asc">Earliest first</SelectItem><SelectItem value="date-desc">Latest first</SelectItem></SelectContent></Select></div></div>
          {selected.size > 0 && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 bg-orange-50 px-3 py-2"><span className="text-[11px] font-bold text-orange-700">{selected.size} selected</span><div className="flex gap-1.5"><button onClick={() => setSelected(new Set())} className="text-[11px] font-semibold text-gray-500 hover:text-gray-800">Clear</button><button disabled={bulkBusy || !hasPublishable} onClick={() => void handleBulkPublish()} className="text-[11px] font-semibold text-orange-600 disabled:opacity-50">Publish</button><button disabled={bulkBusy} onClick={() => void handleBulkDelete()} className="text-[11px] font-semibold text-red-600 disabled:opacity-50">Delete</button></div></div>}
          {filtered.length > 0 && <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/70 px-3 py-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} ref={(element) => { if (element) element.indeterminate = someSelected; }} className="h-3.5 w-3.5 rounded border-gray-300 accent-orange-500" /><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Posts</span></div>}
          <div className="min-h-0 flex-1 overflow-y-auto">{filtered.length === 0 ? <EmptyState tab={activeTab} /> : <div className="divide-y divide-gray-100">{filtered.map((post) => <QueueRow key={post.id} post={post} brandId={activeBrand.id} selected={selected.has(post.id)} active={focusedPost?.id === post.id} onOpen={() => setFocusedPostId(post.id)} onToggle={() => toggleRow(post.id)} />)}</div>}</div>
        </section>

        <aside className="hidden min-h-0 flex-col bg-white lg:flex">
          {focusedPost ? <><div className="flex items-start justify-between border-b border-gray-100 p-4"><div className="min-w-0"><div className="mb-2 flex items-center gap-2"><span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_CONFIG[focusedPost.status].bg, STATUS_CONFIG[focusedPost.status].text)}><span className={cn('h-1.5 w-1.5 rounded-full', STATUS_CONFIG[focusedPost.status].dot)} />{STATUS_CONFIG[focusedPost.status].label}</span><span className="text-[10px] text-gray-400">{formatScheduledAt(focusedPost.scheduledAt)}</span></div><h2 className="truncate text-sm font-bold text-gray-900">{focusedPost.title}</h2></div><Link href={`/posts/${focusedPost.id}/edit`} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-orange-600"><Edit2 size={15} /></Link></div><div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: activeBrand.colorHex }}>{activeBrand.name[0].toUpperCase()}</div><div><p className="text-xs font-semibold text-gray-800">{activeBrand.name}</p><p className="text-[10px] text-gray-400">Preview · Public</p></div></div>{focusedPost.media[0]?.url && <img src={focusedPost.media[0].url} alt="Post media" className="max-h-56 w-full object-cover" />}<p className="whitespace-pre-wrap px-3 py-3 text-xs leading-relaxed text-gray-700">{focusedPost.targets[0]?.caption || 'No caption added yet.'}</p></div><div className="mt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Publishing to</p><div className="flex flex-wrap gap-1.5">{[...new Set(focusedPost.targets.map((target) => target.account?.platform).filter(Boolean))].map((platform) => <span key={platform} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600">{platform}</span>)}</div></div>{focusedPost.status === 'Failed' && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3"><p className="text-xs font-bold text-red-700">Publishing needs attention</p><p className="mt-1 text-[11px] leading-relaxed text-red-600">{focusedPost.targets.find((target) => target.errorMessage)?.errorMessage ?? 'Open the post to review and retry publishing.'}</p></div>}</div><div className="flex gap-2 border-t border-gray-100 p-3"><Link href={`/posts/${focusedPost.id}/edit`} className="btn-clay-secondary flex h-8 flex-1 items-center justify-center gap-1.5 px-3 text-xs font-semibold"><Edit2 size={13} /> Edit</Link>{(focusedPost.status === 'Draft' || focusedPost.status === 'Failed') && <button onClick={() => void publishNow(activeBrand.id, focusedPost.id)} className="btn-clay-primary flex h-8 flex-1 items-center justify-center gap-1.5 px-3 text-xs font-semibold"><Send size={13} /> {focusedPost.status === 'Failed' ? 'Retry' : 'Publish'}</button>}</div></> : <div className="flex h-full flex-col items-center justify-center px-8 text-center"><ImageIcon size={24} className="text-gray-200" /><p className="mt-3 text-xs font-semibold text-gray-500">Select a post to inspect it</p><p className="mt-1 text-[11px] leading-relaxed text-gray-400">Its content, channels, status, and available actions will appear here.</p></div>}
        </aside>
      </div>
    </div>
  );
}
