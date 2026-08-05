'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const BRAND_COLORS = [
  { label: 'Indigo',   bg: 'bg-indigo-500',  hex: '#6366F1' },
  { label: 'Violet',   bg: 'bg-violet-500',  hex: '#8B5CF6' },
  { label: 'Sky',      bg: 'bg-sky-500',     hex: '#0EA5E9' },
  { label: 'Emerald',  bg: 'bg-emerald-500', hex: '#10B981' },
  { label: 'Amber',    bg: 'bg-amber-500',   hex: '#F59E0B' },
  { label: 'Rose',     bg: 'bg-rose-500',    hex: '#F43F5E' },
  { label: 'Pink',     bg: 'bg-pink-500',    hex: '#EC4899' },
  { label: 'Slate',    bg: 'bg-slate-500',   hex: '#64748B' },
];

interface CreateBrandModalProps {
  onClose: () => void;
  onCreated?: (brand: { name: string; color: string }) => void;
}

export function CreateBrandModal({ onClose, onCreated }: CreateBrandModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(BRAND_COLORS[0]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreated?.({ name: trimmed, color: selectedColor.bg });
    onClose();
  };

  const initials = name.trim().slice(0, 2).toUpperCase() || '?';

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-[420px] bg-white rounded-xl border border-gray-200 shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Create a brand</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">
              A brand acts as your workspace — connect accounts to it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 flex flex-col gap-5">
            {/* Preview avatar */}
            <div className="flex justify-center">
              <div
                className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center text-white text-[18px] font-bold tracking-tight',
                  selectedColor.bg
                )}
              >
                {initials}
              </div>
            </div>

            {/* Brand name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-700">Brand name</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Co."
                maxLength={40}
                className="w-full h-[38px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
              />
            </div>

            {/* Color picker */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-gray-700">Brand color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={cn(
                      'w-7 h-7 rounded-lg transition-all',
                      c.bg,
                      selectedColor.hex === c.hex
                        ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                        : 'hover:scale-105'
                    )}
                    aria-label={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="h-[34px] px-4 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="h-[34px] px-4 text-[13px] font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Create brand
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
