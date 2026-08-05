'use client';

import { useRef, useEffect, useState } from 'react';
import { Bell, Search, X, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewPostButton } from '@/components/posts/NewPostButton';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setQuery('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="bg-white border-b border-gray-100 shrink-0 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between h-12 px-4 gap-3">

        {/* Left: hamburger (mobile) + search */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="md:hidden flex items-center justify-center w-8 h-8 text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors shrink-0"
          >
            <Menu size={18} />
          </button>

          {/* Search bar */}
          <div
            className={cn(
              'flex items-center gap-2 h-8 px-2.5 border rounded-lg transition-all duration-150 flex-1 max-w-xs',
              focused
                ? 'bg-white border-orange-400 ring-2 ring-orange-500/15 shadow-sm'
                : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-2xs cursor-text'
            )}
            onClick={() => inputRef.current?.focus()}
          >
            <Search
              size={13}
              className={cn('shrink-0 transition-colors duration-150', focused ? 'text-orange-500' : 'text-gray-400')}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search…"
              className="flex-1 min-w-0 bg-transparent text-xs text-gray-800 placeholder:text-gray-400 outline-none"
            />
            {query ? (
              <button
                onMouseDown={e => {
                  e.preventDefault();
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex shrink-0 items-center px-1.5 py-0.5 text-[9px] font-semibold text-gray-400 bg-white border border-gray-200 rounded shadow-2xs select-none">
                {focused ? 'esc' : '⌘K'}
              </kbd>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            aria-label="Notifications"
            className="relative flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg
              hover:bg-gray-100 hover:border-gray-300
              active:scale-95 active:bg-gray-200 active:shadow-inner
              transition-all duration-100 cursor-pointer"
          >
            <Bell size={14} className="text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full ring-1 ring-white" />
          </button>

          <NewPostButton />
        </div>
      </div>
    </header>
  );
}
