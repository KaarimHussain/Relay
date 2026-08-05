'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarPostChip, CalendarPost } from './CalendarPostChip';
import { PostComposer } from '@/components/posts/PostComposer';

// ─── Mock post data ───────────────────────────────────────────────────────────

function buildMockPosts(year: number, month: number): CalendarPost[] {
  const d = (day: number): string => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return [
    { id: 1,  title: '5 ways AI is changing content strategy',     platform: 'instagram', status: 'published', time: '9:00 AM'  },
    { id: 2,  title: 'Behind the scenes: our brainstorm ritual',   platform: 'x',         status: 'published', time: '11:30 AM' },
    { id: 3,  title: 'LinkedIn growth from 0 to 10K followers',    platform: 'linkedin',  status: 'draft',     time: '—'        },
    { id: 4,  title: 'New feature drop! Multi-platform previews',  platform: 'instagram', status: 'scheduled', time: '2:00 PM'  },
    { id: 5,  title: 'Monday motivation: creator advice roundup',  platform: 'facebook',  status: 'scheduled', time: '9:00 AM'  },
    { id: 6,  title: 'How we write captions that convert',         platform: 'linkedin',  status: 'scheduled', time: '10:00 AM' },
    { id: 7,  title: 'Trending audio you need this week',          platform: 'tiktok',    status: 'scheduled', time: '5:00 PM'  },
    { id: 8,  title: 'Your weekly content wrap-up 🎉',             platform: 'instagram', status: 'scheduled', time: '12:00 PM' },
    { id: 9,  title: 'Thread: social media myths debunked',        platform: 'x',         status: 'scheduled', time: '3:00 PM'  },
    { id: 10, title: 'Case study: 200% reach increase in 30 days', platform: 'linkedin',  status: 'scheduled', time: '9:30 AM'  },
    { id: 11, title: 'Day in the life of a content team',          platform: 'tiktok',    status: 'scheduled', time: '4:00 PM'  },
    { id: 12, title: 'Q&A: your social media questions answered',  platform: 'instagram', status: 'draft',     time: '—'        },
    { id: 13, title: 'How to repurpose one post across 5 platforms', platform: 'facebook', status: 'scheduled', time: '11:00 AM' },
    { id: 14, title: 'The anatomy of a viral tweet',               platform: 'x',         status: 'scheduled', time: '2:30 PM'  },
  ];
}

// Spread posts across days in the current month view
function assignPostsToDays(posts: CalendarPost[], year: number, month: number): Map<string, CalendarPost[]> {
  const map = new Map<string, CalendarPost[]>();
  const daySlots = [3, 5, 7, 8, 10, 12, 14, 15, 17, 18, 20, 22, 23, 25];
  posts.forEach((post, i) => {
    const day = daySlots[i % daySlots.length];
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(post);
  });
  return map;
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function getDaysGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ─── Post detail popover ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<CalendarPost['status'], { label: string; class: string }> = {
  scheduled: { label: 'Scheduled', class: 'bg-amber-50 text-amber-700'   },
  published: { label: 'Published', class: 'bg-emerald-50 text-emerald-700' },
  draft:     { label: 'Draft',     class: 'bg-gray-100 text-gray-500'    },
};

function PostDetailPanel({ post, onClose }: { post: CalendarPost; onClose: () => void }) {
  const status = STATUS_LABEL[post.status];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-[360px] bg-white border border-gray-200 rounded-xl shadow-xl p-5 flex flex-col gap-4 mx-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] font-semibold text-gray-900 leading-snug">{post.title}</p>
          <button onClick={onClose} className="shrink-0 p-1 text-gray-400 hover:text-gray-600">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', status.class)}>
            {status.label}
          </span>
          <span className="text-[12px] text-gray-400">{post.time !== '—' ? post.time : 'Not scheduled'}</span>
          <span className="text-[12px] text-gray-400 capitalize">{post.platform}</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          <button className="flex-1 h-8 text-[12px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Edit post
          </button>
          <button className="flex-1 h-8 text-[12px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors">
            Reschedule
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Calendar View ───────────────────────────────────────────────────────

export function CalendarView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const grid = useMemo(() => getDaysGrid(year, month), [year, month]);
  const allPosts = useMemo(() => buildMockPosts(year, month), [year, month]);
  const postsByDay = useMemo(() => assignPostsToDays(allPosts, year, month), [allPosts, year, month]);

  const filteredPostsByDay = useMemo(() => {
    if (platformFilter === 'all') return postsByDay;
    const filtered = new Map<string, CalendarPost[]>();
    postsByDay.forEach((posts, key) => {
      const f = posts.filter((p) => p.platform === platformFilter);
      if (f.length > 0) filtered.set(key, f);
    });
    return filtered;
  }, [postsByDay, platformFilter]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const PLATFORM_FILTERS = [
    { value: 'all',       label: 'All platforms' },
    { value: 'instagram', label: 'Instagram'      },
    { value: 'x',         label: 'X'              },
    { value: 'linkedin',  label: 'LinkedIn'        },
    { value: 'facebook',  label: 'Facebook'        },
    { value: 'tiktok',    label: 'TikTok'          },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToday}
              className="btn-clay-secondary h-7.5 px-3 text-xs"
            >
              Today
            </button>
            <div className="flex items-center">
              <button
                onClick={prevMonth}
                className="btn-clay-secondary w-7.5 h-7.5 p-0 rounded-r-none border-r-0"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={nextMonth}
                className="btn-clay-secondary w-7.5 h-7.5 p-0 rounded-l-none"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              {MONTHS[month]} {year}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="h-7.5 px-2.5 pr-7 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 outline-none appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              {PLATFORM_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            <Link
              href="/posts/new"
              className="btn-clay-primary h-7.5 px-3 text-xs gap-1 font-semibold inline-flex items-center"
            >
              <Plus size={13} strokeWidth={2.5} />
              New post
            </Link>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="flex-1 grid grid-cols-7" style={{ gridAutoRows: '1fr' }}>
            {grid.map((date, i) => {
              const key = date ? dateKey(date) : `empty-${i}`;
              const posts = (date && filteredPostsByDay.get(dateKey(date))) ?? [];
              const MAX_VISIBLE = 3;
              const overflow = posts.length - MAX_VISIBLE;
              const todayCell = date ? isToday(date) : false;
              const isPast = date
                ? date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                : false;

              return (
                <div
                  key={key}
                  onClick={() => date && setComposerOpen(true)}
                  className={cn(
                    'border-b border-r border-gray-100 p-2 flex flex-col gap-1 min-h-[100px] transition-colors',
                    date ? 'cursor-pointer hover:bg-gray-50/60' : 'bg-gray-50/30',
                    (i + 1) % 7 === 0 && 'border-r-0',
                    i >= grid.length - 7 && 'border-b-0'
                  )}
                >
                  {date && (
                    <>
                      {/* Date number */}
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-medium leading-none',
                            todayCell
                              ? 'bg-indigo-500 text-white font-semibold'
                              : isPast
                              ? 'text-gray-400'
                              : 'text-gray-700'
                          )}
                        >
                          {date.getDate()}
                        </span>
                        {posts.length > 0 && (
                          <span className="text-[10px] text-gray-400">{posts.length}</span>
                        )}
                      </div>

                      {/* Post chips */}
                      <div className="flex flex-col gap-[3px]">
                        {posts.slice(0, MAX_VISIBLE).map((post) => (
                          <CalendarPostChip
                            key={post.id}
                            post={post}
                            onClick={() => setSelectedPost(post)}
                          />
                        ))}
                        {overflow > 0 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); }}
                            className="text-left text-[10px] font-medium text-indigo-500 hover:text-indigo-700 pl-1 transition-colors"
                          >
                            +{overflow} more
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          {[
            { color: 'bg-amber-400',   label: 'Scheduled' },
            { color: 'bg-emerald-500', label: 'Published'  },
            { color: 'bg-gray-400',    label: 'Draft'       },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', color)} />
              <span className="text-[12px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Post detail panel */}
      {selectedPost && (
        <PostDetailPanel post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      {/* Composer */}
      {composerOpen && <PostComposer onClose={() => setComposerOpen(false)} />}
    </>
  );
}
