'use client';

import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, MoreVertical, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformBadge } from '@/components/ui/platform-icons';
import { useToast } from '@/components/ui/toast';

type PostStatus = 'Scheduled' | 'Published' | 'Draft';

interface Post {
  id: number;
  title: string;
  platforms: string[];
  status: PostStatus;
  scheduledAt: string;
}

const posts: Post[] = [
  {
    id: 1,
    title: '5 ways AI is changing how brands approach content strategy in 2025',
    platforms: ['instagram', 'linkedin'],
    status: 'Scheduled',
    scheduledAt: 'Today, 2:30 PM',
  },
  {
    id: 2,
    title: "Behind the scenes: our product team's weekly brainstorm ritual",
    platforms: ['instagram', 'x'],
    status: 'Scheduled',
    scheduledAt: 'Today, 5:00 PM',
  },
  {
    id: 3,
    title: 'How to grow your LinkedIn presence from 0 to 10K followers',
    platforms: ['linkedin'],
    status: 'Draft',
    scheduledAt: 'Not scheduled',
  },
  {
    id: 4,
    title: 'New feature drop! Introducing multi-platform post previews',
    platforms: ['instagram', 'x', 'linkedin'],
    status: 'Published',
    scheduledAt: 'Yesterday, 11:00 AM',
  },
  {
    id: 5,
    title: "Monday motivation: the best advice we've heard from top creators",
    platforms: ['instagram', 'facebook'],
    status: 'Published',
    scheduledAt: 'Mon, Aug 4, 9:00 AM',
  },
];

const statusConfig: Record<PostStatus, { bg: string; text: string; dot: string }> = {
  Scheduled: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  Published: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Draft:     { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-3.5 h-3.5 rounded border-gray-300 accent-indigo-600 cursor-pointer"
    />
  );
}

export function PostTable() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const allSelected = selected.size === posts.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(posts.map((p) => p.id)));
  };

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePublish = () => {
    toast(`${selected.size} post(s) published successfully!`, 'success');
    setSelected(new Set());
  };

  const handleReschedule = () => {
    toast(`Rescheduled ${selected.size} post(s)`, 'info');
    setSelected(new Set());
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
      {/* Table title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Post Queue</h2>
          <span className="text-[11px] font-semibold text-gray-400">({posts.length} posts)</span>
        </div>
        <button 
          onClick={() => toast('Filter applied', 'info')}
          className="btn-clay-secondary h-7 px-2.5 text-xs gap-1.5 font-medium"
        >
          <SlidersHorizontal size={13} />
          Filter
        </button>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-4 py-2 bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        <div className="w-8 shrink-0 flex items-center">
          <IndeterminateCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
          />
        </div>
        <div className="flex-1">Post Title</div>
        <div className="w-28 shrink-0">Platforms</div>
        <div className="w-28 shrink-0">Status</div>
        <div className="w-36 shrink-0">Scheduled</div>
        <div className="w-8 shrink-0" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100 bg-white">
        {posts.map((post) => {
          const isSelected = selected.has(post.id);
          const cfg = statusConfig[post.status];

          return (
            <div
              key={post.id}
              className={cn(
                'flex items-center px-4 py-2.5 transition-colors duration-150 group',
                isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50/60'
              )}
            >
              <div className="w-8 shrink-0 flex items-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleRow(post.id)}
                  className="w-3.5 h-3.5 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs font-medium text-gray-900 truncate hover:text-indigo-600 transition-colors cursor-pointer">
                  {post.title}
                </p>
              </div>

              <div className="w-28 shrink-0 flex items-center">
                <div className="flex -space-x-1.5">
                  {post.platforms.map((p) => (
                    <PlatformBadge key={p} platform={p} size="sm" />
                  ))}
                </div>
              </div>

              <div className="w-28 shrink-0">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium',
                    cfg.bg,
                    cfg.text
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
                  {post.status}
                </span>
              </div>

              <div className="w-36 shrink-0">
                <span className="text-xs text-gray-500 font-medium">{post.scheduledAt}</span>
              </div>

              <div className="w-8 shrink-0 flex justify-center">
                <button 
                  onClick={() => toast(`Editing "${post.title.slice(0, 20)}..."`, 'info')}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-indigo-50/90 border-t border-indigo-100 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-indigo-700">
              {selected.size} post{selected.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors font-medium"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleReschedule} className="btn-clay-secondary h-7 px-2.5 text-xs">
              Reschedule
            </button>
            <button onClick={handlePublish} className="btn-clay-primary h-7 px-2.5 text-xs">
              Publish Now
            </button>
            <button 
              onClick={() => { toast(`Deleted ${selected.size} post(s)`, 'info'); setSelected(new Set()); }}
              className="h-7 px-2.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
