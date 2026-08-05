'use client';

import { Bell, Search } from 'lucide-react';
import { NewPostButton } from '@/components/posts/NewPostButton';

export function TopBar() {
  return (
    <header className="flex items-center justify-between h-12 px-4 bg-white border-b border-gray-200 shrink-0 sticky top-0 z-40">
      {/* Search Bar */}
      <div className="flex items-center gap-2 h-7.5 w-64 px-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-colors">
        <Search size={13} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search posts, accounts…"
          className="flex-1 min-w-0 bg-transparent text-xs text-gray-800 placeholder:text-gray-400 outline-none font-normal"
        />
        <kbd className="hidden sm:inline-flex items-center px-1 py-0.2 text-[9px] font-semibold text-gray-400 bg-white border border-gray-200 rounded">
          ⌘K
        </kbd>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button 
          aria-label="Notifications"
          className="relative flex items-center justify-center w-7.5 h-7.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bell size={14} className="text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-600 rounded-full ring-1 ring-white" />
        </button>

        <NewPostButton />
      </div>
    </header>
  );
}
