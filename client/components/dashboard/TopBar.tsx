'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Bell, Menu, XCircle, AlertTriangle, CheckCheck } from 'lucide-react';
import { NewPostButton } from '@/components/posts/NewPostButton';
import { useBrandStore } from '@/store/brand';
import { useAccountStore } from '@/store/account';
import { usePostStore } from '@/store/post';

interface TopBarProps {
  onMenuClick: () => void;
}

interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  href: string;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeBrand = useBrandStore((s) => s.activeBrand());
  const accounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const posts = usePostStore((s) => s.posts);
  const fetchPosts = usePostStore((s) => s.fetchPosts);

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

  const notifications: NotificationItem[] = useMemo(() => {
    const items: NotificationItem[] = [];

    for (const post of posts) {
      if (post.status === 'Failed') {
        items.push({
          id: `post-${post.id}`,
          icon: <XCircle size={14} className="text-red-500" />,
          title: `"${post.title}" failed to publish`,
          detail: post.targets.find(t => t.errorMessage)?.errorMessage ?? 'Check the post for details.',
          href: '/posts',
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
        });
      }
    }

    return items;
  }, [posts, accounts]);

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
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full ring-1 ring-white" />
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
                    {notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-2.5 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="mt-0.5 shrink-0">{n.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-gray-800 truncate">{n.title}</p>
                          <p className="text-[12px] text-gray-400 mt-0.5 line-clamp-2">{n.detail}</p>
                        </div>
                      </Link>
                    ))}
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
