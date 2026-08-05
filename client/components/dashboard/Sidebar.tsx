'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  ListOrdered,
  BarChart2,
  Link2,
  Sparkles,
  LayoutTemplate,
  Image,
  Settings,
  ChevronsUpDown,
  Check,
  Plus,
  X,
} from 'lucide-react';
import { CreateBrandModal } from '@/components/brands/CreateBrandModal';

interface Brand {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_BRANDS: Brand[] = [
  { id: '1', name: 'Acme Co.', color: 'bg-orange-500' },
  { id: '2', name: 'TechBrand Inc.', color: 'bg-emerald-500' },
];

const navItems = [
  { label: 'Dashboard',          icon: LayoutDashboard, href: '/dashboard',   ai: false },
  { label: 'Content Calendar',   icon: Calendar,        href: '/calendar',    ai: false },
  { label: 'Post Queue',         icon: ListOrdered,     href: '/queue',       ai: false },
  { label: 'Templates',          icon: LayoutTemplate,  href: '/templates',   ai: false },
  { label: 'Media Library',      icon: Image,           href: '/media',       ai: false },
  { label: 'Analytics',          icon: BarChart2,       href: '/analytics',   ai: false },
  { label: 'AI Studio',          icon: Sparkles,        href: '/ai-studio',   ai: true  },
  { label: 'Connected Accounts', icon: Link2,           href: '/accounts',    ai: false },
];

function BrandAvatar({ brand, size = 'md' }: { brand: Brand; size?: 'sm' | 'md' }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md shrink-0 text-white font-bold leading-none',
        brand.color,
        size === 'sm' ? 'w-4.5 h-4.5 text-[9px]' : 'w-5.5 h-5.5 text-[10px]'
      )}
    >
      {brand.name[0].toUpperCase()}
    </div>
  );
}

function BrandSwitcher() {
  const [brands, setBrands] = useState<Brand[]>(DEFAULT_BRANDS);
  const [activeBrand, setActiveBrand] = useState<Brand>(DEFAULT_BRANDS[0]);
  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBrandCreated = (newBrand: { name: string; color: string }) => {
    const created: Brand = {
      id: Date.now().toString(),
      name: newBrand.name,
      color: newBrand.color,
    };
    setBrands((prev) => [...prev, created]);
    setActiveBrand(created);
  };

  return (
    <>
      <div ref={ref} className="relative px-2.5 py-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200/80 hover:bg-gray-100/70 transition-colors text-left group"
        >
          <BrandAvatar brand={activeBrand} />
          <span className="flex-1 min-w-0 text-xs font-medium text-gray-800 truncate">
            {activeBrand.name}
          </span>
          <ChevronsUpDown size={13} className="shrink-0 text-gray-400" />
        </button>

        {open && (
          <div className="absolute left-2.5 right-2.5 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-md py-1 overflow-hidden">
            <p className="px-2.5 pt-1 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Your Brands
            </p>

            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => { setActiveBrand(brand); setOpen(false); }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                <BrandAvatar brand={brand} size="sm" />
                <span className="flex-1 min-w-0 text-xs truncate">{brand.name}</span>
                {brand.id === activeBrand.id && (
                  <Check size={13} className="shrink-0 text-orange-600 stroke-[2]" />
                )}
              </button>
            ))}

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
          onCreated={handleBrandCreated}
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
        {/* Close button — mobile only */}
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

      {/* Nav items */}
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
                  : item.ai
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
                  isActive ? 'text-orange-600' : item.ai ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.ai && (
                <span className="inline-flex items-center px-1 py-0.2 text-[9px] font-bold bg-orange-100 text-orange-700 rounded">
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings bottom */}
      <div className="px-2 pb-3 pt-1">
        <div className="h-px bg-gray-100 mb-1.5" />
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
      </div>
    </aside>
  );
}
