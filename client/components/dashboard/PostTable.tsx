'use client';

import Link from 'next/link';
import { useRef, useEffect } from 'react';
import { useState } from 'react';
import { SlidersHorizontal, MoreVertical, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformBadge } from '@/components/ui/platform-icons';
import { useToast } from '@/components/ui/toast';
import { usePostStore, Post, PostStatus } from '@/store/post';
import { useBrandStore } from '@/store/brand';
import { formatScheduledAt } from '@/lib/format';

const PLATFORM_BADGE_ID: Record<string, string> = {
  Instagram: 'instagram', X: 'x', LinkedIn: 'linkedin', Facebook: 'facebook', TikTok: 'tiktok',
};

const STATUS_CONFIG: Record<PostStatus, { bg: string; text: string; dot: string }> = {
  Scheduled:  { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  Published:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500'  },
  Draft:      { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400'    },
  Publishing: { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400'    },
  Failed:     { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
};

function IndeterminateCheckbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate: boolean; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      className="w-3.5 h-3.5 rounded border-gray-300 accent-orange-600 cursor-pointer" />
  );
}

export function PostTable() {
  const { toast } = useToast();
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const posts = usePostStore((s) => s.posts);
  const postStoreStatus = usePostStore((s) => s.status);
  const { deletePost, publishNow, retryFailed } = usePostStore();

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const canPublish = (post: Post) => post.status === 'Draft' || post.status === 'Failed';

  // Show latest 5 posts sorted by updatedAt desc
  const recent = [...posts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const publishableCount = [...selected].filter((id) => recent.find((p) => p.id === id && canPublish(p))).length;

  const allSelected = selected.size === recent.length && recent.length > 0;
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(recent.map((p) => p.id)));
  const toggleRow = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handlePublish = async () => {
    if (!activeBrand) return;
    const toPublish = [...selected].filter((id) => recent.find((p) => p.id === id && canPublish(p)));
    if (toPublish.length === 0) return;
    await Promise.all(toPublish.map((id) => {
      const post = recent.find((item) => item.id === id);
      return (post?.status === 'Failed' ? retryFailed(activeBrand.id, id) : publishNow(activeBrand.id, id)).catch(() => null);
    }));
    toast(`${toPublish.length} post${toPublish.length === 1 ? '' : 's'} sent for publishing`, 'success');
    setSelected(new Set());
  };

  const handleDelete = async () => {
    if (!activeBrand) return;
    await Promise.all([...selected].map((id) => deletePost(activeBrand.id, id).catch(() => null)));
    toast(`Deleted ${selected.size} post(s)`, 'info');
    setSelected(new Set());
  };

  const loading = postStoreStatus === 'loading' || postStoreStatus === 'idle';
  const error   = postStoreStatus === 'error';

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Recent Posts</h2>
          {!loading && (
            <span className="text-[11px] font-semibold text-gray-400">({recent.length} of {posts.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 size={13} className="animate-spin text-gray-400" />}
          <Link href="/queue" className="btn-clay-secondary h-7 px-2.5 text-xs gap-1.5 font-medium">
            <SlidersHorizontal size={13} /> View all
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-100">
          <AlertCircle size={13} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-700">Failed to load posts.</p>
        </div>
      )}

      {/* No brand */}
      {!activeBrand && !loading && (
        <div className="py-10 text-center text-gray-400 text-[13px]">Select a brand to see your posts.</div>
      )}

      {/* Empty */}
      {activeBrand && !loading && !error && recent.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-[13px] font-medium text-gray-500">No posts yet</p>
          <Link href="/posts/new" className="text-xs text-orange-500 hover:text-orange-600 font-medium mt-1 inline-block">
            Create your first post →
          </Link>
        </div>
      )}

      {recent.length > 0 && (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden md:block">
            <div className="flex items-center px-4 py-2 bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <div className="w-8 shrink-0">
                <IndeterminateCheckbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
              </div>
              <div className="flex-1">Post Title</div>
              <div className="w-28 shrink-0">Platforms</div>
              <div className="w-28 shrink-0">Status</div>
              <div className="w-36 shrink-0">Scheduled</div>
              <div className="w-8 shrink-0" />
            </div>

            <div className="divide-y divide-gray-100">
              {recent.map((post) => {
                const isSelected = selected.has(post.id);
                const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.Draft;
                const platforms = [...new Set(post.targets.map((t) => t.account?.platform).filter(Boolean))];
                return (
                  <div key={post.id}
                    className={cn('flex items-center px-4 py-2.5 transition-colors group',
                      isSelected ? 'bg-orange-50/50' : 'hover:bg-gray-50/60')}>
                    <div className="w-8 shrink-0">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(post.id)}
                        disabled={!canPublish(post)}
                        className="w-3.5 h-3.5 rounded border-gray-300 accent-orange-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-xs font-medium text-gray-900 truncate hover:text-orange-600 transition-colors">
                        {post.title}
                      </p>
                    </div>
                    <div className="w-28 shrink-0 flex items-center">
                      <div className="flex -space-x-1.5">
                        {platforms.map((p) => (
                          <PlatformBadge key={p} platform={PLATFORM_BADGE_ID[p] ?? p.toLowerCase()} size="sm" />
                        ))}
                      </div>
                    </div>
                    <div className="w-28 shrink-0">
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium', cfg.bg, cfg.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
                        {post.status}
                      </span>
                    </div>
                    <div className="w-36 shrink-0">
                      <span className="text-xs text-gray-500 font-medium">{formatScheduledAt(post.scheduledAt)}</span>
                    </div>
                    <div className="w-8 shrink-0 flex justify-center">
                      <Link href={`/posts/${post.id}/edit`}
                        className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <MoreVertical size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Mobile card list ── */}
          <div className="md:hidden divide-y divide-gray-100">
            {recent.map((post) => {
              const isSelected = selected.has(post.id);
              const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.Draft;
              const platforms = [...new Set(post.targets.map((t) => t.account?.platform).filter(Boolean))];
              return (
                <div key={post.id}
                  className={cn('flex items-start gap-3 px-4 py-3 transition-colors', isSelected ? 'bg-orange-50/50' : '')}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleRow(post.id)}
                    disabled={!canPublish(post)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 accent-orange-600 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 leading-snug line-clamp-2">{post.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <div className="flex -space-x-1.5">
                        {platforms.map((p) => (
                          <PlatformBadge key={p} platform={PLATFORM_BADGE_ID[p] ?? p.toLowerCase()} size="sm" />
                        ))}
                      </div>
                      <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', cfg.bg, cfg.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />{post.status}
                      </span>
                      <span className="text-[11px] text-gray-400">{formatScheduledAt(post.scheduledAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-orange-50/90 border-t border-orange-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-orange-700">{selected.size} selected</span>
                <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-800 transition-colors font-medium">Clear</button>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={handlePublish} disabled={publishableCount === 0} className={cn("btn-clay-primary h-7 px-2.5 text-xs", publishableCount === 0 && "opacity-50 cursor-not-allowed")}>Publish / retry</button>
                <button onClick={handleDelete} className="h-7 px-2.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">Delete</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
