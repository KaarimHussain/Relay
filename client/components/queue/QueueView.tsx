'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  Search, SlidersHorizontal, MoreHorizontal, Edit2,
  Clock, Copy, Trash2, Send, Plus, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostComposer } from '@/components/posts/PostComposer';

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'scheduled' | 'published' | 'draft' | 'failed';
type Platform = 'instagram' | 'x' | 'linkedin' | 'facebook' | 'tiktok';

interface QueuePost {
  id: number;
  title: string;
  excerpt: string;
  platforms: Platform[];
  status: Status;
  scheduledAt: string;   // display string
  sortDate: number;      // timestamp for sorting
  hasMedia: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_POSTS: QueuePost[] = [
  { id: 1,  title: '5 ways AI is changing how brands approach content strategy in 2025', excerpt: 'The rise of large language models has fundamentally shifted...', platforms: ['instagram','linkedin'], status: 'scheduled', scheduledAt: 'Today · 2:30 PM',      sortDate: Date.now() + 1 * 3600000,  hasMedia: true  },
  { id: 2,  title: 'Behind the scenes: our product team\'s weekly brainstorm ritual',    excerpt: 'Every Monday at 10am we gather in the war room...',            platforms: ['instagram','x'],         status: 'scheduled', scheduledAt: 'Today · 5:00 PM',      sortDate: Date.now() + 4 * 3600000,  hasMedia: false },
  { id: 3,  title: 'New feature drop! Introducing multi-platform post previews',          excerpt: 'We built something that our power users have been asking for...', platforms: ['instagram','x','linkedin'], status: 'scheduled', scheduledAt: 'Tomorrow · 9:00 AM', sortDate: Date.now() + 20 * 3600000, hasMedia: true  },
  { id: 4,  title: 'The secret to consistent growth: posting cadence breakdown',          excerpt: 'Most brands fail at consistency, not creativity...',            platforms: ['linkedin'],              status: 'scheduled', scheduledAt: 'Tomorrow · 11:00 AM', sortDate: Date.now() + 22 * 3600000, hasMedia: false },
  { id: 5,  title: 'Trending audio alert — this sound is going viral right now',          excerpt: 'If you haven\'t used this audio yet, add it to your queue...',   platforms: ['instagram','facebook'],  status: 'scheduled', scheduledAt: 'Thu · 4:00 PM',      sortDate: Date.now() + 48 * 3600000, hasMedia: true  },
  { id: 6,  title: 'Thread: 10 myths about social media algorithms debunked',             excerpt: '1/ Everyone thinks the algorithm hates new accounts. Wrong.',    platforms: ['x'],                     status: 'scheduled', scheduledAt: 'Fri · 2:00 PM',      sortDate: Date.now() + 60 * 3600000, hasMedia: false },
  { id: 7,  title: 'Monday motivation: the best advice we\'ve heard from top creators',  excerpt: '"Done is better than perfect." — every creator ever.',           platforms: ['instagram','facebook'],  status: 'published', scheduledAt: 'Yesterday · 9:00 AM', sortDate: Date.now() - 24 * 3600000, hasMedia: true  },
  { id: 8,  title: 'How to grow your LinkedIn from 0 to 10K followers in 90 days',       excerpt: 'I documented everything. Here\'s the playbook.',                 platforms: ['linkedin'],              status: 'published', scheduledAt: 'Mon · 10:00 AM',     sortDate: Date.now() - 48 * 3600000, hasMedia: false },
  { id: 9,  title: 'Case study: 200% reach increase with one simple change',              excerpt: 'We stopped posting at 9am and moved to 7pm. Here\'s what happened.', platforms: ['instagram','linkedin'], status: 'published', scheduledAt: 'Sun · 3:00 PM', sortDate: Date.now() - 72 * 3600000, hasMedia: true  },
  { id: 10, title: 'Q&A: answering your top social media questions',                       excerpt: 'You asked. We\'re answering all 47 questions in this thread.',   platforms: ['x','facebook'],          status: 'published', scheduledAt: 'Sat · 1:00 PM',     sortDate: Date.now() - 96 * 3600000, hasMedia: false },
  { id: 11, title: 'Draft: Year-end social media trends report 2025',                     excerpt: 'Working on a big report covering all major platforms...',         platforms: ['linkedin'],              status: 'draft',     scheduledAt: 'Not scheduled',      sortDate: 0,                         hasMedia: false },
  { id: 12, title: 'Draft: Holiday content series — 12 days of tips',                    excerpt: 'Planning a 12-part series for December...',                      platforms: ['instagram','facebook'],  status: 'draft',     scheduledAt: 'Not scheduled',      sortDate: 0,                         hasMedia: true  },
  { id: 13, title: 'Draft: Collaboration post with @partner',                             excerpt: 'Waiting for partner approval before we can finalize...',          platforms: ['instagram'],             status: 'draft',     scheduledAt: 'Not scheduled',      sortDate: 0,                         hasMedia: false },
  { id: 14, title: 'Product launch announcement — Q4 campaign',                           excerpt: 'Publishing failed due to expired Instagram token.',               platforms: ['instagram','facebook'],  status: 'failed',    scheduledAt: 'Yesterday · 6:00 PM', sortDate: Date.now() - 20 * 3600000, hasMedia: true  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { label: string; dot: string; bg: string; text: string }> = {
  scheduled: { label: 'Scheduled', dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
  published: { label: 'Published', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  draft:     { label: 'Draft',     dot: 'bg-gray-400',    bg: 'bg-gray-100',   text: 'text-gray-500'    },
  failed:    { label: 'Failed',    dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-600'     },
};

const PLATFORM_CONFIG: Record<Platform, { abbr: string; color: string }> = {
  instagram: { abbr: 'ig', color: 'bg-pink-500'  },
  x:         { abbr: 'x',  color: 'bg-gray-800'  },
  linkedin:  { abbr: 'in', color: 'bg-blue-700'  },
  facebook:  { abbr: 'f',  color: 'bg-blue-600'  },
  tiktok:    { abbr: 'tt', color: 'bg-gray-950'  },
};

type SortKey = 'date-asc' | 'date-desc' | 'platform';

const TABS: { key: Status | 'all'; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' },
  { key: 'draft',     label: 'Draft'     },
  { key: 'failed',    label: 'Failed'    },
];

// ─── Row action menu ──────────────────────────────────────────────────────────

function RowMenu({ status, onClose }: { status: Status; onClose: () => void }) {
  return (
    <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 overflow-hidden">
      <button onClick={onClose} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
        <Edit2 size={13} className="text-gray-400" /> Edit post
      </button>
      {status === 'scheduled' && (
        <button onClick={onClose} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
          <Clock size={13} className="text-gray-400" /> Reschedule
        </button>
      )}
      {status === 'draft' && (
        <button onClick={onClose} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-orange-600 hover:bg-orange-50 transition-colors">
          <Send size={13} /> Publish now
        </button>
      )}
      {status === 'failed' && (
        <button onClick={onClose} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-orange-600 hover:bg-orange-50 transition-colors">
          <Send size={13} /> Retry publish
        </button>
      )}
      <button onClick={onClose} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
        <Copy size={13} className="text-gray-400" /> Duplicate
      </button>
      <div className="my-1 h-px bg-gray-100" />
      <button onClick={onClose} className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors">
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}

// ─── Post row ─────────────────────────────────────────────────────────────────

function QueueRow({
  post,
  selected,
  onToggle,
}: {
  post: QueuePost;
  selected: boolean;
  onToggle: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = STATUS_CONFIG[post.status];

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3.5 transition-colors group',
        selected ? 'bg-orange-50/50' : 'hover:bg-gray-50/70'
      )}
    >
      {/* Checkbox */}
      <div className="pt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-gray-300 accent-orange-500 cursor-pointer"
        />
      </div>

      {/* Media thumbnail placeholder */}
      <div
        className={cn(
          'w-10 h-10 rounded-lg shrink-0 flex items-center justify-center border border-gray-100',
          post.hasMedia ? 'bg-orange-50' : 'bg-gray-50'
        )}
      >
        {post.hasMedia ? (
          <div className="w-4 h-4 rounded bg-orange-200" />
        ) : (
          <div className="text-gray-300 text-[10px] font-bold">Aa</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-900 truncate leading-snug">{post.title}</p>
        <p className="text-[12px] text-gray-400 truncate mt-0.5">{post.excerpt}</p>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {/* Platforms */}
          <div className="flex -space-x-1">
            {post.platforms.map((p) => (
              <div
                key={p}
                title={p}
                className={cn(
                  'w-5 h-5 rounded-full ring-2 ring-white flex items-center justify-center text-white text-[8px] font-bold',
                  PLATFORM_CONFIG[p].color
                )}
              >
                {PLATFORM_CONFIG[p].abbr[0].toUpperCase()}
              </div>
            ))}
          </div>

          {/* Status pill */}
          <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium', cfg.bg, cfg.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
            {cfg.label}
          </span>

          {/* Time */}
          <span className="text-[12px] text-gray-400 flex items-center gap-1">
            <Clock size={11} className="text-gray-300" />
            {post.scheduledAt}
          </span>
        </div>
      </div>

      {/* Row actions */}
      <div className="relative shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
        {post.status === 'draft' && (
          <button className="h-7 px-2.5 text-[11px] font-medium text-orange-600 bg-orange-50 border border-orange-100 rounded-md hover:bg-orange-100 transition-colors">
            Schedule
          </button>
        )}
        {post.status === 'failed' && (
          <button className="h-7 px-2.5 text-[11px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors">
            Retry
          </button>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <MoreHorizontal size={15} />
        </button>
        {menuOpen && <RowMenu status={post.status} onClose={() => setMenuOpen(false)} />}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Status | 'all' }) {
  const messages: Record<Status | 'all', { title: string; body: string }> = {
    all:       { title: 'Your queue is empty',           body: 'Create your first post to get started.'         },
    scheduled: { title: 'No scheduled posts',             body: 'Schedule a post and it will appear here.'       },
    published: { title: 'No published posts yet',         body: 'Published posts will show up here.'             },
    draft:     { title: 'No drafts',                      body: 'Save a post as a draft to revisit it later.'    },
    failed:    { title: 'No failed posts',                body: 'Any posts that fail to publish will appear here.' },
  };
  const { title, body } = messages[tab];
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
  const [activeTab, setActiveTab] = useState<Status | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date-asc');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [composerOpen, setComposerOpen] = useState(false);

  const filtered = useMemo(() => {
    let posts = MOCK_POSTS;
    if (activeTab !== 'all') posts = posts.filter((p) => p.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      posts = posts.filter((p) => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q));
    }
    return [...posts].sort((a, b) => {
      if (sort === 'date-asc')  return a.sortDate - b.sortDate;
      if (sort === 'date-desc') return b.sortDate - a.sortDate;
      return a.platforms[0].localeCompare(b.platforms[0]);
    });
  }, [activeTab, search, sort]);

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.id)));

  const toggleRow = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Tab counts
  const counts = useMemo(() => {
    const c: Partial<Record<Status | 'all', number>> = { all: MOCK_POSTS.length };
    for (const p of MOCK_POSTS) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, []);

  return (
    <>
      <div className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">

        {/* Tabs */}
        <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-gray-200 overflow-x-auto scrollbar-none">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSelected(new Set()); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-t-md -mb-px border-b-2 transition-colors',
                activeTab === key
                  ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {label}
              {counts[key] !== undefined && counts[key]! > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums',
                    activeTab === key ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-2.5 border-b border-gray-100">
          {/* Search — full width on mobile */}
          <div className="flex items-center gap-2 h-8 flex-1 px-3 bg-gray-50 border border-gray-200 rounded-lg">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts…"
              className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-8 flex-1 sm:flex-none pl-2.5 pr-7 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-600 outline-none appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              <option value="date-asc">Earliest first</option>
              <option value="date-desc">Latest first</option>
              <option value="platform">By platform</option>
            </select>
            <Link href="/posts/new" className="btn-clay-primary h-8 px-3 text-xs gap-1 font-semibold inline-flex items-center shrink-0">
              <Plus size={13} strokeWidth={2.5} />
              New post
            </Link>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-orange-50/80 border-b border-orange-100">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-orange-700">
                {selected.size} post{selected.size > 1 ? 's' : ''} selected
              </span>
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-800 transition-colors">Clear</button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="btn-clay-secondary h-7 px-2.5 text-xs gap-1 inline-flex items-center">
                <Clock size={12} /> Reschedule
              </button>
              <button className="btn-clay-primary h-7 px-2.5 text-xs gap-1 inline-flex items-center">
                <Send size={12} /> Publish now
              </button>
              <button className="h-7 px-2.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        )}

        {/* Column header */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="w-4 shrink-0">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-gray-300 accent-orange-500 cursor-pointer"
              />
            </div>
            <div className="w-10 shrink-0" />
            <span className="flex-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Post</span>
            <div className="w-32 shrink-0" />
          </div>
        )}

        {/* Rows */}
        {filtered.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((post) => (
              <QueueRow
                key={post.id}
                post={post}
                selected={selected.has(post.id)}
                onToggle={() => toggleRow(post.id)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
            <span className="text-[12px] text-gray-400">
              Showing {filtered.length} of {MOCK_POSTS.length} posts
            </span>
            <div className="flex items-center gap-1">
              <button className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-40" disabled>
                <ChevronDown size={13} className="rotate-90" />
              </button>
              <span className="text-[12px] text-gray-500 px-2">Page 1</span>
              <button className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-40" disabled>
                <ChevronDown size={13} className="-rotate-90" />
              </button>
            </div>
          </div>
        )}
      </div>

      {composerOpen && <PostComposer onClose={() => setComposerOpen(false)} />}
    </>
  );
}
