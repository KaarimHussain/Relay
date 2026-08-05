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
  gradient: string;
  accent: string;
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

const GRADIENTS = [
  'from-orange-400 to-orange-600', 'from-pink-400 to-rose-600',
  'from-amber-300 to-orange-500',  'from-emerald-400 to-teal-600',
  'from-sky-400 to-blue-600',      'from-gray-700 to-gray-900',
  'from-yellow-300 to-pink-500',   'from-teal-400 to-cyan-600',
  'from-rose-300 to-red-500',      'from-lime-400 to-green-600',
];
const ACCENTS = [
  'bg-orange-200', 'bg-pink-200', 'bg-amber-200', 'bg-emerald-200',
  'bg-sky-200',    'bg-gray-400', 'bg-yellow-200', 'bg-teal-200',
  'bg-rose-200',   'bg-lime-200',
];

function hashId(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

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
  const h = hashId(m.id);
  return {
    id: m.id, name: m.filename, type: mimeToType(m.mimeType),
    size: fmtSize(m.sizeBytes), sizeBytes: m.sizeBytes, url: m.url,
    uploadedAt: fmtDate(m.createdAt),
    gradient: GRADIENTS[h % GRADIENTS.length],
    accent:   ACCENTS[h % ACCENTS.length],
  };
}

// ─── Types config ─────────────────────────────────────────────────────────────

const TYPE_ICON: Record<MediaType, typeof ImageIcon> = { image: ImageIcon, video: Film, gif: FileImage };
const TYPE_LABEL: Record<MediaType, string> = { image: 'Image', video: 'Video', gif: 'GIF' };

// ─── Media thumbnail (gradient placeholder) ───────────────────────────────────

function MediaThumb({ item, size = 'md' }: { item: MediaItem; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = TYPE_ICON[item.type];
  const dim = { sm: 'h-20', md: 'h-44', lg: 'h-64' }[size];
  return (
    <div className={cn('w-full rounded-lg overflow-hidden bg-gradient-to-br flex items-center justify-center relative', dim, item.gradient)}>
      <div className="flex flex-col items-center gap-2 opacity-30">
        <div className={cn('rounded-lg', item.accent, size === 'sm' ? 'w-6 h-6' : 'w-10 h-10')} />
        {size !== 'sm' && <div className={cn('rounded w-16 h-2', item.accent)} />}
        {size !== 'sm' && <div className={cn('rounded w-10 h-2', item.accent)} />}
      </div>
      <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-white text-[10px] font-semibold">
        <Icon size={9} />{TYPE_LABEL[item.type]}
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
  const { toast } = useToast();
  const copyUrl = () => { navigator.clipboard.writeText(item.url); toast('URL copied!', 'success'); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-white rounded-xl overflow-hidden shadow-2xl">
        <MediaThumb item={item} size="lg" />
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
            <Link href="/posts/new" onClick={onClose}
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
            <div className="absolute right-0 top-full mt-1 z-30 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              <button onClick={() => { onPreview(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50">
                <Eye size={12} className="text-gray-400" /> Preview
              </button>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50">
                <Download size={12} className="text-gray-400" /> Download
              </a>
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
      <div onClick={onPreview}
        className={cn('w-10 h-10 rounded-lg flex-shrink-0 bg-gradient-to-br cursor-pointer', item.gradient)} />
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
      // 1. Get presigned POST url from backend
      const { uploadUrl, fields, mediaId } = await api.post<{
        uploadUrl: string; fields: Record<string, string>; mediaId: string; key: string;
      }>(`/brands/${brandId}/media/upload-url`, {
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });

      // 2. Upload directly to S3/R2 using presigned POST
      const formData = new FormData();
      for (const [k, v] of Object.entries(fields)) formData.append(k, v);
      formData.append('file', file);
      const s3Resp = await fetch(uploadUrl, { method: 'POST', body: formData });
      if (!s3Resp.ok && s3Resp.status !== 204 && s3Resp.status !== 201) {
        throw new Error(`Upload failed: ${s3Resp.status}`);
      }

      // 3. Fetch the created media record to get the public URL
      const allMedia = await api.get<BackendMedia[]>(`/brands/${brandId}/media`);
      const created = allMedia.find((m) => m.id === mediaId);
      if (created) onUploaded(mapMedia(created));
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

                <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
                  className="h-8 pl-2.5 pr-7 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-600 outline-none appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A–Z</option>
                  <option value="size">Largest first</option>
                </select>

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
