'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Menu, XCircle, AlertTriangle, CheckCheck, CheckCircle2, CalendarClock } from 'lucide-react';
import { NewPostButton } from '@/components/posts/NewPostButton';
import { useBrandStore } from '@/store/brand';
import { useAccountStore } from '@/store/account';
import { usePostStore } from '@/store/post';
import { useAuthStore } from '@/store/auth';
import { loadNotificationPrefs } from '@/lib/notificationPrefs';
import { formatScheduledAt, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onMenuClick: () => void;
}

interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  href: string;
  timestamp: number;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  const activeBrand = useBrandStore((s) => s.activeBrand());
  const accounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const posts = usePostStore((s) => s.posts);
  const fetchPosts = usePostStore((s) => s.fetchPosts);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (activeBrand?.id) {
      fetchAccounts(activeBrand.id);
      fetchPosts(activeBrand.id);
    }
  }, [activeBrand?.id, fetchAccounts, fetchPosts]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const prefs = useMemo(() => (user ? loadNotificationPrefs(user.id) : null), [user]);

  const notifications: NotificationItem[] = useMemo(() => {
    const items: NotificationItem[] = [];
    const now = Date.now();
    const showPublished = prefs?.postPublished ?? true;
    const showFailed = prefs?.postFailed ?? true;

    for (const post of posts) {
      const platforms = [...new Set(post.targets.map((t) => t.account?.platform).filter(Boolean))].join(', ');

      if (post.status === 'Failed' && showFailed) {
        items.push({
          id: `post-failed-${post.id}`,
          icon: <XCircle size={14} className="text-red-500" />,
          title: `"${post.title}" failed to publish`,
          detail: post.targets.find((t) => t.errorMessage)?.errorMessage ?? 'Check the post for details.',
          href: '/queue',
          timestamp: new Date(post.updatedAt).getTime(),
        });
      } else if (post.status === 'Published' && showPublished) {
        const publishedAt = Math.max(
          ...post.targets.map((t) => (t.publishedAt ? new Date(t.publishedAt).getTime() : 0)),
          new Date(post.updatedAt).getTime(),
        );
        items.push({
          id: `post-published-${post.id}`,
          icon: <CheckCircle2 size={14} className="text-emerald-500" />,
          title: `"${post.title}" published`,
          detail: platforms ? `Live on ${platforms}.` : 'Your post is now live.',
          href: '/queue',
          timestamp: publishedAt,
        });
      } else if (post.status === 'Scheduled') {
        items.push({
          id: `post-scheduled-${post.id}`,
          icon: <CalendarClock size={14} className="text-amber-500" />,
          title: `"${post.title}" scheduled`,
          detail: `Goes out ${formatScheduledAt(post.scheduledAt)}${platforms ? ` · ${platforms}` : ''}.`,
          href: '/queue',
          timestamp: new Date(post.updatedAt).getTime(),
        });
      }
    }

    for (const account of accounts) {
      if (account.status === 'Expired') {
        items.push({
          id: `acc-${account.id}`,
          icon: <AlertTriangle size={14} className="text-amber-500" />,
          title: `${account.platform} connection expired`,
          detail: `Reconnect ${account.platformHandle} to keep posting.`,
          href: '/accounts',
          timestamp: now,
        });
      }
    }

    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 25);
  }, [posts, accounts, prefs]);

  // ─── Unread tracking (per user, cached in localStorage) ───────────────────────
  const seenKey = user ? `relay_notif_seen_${user.id}` : null;

  useEffect(() => {
    if (!seenKey || typeof window === 'undefined') return;
    const raw = localStorage.getItem(seenKey);
    setLastSeen(raw ? Number(raw) : 0);
  }, [seenKey]);

  const markAllSeen = useCallback(() => {
    const nowTs = Date.now();
    setLastSeen(nowTs);
    if (seenKey && typeof window !== 'undefined') localStorage.setItem(seenKey, String(nowTs));
  }, [seenKey]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.timestamp > lastSeen).length,
    [notifications, lastSeen],
  );

  // Mark everything seen when the panel closes (so unread items stay highlighted while open)
  useEffect(() => {
    if (wasOpen.current && !open) markAllSeen();
    wasOpen.current = open;
  }, [open, markAllSeen]);

  return (
    <header className="bg-white border-b border-gray-100 shrink-0 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between h-12 px-4 gap-3">

        {/* Left: hamburger (mobile) */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="md:hidden flex items-center justify-center w-8 h-8 text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors shrink-0"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setOpen(v => !v)}
              aria-label="Notifications"
              className="relative flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg
                hover:bg-gray-100 hover:border-gray-300
                active:scale-95 active:bg-gray-200 active:shadow-inner
                transition-all duration-100 cursor-pointer"
            >
              <Bell size={14} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold leading-none rounded-full ring-1 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="text-[13px] font-bold text-gray-900">Notifications</p>
                  {notifications.length > 0 && (
                    <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                      {notifications.length}
                    </span>
                  )}
                </div>

                {!activeBrand ? (
                  <div className="flex flex-col items-center gap-1.5 py-8 px-4 text-center">
                    <p className="text-[12px] text-gray-400">Select a brand to see its notifications.</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 py-8 px-4 text-center">
                    <CheckCheck size={18} className="text-emerald-400" />
                    <p className="text-[12px] text-gray-400">You're all caught up.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((n) => {
                      const unread = n.timestamp > lastSeen;
                      return (
                        <Link
                          key={n.id}
                          href={n.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'flex items-start gap-2.5 px-4 py-3 transition-colors',
                            unread ? 'bg-orange-50/60 hover:bg-orange-50' : 'hover:bg-gray-50',
                          )}
                        >
                          <span className="mt-0.5 shrink-0">{n.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-semibold text-gray-800 truncate">{n.title}</p>
                            <p className="text-[12px] text-gray-400 mt-0.5 line-clamp-2">{n.detail}</p>
                            <p className="text-[10.5px] text-gray-300 mt-1">{timeAgo(n.timestamp)}</p>
                          </div>
                          {unread && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <NewPostButton />
        </div>
      </div>
    </header>
  );
}
