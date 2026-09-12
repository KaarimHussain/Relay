'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Calendar, ListOrdered, BarChart2, Link2,
  Sparkles, LayoutTemplate, Image, Settings, ChevronsUpDown,
  Check, Plus, X, AlertCircle, Loader2, LogOut, MessageSquare,
  TrendingUp, FlaskConical, Inbox,
} from 'lucide-react';
import { CreateBrandModal } from '@/components/brands/CreateBrandModal';
import { useBrandStore, Brand } from '@/store/brand';
import { useAuthStore } from '@/store/auth';

const navItems = [
  { label: 'Dashboard',          icon: LayoutDashboard, href: '/dashboard',    tag: null      },
  { label: 'Content Calendar',   icon: Calendar,        href: '/calendar',     tag: null      },
  { label: 'Post Queue',         icon: ListOrdered,     href: '/queue',        tag: null      },
  { label: 'Templates',          icon: LayoutTemplate,  href: '/templates',    tag: null      },
  { label: 'Media Library',      icon: Image,           href: '/media',       tag: null      },
  { label: 'Analytics',          icon: BarChart2,       href: '/analytics',    tag: null      },
  { label: 'AI Studio',          icon: Sparkles,        href: '/ai-studio',    tag: 'AI'      },
  { label: 'Trends',             icon: TrendingUp,      href: '/trends',       tag: 'PREVIEW' },
  { label: 'A/B Testing',        icon: FlaskConical,    href: '/ab-testing',   tag: 'PREVIEW' },
  { label: 'Comments',           icon: MessageSquare,   href: '/comments',     tag: null      },
  { label: 'Inbox',              icon: Inbox,           href: '/inbox',        tag: 'NEW'     },
  { label: 'Connected Accounts', icon: Link2,           href: '/accounts',     tag: null      },
];

function BrandAvatar({ brand, size = 'md' }: { brand: Brand; size?: 'sm' | 'md' }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md shrink-0 overflow-hidden text-white font-bold leading-none',
        size === 'sm' ? 'w-4.5 h-4.5 text-[9px]' : 'w-5.5 h-5.5 text-[10px]'
      )}
      style={{ backgroundColor: brand.colorHex }}
    >
      {brand.logoUrl ? (
        <img src={brand.logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        brand.name[0].toUpperCase()
      )}
    </div>
  );
}

function BrandSwitcher() {
  const { brands, status, error, activeBrand, setActiveBrand, fetchBrands } = useBrandStore();
  const authStatus = useAuthStore((s) => s.status);
  const active = activeBrand();

  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch brands once auth is ready
  useEffect(() => {
    if (authStatus === 'authenticated' && status === 'idle') {
      fetchBrands();
    }
  }, [authStatus, status, fetchBrands]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Loading skeleton
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="px-2.5 py-1.5">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200/80">
          <div className="w-5.5 h-5.5 rounded-md bg-gray-200 animate-pulse shrink-0" />
          <div className="flex-1 h-3 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="px-2.5 py-1.5">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle size={13} className="text-red-500 shrink-0" />
          <span className="text-xs text-red-600 flex-1 truncate">{error}</span>
          <button
            onClick={fetchBrands}
            className="text-[10px] font-semibold text-red-600 hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state — no brands yet
  if (!brands.length) {
    return (
      <>
        <div className="px-2.5 py-1.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg border border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-50 transition-colors text-left"
          >
            <div className="w-5.5 h-5.5 rounded-md bg-orange-100 flex items-center justify-center shrink-0">
              <Plus size={11} className="text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-600 truncate">Create your first brand</span>
          </button>
        </div>
        {showCreateModal && (
          <CreateBrandModal onClose={() => setShowCreateModal(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <div ref={ref} className="relative px-2.5 py-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200/80 hover:bg-gray-100/70 transition-colors text-left"
        >
          {active && <BrandAvatar brand={active} />}
          <span className="flex-1 min-w-0 text-xs font-medium text-gray-800 truncate">
            {active?.name ?? 'Select brand'}
          </span>
          <ChevronsUpDown size={13} className="shrink-0 text-gray-400" />
        </button>

        {open && (
          <div className="absolute left-2.5 right-2.5 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-md py-1 overflow-hidden">
            <p className="px-2.5 pt-1 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Your Brands
            </p>

            <div className="max-h-48 overflow-y-auto">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => { setActiveBrand(brand.id); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  <BrandAvatar brand={brand} size="sm" />
                  <span className="flex-1 min-w-0 text-xs truncate">{brand.name}</span>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wide shrink-0">{brand.role}</span>
                  {brand.id === active?.id && (
                    <Check size={13} className="shrink-0 text-orange-600 stroke-[2]" />
                  )}
                </button>
              ))}
            </div>

            <div className="my-1 h-px bg-gray-100" />

            <button
              onClick={() => { setOpen(false); setShowCreateModal(true); }}
              className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs text-orange-600 font-semibold hover:bg-orange-50 transition-colors"
            >
              <Plus size={13} strokeWidth={2} />
              Add new brand
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateBrandModal
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'fixed md:static inset-y-0 left-0 z-50 flex flex-col w-[215px] h-screen bg-white border-r border-gray-200 shrink-0 select-none',
        'transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between gap-2 px-3.5 h-12 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 256 256" fill="none">
            <path d="M 128 256 L 64 256 L 64 192 L 128 192 Z M 256 256 L 192 256 L 192 192 L 256 192 Z M 64 192 L 0 192 L 0 128 L 64 128 Z M 192 192 L 128 192 L 128 128 L 192 128 Z M 128 128 L 64 128 L 64 64 L 128 64 Z M 256 128 L 192 128 L 192 64 L 256 64 Z M 64 64 L 0 64 L 0 0 L 64 0 Z M 192 64 L 128 64 L 128 0 L 192 0 Z" fill="#1A1A1A"/>
          </svg>
          <span className="text-gray-900 font-bold text-base tracking-tight">Relay</span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Brand switcher */}
      <BrandSwitcher />

      <div className="mx-2.5 my-0.5 h-px bg-gray-100" />

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors relative group',
                isActive
                  ? 'bg-orange-50/80 text-orange-600 font-semibold'
                  : item.tag
                  ? 'text-orange-600 hover:bg-orange-50/60'
                  : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
              )}
            >
              {isActive && (
                <span className="w-1 h-3.5 bg-orange-600 rounded-r-full absolute left-0 top-1/2 -translate-y-1/2" />
              )}
              <item.icon
                size={15}
                strokeWidth={isActive ? 2 : 1.75}
                className={cn(
                  'shrink-0',
                  isActive ? 'text-orange-600' : item.tag ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.tag && (
                <span className="inline-flex items-center px-1 py-0.2 text-[9px] font-bold bg-orange-100 text-orange-700 rounded">
                  {item.tag}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Settings + user + logout */}
      <div className="px-2 pb-3 pt-1 flex flex-col gap-0.5">
        <div className="h-px bg-gray-100 mb-1" />

        <Link
          href="/settings"
          onClick={onClose}
          className={cn(
            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors relative',
            pathname === '/settings'
              ? 'bg-orange-50/80 text-orange-600 font-semibold'
              : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
          )}
        >
          {pathname === '/settings' && (
            <span className="w-1 h-3.5 bg-orange-600 rounded-r-full absolute left-0 top-1/2 -translate-y-1/2" />
          )}
          <Settings size={15} strokeWidth={1.75} className="shrink-0 text-gray-400" />
          <span>Settings</span>
        </Link>

        {/* User row + logout */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 mt-1">
          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-orange-600">
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">
              {user?.name ?? 'Account'}
            </p>
            <p className="text-[10px] text-gray-400 truncate leading-tight">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="shrink-0 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
