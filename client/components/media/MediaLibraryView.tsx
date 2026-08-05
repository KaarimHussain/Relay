'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Search, Upload, Grid3X3, List, Trash2, Send,
  X, Check, Image as ImageIcon, Film, FileImage,
  MoreHorizontal, Eye, Download, Copy, ZoomIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostComposer } from '@/components/posts/PostComposer';

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaType = 'image' | 'video' | 'gif';
type SortKey = 'newest' | 'oldest' | 'name' | 'size';

interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  size: string;          // display string e.g. "1.2 MB"
  sizeBytes: number;
  dimensions: string;    // e.g. "1080 × 1080"
  uploadedAt: string;
  usedIn: number;        // post count
  // Visual placeholder — gradient class
  gradient: string;
  accent: string;        // for overlay elements
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_MEDIA: MediaItem[] = [
  { id: '1',  name: 'product-hero-shot.jpg',        type: 'image', size: '2.4 MB', sizeBytes: 2516582, dimensions: '1920 × 1080', uploadedAt: 'Today',          usedIn: 3, gradient: 'from-indigo-400 to-violet-600',    accent: 'bg-indigo-200' },
  { id: '2',  name: 'team-brainstorm.jpg',           type: 'image', size: '1.8 MB', sizeBytes: 1887436, dimensions: '1080 × 1080', uploadedAt: 'Today',          usedIn: 1, gradient: 'from-amber-300 to-orange-500',     accent: 'bg-amber-200'  },
  { id: '3',  name: 'launch-reel.mp4',               type: 'video', size: '14.2 MB',sizeBytes:14898531, dimensions: '1080 × 1920', uploadedAt: 'Yesterday',      usedIn: 2, gradient: 'from-pink-400 to-rose-600',        accent: 'bg-pink-200'   },
  { id: '4',  name: 'analytics-dashboard.png',       type: 'image', size: '890 KB', sizeBytes: 911360,  dimensions: '1440 × 900',  uploadedAt: 'Yesterday',      usedIn: 4, gradient: 'from-sky-400 to-blue-600',         accent: 'bg-sky-200'    },
  { id: '5',  name: 'behind-scenes-office.jpg',      type: 'image', size: '3.1 MB', sizeBytes: 3250586, dimensions: '1080 × 1350', uploadedAt: 'Mon, Aug 4',     usedIn: 0, gradient: 'from-emerald-400 to-teal-600',     accent: 'bg-emerald-200'},
  { id: '6',  name: 'brand-logo-white.png',          type: 'image', size: '124 KB', sizeBytes: 126976,  dimensions: '800 × 200',   uploadedAt: 'Mon, Aug 4',     usedIn: 7, gradient: 'from-gray-700 to-gray-900',        accent: 'bg-gray-400'   },
  { id: '7',  name: 'confetti-celebration.gif',      type: 'gif',   size: '4.6 MB', sizeBytes: 4825702, dimensions: '480 × 480',   uploadedAt: 'Sun, Aug 3',     usedIn: 1, gradient: 'from-yellow-300 to-pink-500',      accent: 'bg-yellow-200' },
  { id: '8',  name: 'feature-demo.mp4',              type: 'video', size: '22.7 MB',sizeBytes:23801241, dimensions: '1920 × 1080', uploadedAt: 'Sun, Aug 3',     usedIn: 0, gradient: 'from-violet-400 to-purple-700',    accent: 'bg-violet-200' },
  { id: '9',  name: 'testimonial-quote-sara.png',    type: 'image', size: '540 KB', sizeBytes: 552960,  dimensions: '1080 × 1080', uploadedAt: 'Sat, Aug 2',     usedIn: 2, gradient: 'from-rose-300 to-red-500',         accent: 'bg-rose-200'   },
  { id: '10', name: 'linkedin-banner.jpg',            type: 'image', size: '1.1 MB', sizeBytes: 1153433, dimensions: '1584 × 396',  uploadedAt: 'Sat, Aug 2',     usedIn: 1, gradient: 'from-blue-500 to-indigo-700',      accent: 'bg-blue-200'   },
  { id: '11', name: 'product-walkthrough.mp4',        type: 'video', size: '31.4 MB',sizeBytes:32934707, dimensions: '1920 × 1080', uploadedAt: 'Fri, Aug 1',     usedIn: 5, gradient: 'from-teal-400 to-cyan-600',        accent: 'bg-teal-200'   },
  { id: '12', name: 'holiday-promo-banner.png',       type: 'image', size: '760 KB', sizeBytes: 778240,  dimensions: '1200 × 628',  uploadedAt: 'Thu, Jul 31',    usedIn: 0, gradient: 'from-red-400 to-pink-600',         accent: 'bg-red-200'    },
  { id: '13', name: 'loading-spinner.gif',            type: 'gif',   size: '88 KB',  sizeBytes: 90112,   dimensions: '200 × 200',   uploadedAt: 'Wed, Jul 30',    usedIn: 0, gradient: 'from-slate-300 to-slate-500',      accent: 'bg-slate-200'  },
  { id: '14', name: 'ceo-headshot.jpg',               type: 'image', size: '1.5 MB', sizeBytes: 1572864, dimensions: '800 × 800',   uploadedAt: 'Tue, Jul 29',    usedIn: 3, gradient: 'from-orange-300 to-amber-600',     accent: 'bg-orange-200' },
  { id: '15', name: 'q3-results-infographic.png',     type: 'image', size: '2.2 MB', sizeBytes: 2306867, dimensions: '1080 × 1920', uploadedAt: 'Mon, Jul 28',    usedIn: 2, gradient: 'from-lime-400 to-green-600',       accent: 'bg-lime-200'   },
];

const TYPE_ICON: Record<MediaType, typeof ImageIcon> = {
  image: ImageIcon,
  video: Film,
  gif:   FileImage,
};

const TYPE_LABEL: Record<MediaType, string> = {
  image: 'Image',
  video: 'Video',
  gif:   'GIF',
};

// ─── Media thumbnail ──────────────────────────────────────────────────────────

function MediaThumb({
  item,
  size = 'md',
}: {
  item: MediaItem;
  size?: 'sm' | 'md' | 'lg';
}) {
  const Icon = TYPE_ICON[item.type];
  const dim = { sm: 'h-20', md: 'h-44', lg: 'h-64' }[size];

  return (
    <div className={cn('w-full rounded-lg overflow-hidden bg-gradient-to-br flex items-center justify-center relative', dim, item.gradient)}>
      {/* Simulated content */}
      <div className="flex flex-col items-center gap-2 opacity-30">
        <div className={cn('rounded-lg', item.accent, size === 'sm' ? 'w-6 h-6' : 'w-10 h-10')} />
        {size !== 'sm' && <div className={cn('rounded w-16 h-2', item.accent)} />}
        {size !== 'sm' && <div className={cn('rounded w-10 h-2', item.accent)} />}
      </div>
      {/* Type badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-white text-[10px] font-semibold">
        <Icon size={9} />
        {TYPE_LABEL[item.type]}
      </div>
      {item.type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[10px] border-transparent border-l-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-white rounded-xl overflow-hidden shadow-2xl">
        {/* Thumbnail */}
        <MediaThumb item={item} size="lg" />

        {/* Info */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[15px] font-semibold text-gray-900">{item.name}</p>
              <p className="text-[13px] text-gray-400 mt-0.5">
                {item.dimensions} · {item.size} · Uploaded {item.uploadedAt}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {item.usedIn > 0 && (
              <span className="text-[12px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                Used in {item.usedIn} post{item.usedIn > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-[12px] text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
              {TYPE_LABEL[item.type]}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <button className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={14} /> Download
            </button>
            <button className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Copy size={14} /> Copy URL
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors ml-auto"
            >
              <Send size={13} /> Use in post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function GridCard({
  item,
  selected,
  onToggle,
  onPreview,
}: {
  item: MediaItem;
  selected: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        'group relative flex flex-col bg-white border rounded-xl overflow-hidden transition-all cursor-pointer',
        selected ? 'border-indigo-400 ring-2 ring-indigo-500/20' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      )}
    >
      {/* Thumbnail */}
      <div className="relative" onClick={onPreview}>
        <MediaThumb item={item} size="md" />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {/* Select checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className={cn(
            'absolute top-2 right-2 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
            selected
              ? 'bg-indigo-500 border-indigo-500'
              : 'bg-white/80 border-white opacity-0 group-hover:opacity-100'
          )}
        >
          {selected && <Check size={11} strokeWidth={3} className="text-white" />}
        </button>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-gray-800 truncate">{item.name}</p>
          <p className="text-[11px] text-gray-400">{item.size} · {item.uploadedAt}</p>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 overflow-hidden">
              <button onClick={() => { onPreview(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50">
                <Eye size={12} className="text-gray-400" /> Preview
              </button>
              <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50">
                <Download size={12} className="text-gray-400" /> Download
              </button>
              <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50">
                <Copy size={12} className="text-gray-400" /> Copy URL
              </button>
              <div className="my-1 h-px bg-gray-100" />
              <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-red-600 hover:bg-red-50">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Usage badge */}
      {item.usedIn > 0 && (
        <div className="absolute bottom-10 left-2">
          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
            {item.usedIn} post{item.usedIn > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────

function ListRow({
  item,
  selected,
  onToggle,
  onPreview,
}: {
  item: MediaItem;
  selected: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  const Icon = TYPE_ICON[item.type];

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2.5 group transition-colors border-b border-gray-100 last:border-0',
      selected ? 'bg-indigo-50/50' : 'hover:bg-gray-50/70'
    )}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="w-4 h-4 rounded border-gray-300 accent-indigo-500 cursor-pointer shrink-0"
      />
      {/* Tiny thumb */}
      <div
        onClick={onPreview}
        className={cn('w-10 h-10 rounded-lg flex-shrink-0 bg-gradient-to-br cursor-pointer', item.gradient)}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-800 truncate">{item.name}</p>
        <p className="text-[11px] text-gray-400">{item.dimensions}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Icon size={12} className="text-gray-400" />
        <span className="text-[12px] text-gray-500">{TYPE_LABEL[item.type]}</span>
      </div>
      <span className="w-16 text-right text-[12px] text-gray-500 shrink-0">{item.size}</span>
      <span className="w-24 text-right text-[12px] text-gray-400 shrink-0">{item.uploadedAt}</span>
      {item.usedIn > 0
        ? <span className="w-16 text-right text-[12px] text-emerald-600 shrink-0">{item.usedIn} post{item.usedIn > 1 ? 's' : ''}</span>
        : <span className="w-16 text-right text-[12px] text-gray-300 shrink-0">—</span>
      }
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onPreview} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <Eye size={13} />
        </button>
        <button className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

function UploadZone({ onUpload }: { onUpload: (items: Omit<MediaItem, 'id' | 'usedIn'>[]) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: File[]) => {
    const newItems: Omit<MediaItem, 'id' | 'usedIn'>[] = files.map(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      const type: MediaType = f.type.startsWith('video') ? 'video' : ext === 'gif' ? 'gif' : 'image';
      const gradients = [
        'from-indigo-400 to-violet-600', 'from-pink-400 to-rose-600',
        'from-amber-300 to-orange-500', 'from-emerald-400 to-teal-600',
      ];
      const accents = ['bg-indigo-200', 'bg-pink-200', 'bg-amber-200', 'bg-emerald-200'];
      const idx = Math.floor(Math.random() * 4);
      return {
        name: f.name,
        type,
        size: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
        sizeBytes: f.size,
        dimensions: '—',
        uploadedAt: 'Just now',
        gradient: gradients[idx],
        accent: accents[idx],
      };
    });
    onUpload(newItems);
  };

  return (
    <div
      onDrop={e => { e.preventDefault(); setDragOver(false); processFiles(Array.from(e.dataTransfer.files)); }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => fileRef.current?.click()}
      className={cn(
        'flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
        dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <Upload size={20} className={dragOver ? 'text-indigo-400' : 'text-gray-300'} />
      <div className="text-center">
        <p className="text-[13px] text-gray-500">
          Drop files here, or{' '}
          <span className="text-indigo-500 font-medium">browse</span>
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">PNG, JPG, GIF, MP4 up to 50 MB</p>
      </div>
      <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden"
        onChange={e => processFiles(Array.from(e.target.files ?? []))} />
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type FilterType = 'all' | MediaType;

export function MediaLibraryView() {
  const [items, setItems] = useState<MediaItem[]>(MOCK_MEDIA);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== 'all') list = list.filter(i => i.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sort === 'name')   return a.name.localeCompare(b.name);
      if (sort === 'size')   return b.sizeBytes - a.sizeBytes;
      if (sort === 'oldest') return a.id.localeCompare(b.id);
      return b.id.localeCompare(a.id); // newest
    });
  }, [items, filter, sort, search]);

  const counts = useMemo(() => ({
    all:   items.length,
    image: items.filter(i => i.type === 'image').length,
    video: items.filter(i => i.type === 'video').length,
    gif:   items.filter(i => i.type === 'gif').length,
  }), [items]);

  const totalSize = useMemo(() => {
    const bytes = items.reduce((s, i) => s + i.sizeBytes, 0);
    return bytes > 1073741824
      ? `${(bytes / 1073741824).toFixed(1)} GB`
      : `${(bytes / 1048576).toFixed(0)} MB`;
  }, [items]);

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id)));

  const deleteSelected = () => {
    setItems(prev => prev.filter(i => !selected.has(i.id)));
    setSelected(new Set());
  };

  const handleUpload = (newItems: Omit<MediaItem, 'id' | 'usedIn'>[]) => {
    const withIds: MediaItem[] = newItems.map((item, idx) => ({
      ...item, id: `new-${Date.now()}-${idx}`, usedIn: 0,
    }));
    setItems(prev => [...withIds, ...prev]);
  };

  const FILTER_TABS: { key: FilterType; label: string }[] = [
    { key: 'all',   label: `All (${counts.all})`   },
    { key: 'image', label: `Images (${counts.image})` },
    { key: 'video', label: `Videos (${counts.video})` },
    { key: 'gif',   label: `GIFs (${counts.gif})`   },
  ];

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Upload zone */}
        <UploadZone onUpload={handleUpload} />

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-[12px] text-gray-500">
          <span><span className="font-semibold text-gray-700">{items.length}</span> files</span>
          <span className="text-gray-300">·</span>
          <span><span className="font-semibold text-gray-700">{totalSize}</span> used</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-[34%] bg-indigo-400 rounded-full" />
          </div>
          <span className="text-gray-400">34% of 300 MB</span>
          <button className="text-indigo-500 font-medium hover:text-indigo-600 transition-colors">Upgrade for more</button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {FILTER_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors',
                  filter === key
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-2 h-8 w-52 px-3 bg-white border border-gray-200 rounded-lg">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search files…"
                className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 outline-none"
              />
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="h-8 pl-2.5 pr-7 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-600 outline-none appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="size">Largest first</option>
            </select>

            {/* View toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('w-8 h-8 flex items-center justify-center transition-colors', viewMode === 'grid' ? 'bg-gray-100 text-gray-700' : 'bg-white text-gray-400 hover:bg-gray-50')}
              >
                <Grid3X3 size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('w-8 h-8 flex items-center justify-center border-l border-gray-200 transition-colors', viewMode === 'list' ? 'bg-gray-100 text-gray-700' : 'bg-white text-gray-400 hover:bg-gray-50')}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-medium text-indigo-600">
                {selected.size} file{selected.size > 1 ? 's' : ''} selected
              </span>
              <button onClick={() => setSelected(new Set())} className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setComposerOpen(true)}
                className="flex items-center gap-1.5 h-7 px-3 text-[12px] font-medium text-indigo-600 bg-white border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors"
              >
                <Send size={11} /> Use in post
              </button>
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1.5 h-7 px-3 text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors"
              >
                <Trash2 size={11} /> Delete
              </button>
            </div>
          </div>
        )}

        {/* Grid view */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-4 gap-4">
            {filtered.map(item => (
              <GridCard
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                onToggle={() => toggleSelect(item.id)}
                onPreview={() => setPreview(item)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-4 flex flex-col items-center justify-center py-16 text-center">
                <ImageIcon size={32} className="text-gray-200 mb-3" />
                <p className="text-[14px] font-medium text-gray-500">No files found</p>
                <p className="text-[13px] text-gray-400">Try a different filter or search term.</p>
              </div>
            )}
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length; }}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-gray-300 accent-indigo-500 cursor-pointer"
              />
              <div className="w-10 shrink-0" />
              <span className="flex-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">File name</span>
              <span className="w-16 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Type</span>
              <span className="w-16 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Size</span>
              <span className="w-24 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Uploaded</span>
              <span className="w-16 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Usage</span>
              <div className="w-16 shrink-0" />
            </div>
            {filtered.map(item => (
              <ListRow
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                onToggle={() => toggleSelect(item.id)}
                onPreview={() => setPreview(item)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-[13px]">No files match your search.</div>
            )}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && <PreviewModal item={preview} onClose={() => setPreview(null)} />}

      {/* Composer */}
      {composerOpen && <PostComposer onClose={() => setComposerOpen(false)} />}
    </>
  );
}
