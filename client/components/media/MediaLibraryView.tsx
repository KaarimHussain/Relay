'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Upload, Grid3X3, List, Trash2, Send,
  X, Check, Image as ImageIcon, Film, FileImage,
  MoreHorizontal, Eye, Download, Copy, ZoomIn,
  AlertCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandStore } from '@/store/brand';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaType = 'image' | 'video' | 'gif';
type SortKey = 'newest' | 'oldest' | 'name' | 'size';

interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  size: string;
  sizeBytes: number;
  uploadedAt: string;
  url: string;
}

interface BackendMedia {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────


function mimeToType(mime: string): MediaType {
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'image/gif') return 'gif';
  return 'image';
}

function fmtSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function mapMedia(m: BackendMedia): MediaItem {
  return {
    id: m.id, name: m.filename, type: mimeToType(m.mimeType),
    size: fmtSize(m.sizeBytes), sizeBytes: m.sizeBytes, url: m.url,
    uploadedAt: fmtDate(m.createdAt),
  };
}

// ─── Types config ─────────────────────────────────────────────────────────────

const TYPE_ICON: Record<MediaType, typeof ImageIcon> = { image: ImageIcon, video: Film, gif: FileImage };
const TYPE_LABEL: Record<MediaType, string> = { image: 'Image', video: 'Video', gif: 'GIF' };

// ─── Media thumbnail ──────────────────────────────────────────────────────────

function MediaThumb({ item, size = 'md' }: { item: MediaItem; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = TYPE_ICON[item.type];
  const dim = { sm: 'h-20', md: 'h-44', lg: 'h-64' }[size];
  const isVideo = item.type === 'video';

  return (
    <div className={cn('w-full rounded-lg overflow-hidden flex items-center justify-center relative bg-gray-100', dim)}>
      {isVideo ? (
        <video
          src={item.url}
          className="w-full h-full object-cover"
          preload="metadata"
          muted
        />
      ) : (
        <img
          src={item.url}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      )}
      {/* Type badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded text-white text-[10px] font-semibold">
        <Icon size={9} />{TYPE_LABEL[item.type]}
      </div>
      {/* Video play overlay */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
  const { toast } = useToast();
  const copyUrl = () => { navigator.clipboard.writeText(item.url); toast('URL copied!', 'success'); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-white rounded-xl overflow-hidden shadow-2xl">
        {item.type === 'video' ? (
          <video src={item.url} controls className="w-full max-h-72 bg-black object-contain" />
        ) : (
          <img src={item.url} alt={item.name} className="w-full max-h-72 object-contain bg-gray-50" />
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[15px] font-semibold text-gray-900">{item.name}</p>
              <p className="text-[13px] text-gray-400 mt-0.5">{item.size} · Uploaded {item.uploadedAt}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={14} /> Download
            </a>
            <button onClick={copyUrl}
              className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Copy size={14} /> Copy URL
            </button>
            <Link href={`/posts/new?mediaId=${item.id}`} onClick={onClose}
              className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors ml-auto">
              <Send size={13} /> Use in post
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function GridCard({ item, selected, onToggle, onPreview, onDelete }: {
  item: MediaItem; selected: boolean;
  onToggle: () => void; onPreview: () => void; onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={cn('group relative flex flex-col bg-white border rounded-xl overflow-hidden transition-all cursor-pointer',
      selected ? 'border-orange-400 ring-2 ring-orange-500/20' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm')}>
      <div className="relative" onClick={onPreview}>
        <MediaThumb item={item} size="md" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <button onClick={e => { e.stopPropagation(); onToggle(); }}
          className={cn('absolute top-2 right-2 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
            selected ? 'bg-orange-500 border-orange-500' : 'bg-white/80 border-white opacity-0 group-hover:opacity-100')}>
          {selected && <Check size={11} strokeWidth={3} className="text-white" />}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-gray-800 truncate">{item.name}</p>
          <p className="text-[11px] text-gray-400">{item.size} · {item.uploadedAt}</p>
        </div>
        <div className="relative shrink-0">
          <button onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              <button onClick={() => { onPreview(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50">
                <Eye size={12} className="text-gray-400" /> Preview
              </button>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50">
                <Download size={12} className="text-gray-400" /> Download
              </a>
              <Link href={`/posts/new?mediaId=${item.id}`} className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-orange-600 hover:bg-orange-50">
                <Send size={12} /> Use in post
              </Link>
              <div className="my-1 h-px bg-gray-100" />
              <button onClick={() => { onDelete(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-red-600 hover:bg-red-50">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────

function ListRow({ item, selected, onToggle, onPreview, onDelete }: {
  item: MediaItem; selected: boolean;
  onToggle: () => void; onPreview: () => void; onDelete: () => void;
}) {
  const Icon = TYPE_ICON[item.type];
  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5 group transition-colors border-b border-gray-100 last:border-0',
      selected ? 'bg-orange-50/50' : 'hover:bg-gray-50/70')}>
      <input type="checkbox" checked={selected} onChange={onToggle}
        className="w-4 h-4 rounded border-gray-300 accent-orange-500 cursor-pointer shrink-0" />
      <div onClick={onPreview} className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-gray-100 cursor-pointer">
        {item.type === 'video'
          ? <video src={item.url} className="w-full h-full object-cover" preload="metadata" muted />
          : <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-800 truncate">{item.name}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Icon size={12} className="text-gray-400" />
        <span className="text-[12px] text-gray-500">{TYPE_LABEL[item.type]}</span>
      </div>
      <span className="w-16 text-right text-[12px] text-gray-500 shrink-0">{item.size}</span>
      <span className="w-24 text-right text-[12px] text-gray-400 shrink-0">{item.uploadedAt}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onPreview} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <Eye size={13} />
        </button>
        <Link href={`/posts/new?mediaId=${item.id}`} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
          <Send size={13} />
        </Link>
        <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

function UploadZone({ brandId, onUploaded }: { brandId: string; onUploaded: (item: MediaItem) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('relay_token') : null;
      const formData = new FormData();
      formData.append('file', file);

      const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
      const res = await fetch(`${BASE_URL}/brands/${brandId}/media/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body.message) ? body.message[0] : (body.message ?? `Upload failed: ${res.status}`);
        throw new Error(msg);
      }

      const created: BackendMedia = await res.json();
      onUploaded(mapMedia(created));
      toast(`${file.name} uploaded!`, 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Upload failed');
      setUploadError(msg);
      toast(msg, 'info');
    } finally {
      setUploading(false);
    }
  }, [brandId, onUploaded, toast]);

  const processFiles = (files: File[]) => {
    files.forEach(uploadFile);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        onDrop={e => { e.preventDefault(); setDragOver(false); processFiles(Array.from(e.dataTransfer.files)); }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && fileRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed rounded-xl transition-colors',
          uploading ? 'border-orange-300 bg-orange-50/50 cursor-default' : 'cursor-pointer',
          dragOver ? 'border-orange-400 bg-orange-50' : !uploading ? 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50' : ''
        )}
      >
        {uploading
          ? <><Loader2 size={20} className="text-orange-400 animate-spin" /><p className="text-[13px] text-orange-600 font-medium">Uploading…</p></>
          : <>
              <Upload size={20} className={dragOver ? 'text-orange-400' : 'text-gray-300'} />
              <div className="text-center">
                <p className="text-[13px] text-gray-500">Drop files here, or <span className="text-orange-500 font-medium">browse</span></p>
                <p className="text-[11px] text-gray-400 mt-0.5">PNG, JPG, GIF, MP4 up to 100 MB</p>
              </div>
            </>
        }
        <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden"
          onChange={e => processFiles(Array.from(e.target.files ?? []))} />
      </div>
      {uploadError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={12} className="text-red-500 shrink-0" />
          <p className="text-[11px] text-red-700">{uploadError}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type FilterType = 'all' | MediaType;

export function MediaLibraryView() {
  const { toast } = useToast();
  const activeBrand = useBrandStore((s) => s.activeBrand());

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<MediaItem | null>(null);

  const fetchMedia = useCallback(async (brandId: string) => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await api.get<BackendMedia[]>(`/brands/${brandId}/media`);
      setItems(data.map(mapMedia));
    } catch (err) {
      setFetchError(err instanceof ApiError ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeBrand) fetchMedia(activeBrand.id);
    else setItems([]);
  }, [activeBrand?.id]);

  const handleDelete = useCallback(async (id: string) => {
    if (!activeBrand) return;
    try {
      await api.delete(`/brands/${activeBrand.id}/media/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast('File deleted', 'info');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Delete failed', 'info');
    }
  }, [activeBrand, toast]);

  const handleBulkDelete = async () => {
    await Promise.all([...selected].map(handleDelete));
    setSelected(new Set());
  };

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
      return b.id.localeCompare(a.id);
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
    return bytes >= 1073741824 ? `${(bytes / 1073741824).toFixed(1)} GB` : `${(bytes / 1048576).toFixed(0)} MB`;
  }, [items]);

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id)));

  const FILTER_TABS: { key: FilterType; label: string }[] = [
    { key: 'all',   label: `All (${counts.all})`     },
    { key: 'image', label: `Images (${counts.image})` },
    { key: 'video', label: `Videos (${counts.video})` },
    { key: 'gif',   label: `GIFs (${counts.gif})`     },
  ];

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle size={22} className="text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No brand selected</p>
        <p className="text-xs text-gray-400">Select a brand from the sidebar to manage media.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Upload zone */}
        <UploadZone brandId={activeBrand.id} onUploaded={(item) => setItems(prev => [item, ...prev])} />

        {/* Error */}
        {fetchError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle size={13} className="text-red-500 shrink-0" />
            <p className="text-xs font-medium text-red-700">{fetchError}</p>
          </div>
        )}

        {/* Stats bar */}
        {items.length > 0 && (
          <div className="flex items-center gap-4 text-[12px] text-gray-500">
            <span><span className="font-semibold text-gray-700">{items.length}</span> files</span>
            <span className="text-gray-300">·</span>
            <span><span className="font-semibold text-gray-700">{totalSize}</span> stored</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading media…</span>
          </div>
        )}

        {/* Toolbar */}
        {!loading && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {FILTER_TABS.map(({ key, label }) => (
                  <button key={key} onClick={() => setFilter(key)}
                    className={cn('h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors',
                      filter === key ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 h-8 w-52 px-3 bg-white border border-gray-200 rounded-lg">
                  <Search size={13} className="text-gray-400 shrink-0" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search files…"
                    className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 outline-none" />
                </div>

                <Select value={sort} onValueChange={(val) => val && setSort(val as SortKey)}>
                  <SelectTrigger className="h-8 bg-white border-gray-200 text-xs text-gray-700 min-w-[130px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="name">Name A–Z</SelectItem>
                    <SelectItem value="size">Largest first</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => setViewMode('grid')}
                    className={cn('w-8 h-8 flex items-center justify-center transition-colors',
                      viewMode === 'grid' ? 'bg-gray-100 text-gray-700' : 'bg-white text-gray-400 hover:bg-gray-50')}>
                    <Grid3X3 size={14} />
                  </button>
                  <button onClick={() => setViewMode('list')}
                    className={cn('w-8 h-8 flex items-center justify-center border-l border-gray-200 transition-colors',
                      viewMode === 'list' ? 'bg-gray-100 text-gray-700' : 'bg-white text-gray-400 hover:bg-gray-50')}>
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-orange-600">{selected.size} file{selected.size > 1 ? 's' : ''} selected</span>
                  <button onClick={() => setSelected(new Set())} className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">Clear</button>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/posts/new" className="flex items-center gap-1.5 h-7 px-3 text-[12px] font-medium text-orange-600 bg-white border border-orange-200 rounded-md hover:bg-orange-50 transition-colors">
                    <Send size={11} /> Use in post
                  </Link>
                  <button onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 h-7 px-3 text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors">
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            )}

            {/* Grid view */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map(item => (
                  <GridCard key={item.id} item={item}
                    selected={selected.has(item.id)}
                    onToggle={() => toggleSelect(item.id)}
                    onPreview={() => setPreview(item)}
                    onDelete={() => handleDelete(item.id)} />
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-4 flex flex-col items-center justify-center py-16 text-center">
                    <ImageIcon size={32} className="text-gray-200 mb-3" />
                    <p className="text-[14px] font-medium text-gray-500">
                      {items.length === 0 ? 'No files yet' : 'No files match'}
                    </p>
                    <p className="text-[13px] text-gray-400">
                      {items.length === 0 ? 'Upload your first file above.' : 'Try a different filter or search.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* List view */}
            {viewMode === 'list' && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <input type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length; }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 accent-orange-500 cursor-pointer" />
                  <div className="w-10 shrink-0" />
                  <span className="flex-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">File name</span>
                  <span className="w-16 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Type</span>
                  <span className="w-16 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Size</span>
                  <span className="w-24 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Uploaded</span>
                  <div className="w-16 shrink-0" />
                </div>
                {filtered.map(item => (
                  <ListRow key={item.id} item={item}
                    selected={selected.has(item.id)}
                    onToggle={() => toggleSelect(item.id)}
                    onPreview={() => setPreview(item)}
                    onDelete={() => handleDelete(item.id)} />
                ))}
                {filtered.length === 0 && (
                  <div className="py-12 text-center text-gray-400 text-[13px]">
                    {items.length === 0 ? 'No files yet — upload above.' : 'No files match your search.'}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {preview && <PreviewModal item={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
