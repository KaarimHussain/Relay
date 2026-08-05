'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, MoreHorizontal, Edit2, Clock,
  Trash2, Send, Plus, ChevronDown, AlertCircle, Loader2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePostStore, Post, PostStatus } from '@/store/post';
import { useBrandStore } from '@/store/brand';
import { useToast } from '@/components/ui/toast';
import { formatScheduledAt, sortDate } from '@/lib/format';
import { ApiError } from '@/lib/api';

// ─── Config ───────────────────────────────────────────────────────────────────

type FilterStatus = PostStatus | 'all';
type SortKey = 'date-asc' | 'date-desc';

const STATUS_CONFIG: Record<PostStatus, { label: string; dot: string; bg: string; text: string }> = {
  Draft:      { label: 'Draft',      dot: 'bg-gray-400',    bg: 'bg-gray-100',   text: 'text-gray-500'    },
  Scheduled:  { label: 'Scheduled',  dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
  Publishing: { label: 'Publishing', dot: 'bg-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-700'    },
  Published:  { label: 'Published',  dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  Failed:     { label: 'Failed',     dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-600'     },
};

const PLATFORM_CONFIG: Record<string, { abbr: string; color: string }> = {
  Instagram: { abbr: 'IG', color: 'bg-pink-500'  },
  X:         { abbr: 'X',  color: 'bg-gray-800'  },
  LinkedIn:  { abbr: 'LI', color: 'bg-blue-700'  },
  Facebook:  { abbr: 'FB', color: 'bg-blue-600'  },
  TikTok:    { abbr: 'TT', color: 'bg-gray-950'  },
};

const TABS: { key: FilterStatus; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'Scheduled', label: 'Scheduled' },
  { key: 'Published', label: 'Published' },
  { key: 'Draft',     label: 'Drafts'    },
  { key: 'Failed',    label: 'Failed'    },
];

// ─── Row menu ─────────────────────────────────────────────────────────────────

function RowMenu({
  post, brandId, onClose,
}: { post: Post; brandId: string; onClose: () => void }) {
  const { deletePost, publishNow, cancelPost } = usePostStore();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, msg: string) => {
    setBusy(true);
    try { await action(); toast(msg, 'success'); onClose(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 overflow-hidden">
      <Link
        href={`/posts/${post.id}/edit`}
        onClick={onClose}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Edit2 size={13} className="text-gray-400" /> Edit post
      </Link>
      {post.status === 'Scheduled' && (
        <button disabled={busy} onClick={() => run(() => cancelPost(brandId, post.id), 'Post moved back to draft')}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
          <X size={13} className="text-gray-400" /> Cancel schedule
        </button>
      )}
      {(post.status === 'Draft' || post.status === 'Failed') && (
        <button disabled={busy} onClick={() => run(async () => { await publishNow(brandId, post.id); }, 'Post queued for publishing')}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50">
          <Send size={13} /> {post.status === 'Failed' ? 'Retry publish' : 'Publish now'}
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
  post, brandId, selected, onToggle,
}: { post: Post; brandId: string; selected: boolean; onToggle: () => void }) {
  const { schedulePost, publishNow } = usePostStore();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cfg = STATUS_CONFIG[post.status];
  const excerpt = post.targets[0]?.caption ?? '—';
  const platforms = [...new Set(post.targets.map((t) => t.account.platform))];

  const handlePublishNow = async () => {
    setBusy(true);
    try { await publishNow(brandId, post.id); toast('Post queued for publishing', 'success'); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed to publish'); }
    finally { setBusy(false); }
  };

  return (
    <div className={cn('flex items-start gap-3 px-4 py-3.5 transition-colors group relative', selected ? 'bg-orange-50/50' : 'hover:bg-gray-50/70')}>
      <div className="pt-0.5 shrink-0">
        <input type="checkbox" checked={selected} onChange={onToggle}
          className="w-4 h-4 rounded border-gray-300 accent-orange-500 cursor-pointer" />
      </div>

      {/* Media thumbnail */}
      <div className={cn('w-10 h-10 rounded-lg shrink-0 flex items-center justify-center border border-gray-100', post.media.length ? 'bg-orange-50' : 'bg-gray-50')}>
        {post.media.length
          ? <div className="w-4 h-4 rounded bg-orange-200" />
          : <div className="text-gray-300 text-[10px] font-bold">Aa</div>}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-900 truncate leading-snug">{post.title}</p>
        <p className="text-[12px] text-gray-400 truncate mt-0.5">{excerpt}</p>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {/* Platform dots */}
          <div className="flex -space-x-1">
            {platforms.map((p) => {
              const pcfg = PLATFORM_CONFIG[p] ?? { abbr: p[0], color: 'bg-gray-400' };
              return (
                <div key={p} title={p}
                  className={cn('w-5 h-5 rounded-full ring-2 ring-white flex items-center justify-center text-white text-[8px] font-bold', pcfg.color)}>
                  {pcfg.abbr[0]}
                </div>
              );
            })}
          </div>

          <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium', cfg.bg, cfg.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
            {cfg.label}
          </span>

          <span className="text-[12px] text-gray-400 flex items-center gap-1">
            <Clock size={11} className="text-gray-300" />
            {formatScheduledAt(post.scheduledAt)}
          </span>
        </div>

        {/* Failed error message */}
        {post.status === 'Failed' && post.targets.some((t) => t.errorMessage) && (
          <p className="text-[11px] text-red-500 mt-1.5 truncate">
            {post.targets.find((t) => t.errorMessage)?.errorMessage}
          </p>
        )}
      </div>

      {/* Row actions */}
      <div className="relative shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
        {(post.status === 'Draft' || post.status === 'Failed') && (
          <button disabled={busy} onClick={handlePublishNow}
            className="h-7 px-2.5 text-[11px] font-medium text-orange-600 bg-orange-50 border border-orange-100 rounded-md hover:bg-orange-100 transition-colors disabled:opacity-50">
            {busy ? '…' : post.status === 'Failed' ? 'Retry' : 'Publish'}
          </button>
        )}
        <button onClick={() => setMenuOpen((v) => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <MoreHorizontal size={15} />
        </button>
        {menuOpen && <RowMenu post={post} brandId={brandId} onClose={() => setMenuOpen(false)} />}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: FilterStatus }) {
  const messages: Record<FilterStatus, { title: string; body: string }> = {
    all:       { title: 'Your queue is empty',    body: 'Create your first post to get started.'         },
    Scheduled: { title: 'No scheduled posts',      body: 'Schedule a post and it will appear here.'       },
    Published: { title: 'No published posts yet',  body: 'Published posts will show up here.'             },
    Draft:     { title: 'No drafts',               body: 'Save a post as a draft to revisit it later.'    },
    Failed:    { title: 'No failed posts',          body: 'Any posts that fail to publish appear here.'    },
    Publishing:{ title: 'Nothing publishing',       body: 'Posts being published will appear here.'        },
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
  const { posts, status, error, fetchPosts, deletePost, publishNow } = usePostStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date-asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

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

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.id)));
  const toggleRow = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

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
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => publishNow(activeBrand.id, id)));
      toast(`Queued ${selected.size} post${selected.size > 1 ? 's' : ''} for publishing`, 'success');
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
    <div className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-gray-200 overflow-x-auto scrollbar-none">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => { setActiveTab(key); setSelected(new Set()); }}
            className={cn('flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-t-md -mb-px border-b-2 transition-colors whitespace-nowrap',
              activeTab === key ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
            {label}
            {!!counts[key] && (
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums',
                activeTab === key ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400')}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2 h-8 flex-1 px-3 bg-gray-50 border border-gray-200 rounded-lg">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 outline-none" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-8 pl-2.5 pr-7 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-600 outline-none appearance-none cursor-pointer hover:bg-gray-50"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
            <option value="date-asc">Earliest first</option>
            <option value="date-desc">Latest first</option>
          </select>
          <Link href="/posts/new" className="btn-clay-primary h-8 px-3 text-xs gap-1 font-semibold inline-flex items-center shrink-0">
            <Plus size={13} strokeWidth={2.5} /> New post
          </Link>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-orange-50/80 border-b border-orange-100">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-orange-700">{selected.size} post{selected.size > 1 ? 's' : ''} selected</span>
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-800 transition-colors">Clear</button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button disabled={bulkBusy} onClick={handleBulkPublish}
              className="btn-clay-primary h-7 px-2.5 text-xs gap-1 inline-flex items-center disabled:opacity-50">
              <Send size={12} /> Publish now
            </button>
            <button disabled={bulkBusy} onClick={handleBulkDelete}
              className="h-7 px-2.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 disabled:opacity-50">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Column header */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
          <div className="w-4 shrink-0">
            <input type="checkbox" checked={allSelected} onChange={toggleAll}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              className="w-4 h-4 rounded border-gray-300 accent-orange-500 cursor-pointer" />
          </div>
          <div className="w-10 shrink-0" />
          <span className="flex-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Post</span>
        </div>
      )}

      {/* Rows */}
      {filtered.length === 0
        ? <EmptyState tab={activeTab} />
        : <div className="divide-y divide-gray-100">
            {filtered.map((post) => (
              <QueueRow key={post.id} post={post} brandId={activeBrand.id}
                selected={selected.has(post.id)} onToggle={() => toggleRow(post.id)} />
            ))}
          </div>
      }

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <span className="text-[12px] text-gray-400">
            {filtered.length} of {posts.length} post{posts.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
