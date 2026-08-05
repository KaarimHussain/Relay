'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarPostChip, CalendarPost } from './CalendarPostChip';
import {
  InstagramIcon, XIcon, LinkedInIcon, FacebookIcon, TikTokIcon,
} from '@/components/ui/platform-icons';
import { PostComposer } from '@/components/posts/PostComposer';

// ─── Mock data ────────────────────────────────────────────────────────────────

function buildMockPosts(year: number, month: number): CalendarPost[] {
  return [
    { id: 1,  title: '5 ways AI is changing content strategy',       platform: 'instagram', status: 'published', time: '9:00 AM'  },
    { id: 2,  title: 'Behind the scenes: our brainstorm ritual',     platform: 'x',         status: 'published', time: '11:30 AM' },
    { id: 3,  title: 'LinkedIn growth from 0 to 10K followers',      platform: 'linkedin',  status: 'draft',     time: '—'        },
    { id: 4,  title: 'New feature drop! Multi-platform previews',    platform: 'instagram', status: 'scheduled', time: '2:00 PM'  },
    { id: 5,  title: 'Monday motivation: creator advice roundup',    platform: 'facebook',  status: 'scheduled', time: '9:00 AM'  },
    { id: 6,  title: 'How we write captions that convert',           platform: 'linkedin',  status: 'scheduled', time: '10:00 AM' },
    { id: 7,  title: 'Trending audio you need this week',            platform: 'tiktok',    status: 'scheduled', time: '5:00 PM'  },
    { id: 8,  title: 'Your weekly content wrap-up 🎉',               platform: 'instagram', status: 'scheduled', time: '12:00 PM' },
    { id: 9,  title: 'Thread: social media myths debunked',          platform: 'x',         status: 'scheduled', time: '3:00 PM'  },
    { id: 10, title: 'Case study: 200% reach increase in 30 days',   platform: 'linkedin',  status: 'scheduled', time: '9:30 AM'  },
    { id: 11, title: 'Day in the life of a content team',            platform: 'tiktok',    status: 'scheduled', time: '4:00 PM'  },
    { id: 12, title: 'Q&A: your social media questions answered',    platform: 'instagram', status: 'draft',     time: '—'        },
    { id: 13, title: 'How to repurpose one post across 5 platforms', platform: 'facebook',  status: 'scheduled', time: '11:00 AM' },
    { id: 14, title: 'The anatomy of a viral tweet',                 platform: 'x',         status: 'scheduled', time: '2:30 PM'  },
  ];
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAYS_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_MIN   = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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

// ─── Platform icon map (for detail panel) ────────────────────────────────────

const PLATFORM_ICONS: Record<CalendarPost['platform'], React.ComponentType<{ className?: string }>> = {
  instagram: InstagramIcon,
  x: XIcon,
  linkedin: LinkedInIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
};

const PLATFORM_ICON_STYLE: Record<CalendarPost['platform'], string> = {
  instagram: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white',
  x:         'bg-gray-900 text-white',
  linkedin:  'bg-[#0A66C2] text-white',
  facebook:  'bg-[#1877F2] text-white',
  tiktok:    'bg-black text-white',
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CalendarPost['status'], { label: string; dot: string; bg: string; text: string }> = {
  scheduled: { label: 'Scheduled', dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
  published: { label: 'Published', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  draft:     { label: 'Draft',     dot: 'bg-gray-300',    bg: 'bg-gray-100',   text: 'text-gray-500'    },
};

// ─── Post detail modal ────────────────────────────────────────────────────────

function PostDetailModal({ post, onClose }: { post: CalendarPost; onClose: () => void }) {
  const Icon = PLATFORM_ICONS[post.platform];
  const iconStyle = PLATFORM_ICON_STYLE[post.platform];
  const status = STATUS_CONFIG[post.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconStyle)}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider capitalize">{post.platform}</p>
              <p className="text-[13px] font-semibold text-gray-900 leading-snug mt-0.5">{post.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 px-5 pb-4 flex-wrap">
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold', status.bg, status.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
            {status.label}
          </span>
          {post.time !== '—' && (
            <span className="inline-flex items-center gap-1 text-[12px] text-gray-500 font-medium">
              <Clock size={11} className="text-gray-400" />{post.time}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-5 pb-5">
          <button className="flex-1 btn-clay-secondary h-9 text-[13px] gap-1.5 inline-flex items-center justify-center">
            <Edit2 size={13} /> Edit post
          </button>
          <button className="flex-1 btn-clay-primary h-9 text-[13px] inline-flex items-center justify-center">
            Reschedule
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Day overflow panel (shows all posts for a day) ───────────────────────────

function DayOverflowPanel({
  date,
  posts,
  onPostClick,
  onClose,
}: {
  date: Date;
  posts: CalendarPost[];
  onPostClick: (post: CalendarPost) => void;
  onClose: () => void;
}) {
  const dayName = WEEKDAYS_FULL[date.getDay()];
  const monthName = MONTHS[date.getMonth()];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{dayName}</p>
            <p className="text-[18px] font-bold text-gray-900 leading-tight">
              {monthName} {date.getDate()}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Posts list */}
        <div className="p-3 flex flex-col gap-1.5 max-h-80 overflow-y-auto">
          {posts.map((post) => {
            const Icon = PLATFORM_ICONS[post.platform];
            const iconStyle = PLATFORM_ICON_STYLE[post.platform];
            const status = STATUS_CONFIG[post.status];
            return (
              <button
                key={post.id}
                onClick={() => { onClose(); onPostClick(post); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left w-full group"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconStyle)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-gray-900 truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold', status.text)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                      {status.label}
                    </span>
                    {post.time !== '—' && (
                      <span className="text-[10px] text-gray-400 font-medium">{post.time}</span>
                    )}
                  </div>
                </div>
                <Edit2 size={13} className="text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
              </button>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="px-4 pb-4 pt-1">
          <button className="w-full btn-clay-primary h-9 text-[13px] gap-1.5 inline-flex items-center justify-center">
            <Plus size={13} strokeWidth={2.5} /> Add post on this day
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

const PLATFORM_FILTERS = [
  { value: 'all',       label: 'All platforms' },
  { value: 'instagram', label: 'Instagram'     },
  { value: 'x',         label: 'X'             },
  { value: 'linkedin',  label: 'LinkedIn'      },
  { value: 'facebook',  label: 'Facebook'      },
  { value: 'tiktok',    label: 'TikTok'        },
];

export function CalendarView() {
  const today = new Date();
  const [year, setYear]                   = useState(today.getFullYear());
  const [month, setMonth]                 = useState(today.getMonth());
  const [selectedPost, setSelectedPost]   = useState<CalendarPost | null>(null);
  const [overflowDay, setOverflowDay]     = useState<{ date: Date; posts: CalendarPost[] } | null>(null);
  const [composerOpen, setComposerOpen]   = useState(false);
  const [platformFilter, setPlatformFilter] = useState('all');

  const grid        = useMemo(() => getDaysGrid(year, month), [year, month]);
  const allPosts    = useMemo(() => buildMockPosts(year, month), [year, month]);
  const postsByDay  = useMemo(() => assignPostsToDays(allPosts, year, month), [allPosts, year, month]);

  const filteredPostsByDay = useMemo(() => {
    if (platformFilter === 'all') return postsByDay;
    const filtered = new Map<string, CalendarPost[]>();
    postsByDay.forEach((posts, key) => {
      const f = posts.filter((p) => p.platform === platformFilter);
      if (f.length > 0) filtered.set(key, f);
    });
    return filtered;
  }, [postsByDay, platformFilter]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isPast = (date: Date) =>
    date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Desktop: 2 chips visible, rest in overflow panel
  // Mobile: 3 icon dots, rest in overflow panel
  const DESKTOP_MAX = 2;
  const MOBILE_MAX  = 3;

  return (
    <>
      <div className="flex flex-col gap-4 h-full">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={goToday} className="btn-clay-secondary h-8 px-3 text-xs font-medium">Today</button>
            <div className="flex items-center">
              <button onClick={prevMonth} className="btn-clay-secondary w-8 h-8 p-0 flex items-center justify-center rounded-r-none border-r-0">
                <ChevronLeft size={14} />
              </button>
              <button onClick={nextMonth} className="btn-clay-secondary w-8 h-8 p-0 flex items-center justify-center rounded-l-none">
                <ChevronRight size={14} />
              </button>
            </div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">{MONTHS[month]} {year}</h2>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="flex-1 sm:flex-none h-8 px-2.5 pr-7 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 outline-none appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              {PLATFORM_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <Link href="/posts/new" className="btn-clay-primary h-8 px-3 text-xs gap-1 font-semibold inline-flex items-center shrink-0">
              <Plus size={13} strokeWidth={2.5} /> New post
            </Link>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">

          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-gray-50/80 border-b border-gray-200">
            {WEEKDAYS_SHORT.map((day, i) => (
              <div key={day} className="py-2.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{WEEKDAYS_MIN[i]}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="flex-1 grid grid-cols-7" style={{ gridAutoRows: '1fr' }}>
            {grid.map((date, i) => {
              const key = date ? dateKey(date) : `empty-${i}`;
              const posts = (date && filteredPostsByDay.get(dateKey(date))) ?? [];
              const todayCell = date ? isToday(date) : false;
              const pastCell  = date ? isPast(date) : false;
              const isLastRow = i >= grid.length - 7;
              const isLastCol = (i + 1) % 7 === 0;

              // Desktop slots
              const desktopVisible  = posts.slice(0, DESKTOP_MAX);
              const desktopOverflow = posts.length - DESKTOP_MAX;

              // Mobile slots (icon-only)
              const mobileVisible  = posts.slice(0, MOBILE_MAX);
              const mobileOverflow = posts.length - MOBILE_MAX;

              return (
                <div
                  key={key}
                  onClick={() => date && setComposerOpen(true)}
                  className={cn(
                    'border-b border-r border-gray-100 flex flex-col',
                    'min-h-[80px] sm:min-h-[110px]',
                    'transition-colors duration-100',
                    date ? 'cursor-pointer hover:bg-orange-50/20' : 'bg-gray-50/30',
                    pastCell && date ? 'bg-gray-50/50' : '',
                    todayCell ? 'bg-orange-50/30' : '',
                    isLastRow && 'border-b-0',
                    isLastCol && 'border-r-0'
                  )}
                >
                  {date && (
                    <>
                      {/* Date number */}
                      <div className="flex items-center justify-between px-1.5 sm:px-2 pt-1.5 sm:pt-2 pb-1">
                        <span
                          className={cn(
                            'w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-semibold leading-none transition-colors',
                            todayCell
                              ? 'bg-orange-500 text-white shadow-sm'
                              : pastCell
                              ? 'text-gray-300'
                              : 'text-gray-700 hover:bg-gray-100'
                          )}
                        >
                          {date.getDate()}
                        </span>
                        {posts.length > 0 && (
                          <span className={cn(
                            'text-[9px] font-bold rounded-full px-1.5 py-0.5 tabular-nums',
                            todayCell ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                          )}>
                            {posts.length}
                          </span>
                        )}
                      </div>

                      {/* ── Desktop chips ── */}
                      <div className="hidden sm:flex flex-col gap-[3px] px-1.5 pb-1.5 flex-1">
                        {desktopVisible.map((post) => (
                          <CalendarPostChip
                            key={post.id}
                            post={post}
                            onClick={() => setSelectedPost(post)}
                          />
                        ))}
                        {desktopOverflow > 0 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOverflowDay({ date, posts }); }}
                            className="w-full text-left text-[10px] font-semibold text-orange-500 hover:text-orange-700 px-1.5 py-0.5 rounded-md hover:bg-orange-50 transition-colors"
                          >
                            +{desktopOverflow} more
                          </button>
                        )}
                      </div>

                      {/* ── Mobile icon dots ── */}
                      <div className="sm:hidden flex items-start gap-0.5 px-1 pb-1 flex-wrap">
                        {mobileVisible.map((post) => (
                          <CalendarPostChip
                            key={post.id}
                            post={post}
                            compact
                            onClick={() => setSelectedPost(post)}
                          />
                        ))}
                        {mobileOverflow > 0 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOverflowDay({ date, posts }); }}
                            className="w-5 h-5 rounded-md bg-gray-100 text-gray-500 text-[9px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            +{mobileOverflow}
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
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { color: 'bg-amber-400',   label: 'Scheduled' },
            { color: 'bg-emerald-500', label: 'Published'  },
            { color: 'bg-gray-300',    label: 'Draft'       },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', color)} />
              <span className="text-[12px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Post detail modal */}
      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      {/* Day overflow panel */}
      {overflowDay && (
        <DayOverflowPanel
          date={overflowDay.date}
          posts={overflowDay.posts}
          onPostClick={setSelectedPost}
          onClose={() => setOverflowDay(null)}
        />
      )}

      {/* New post composer */}
      {composerOpen && <PostComposer onClose={() => setComposerOpen(false)} />}
    </>
  );
}
