'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Sparkles, Send, Clock, FileText,
  ImageIcon, Film, Plus, X as XIcon,
  Check, Heart, MessageCircle, Share2, Repeat2, Bookmark,
  RefreshCw, AlertCircle, Loader2, FolderOpen, LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformBadge } from '@/components/ui/platform-icons';
import { useToast } from '@/components/ui/toast';
import { useBrandStore } from '@/store/brand';
import { useAccountStore } from '@/store/account';
import { usePostStore } from '@/store/post';
import { useTemplateStore } from '@/store/template';
import { api, ApiError } from '@/lib/api';
import { DateTimePicker } from '@/components/ui/date-time-picker';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_META: Record<string, { label: string; limit: number }> = {
  Instagram: { label: 'Instagram', limit: 2200  },
  LinkedIn:  { label: 'LinkedIn',  limit: 3000  },
  X:         { label: 'X',         limit: 280   },
  Facebook:  { label: 'Facebook',  limit: 63206 },
  TikTok:    { label: 'TikTok',    limit: 2200  },
};

const PLATFORM_BADGE_ID: Record<string, string> = {
  Instagram: 'instagram', LinkedIn: 'linkedin', X: 'x', Facebook: 'facebook', TikTok: 'tiktok',
};

const PLATFORM_MEDIA_RULES: Record<string, {
  maxImages: number; maxVideos: number;
  imageSizeMB: number; videoSizeMB: number;
  imageTypes: string[]; videoTypes: string[];
  note: string;
}> = {
  Instagram: { maxImages: 10, maxVideos: 1, imageSizeMB: 8,    videoSizeMB: 100,   imageTypes: ['image/jpeg','image/png','image/webp'],             videoTypes: ['video/mp4','video/quicktime'], note: '10 imgs or 1 video' },
  X:         { maxImages: 4,  maxVideos: 1, imageSizeMB: 5,    videoSizeMB: 512,   imageTypes: ['image/jpeg','image/png','image/gif','image/webp'], videoTypes: ['video/mp4','video/quicktime'], note: '4 imgs or 1 video'  },
  LinkedIn:  { maxImages: 20, maxVideos: 1, imageSizeMB: 5,    videoSizeMB: 5120,  imageTypes: ['image/jpeg','image/png','image/gif'],              videoTypes: ['video/mp4'],                  note: '20 imgs or 1 video' },
  Facebook:  { maxImages: 10, maxVideos: 1, imageSizeMB: 10,   videoSizeMB: 10240, imageTypes: ['image/jpeg','image/png','image/gif'],              videoTypes: ['video/mp4','video/quicktime'], note: '10 imgs or 1 video' },
  TikTok:    { maxImages: 0,  maxVideos: 1, imageSizeMB: 0,    videoSizeMB: 4096,  imageTypes: [],                                                 videoTypes: ['video/mp4','video/quicktime'], note: 'Video only'         },
};

interface MediaItem {
  id: string;
  url: string;
  mimeType: string;
  name: string;
  size: number;
}

type PostMode = 'now' | 'schedule' | 'draft';

const AI_QUICK_ACTIONS = [
  { label: '✨ Auto-Fix Tone',     prompt: 'improve-tone'   },
  { label: '🔥 Add Viral Hook',    prompt: 'add-hook'       },
  { label: '🏷️ Generate Hashtags', prompt: 'add-hashtags'   },
  { label: '📏 Shorten for X',     prompt: 'shorten-for-x'  },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// ─── Component ────────────────────────────────────────────────────────────────

export function CreatePostView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const allAccounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const accounts = allAccounts.filter((a) => a.status === 'Active');
  const { createPost, schedulePost, publishNow } = usePostStore();
  const templates = useTemplateStore((s) => s.templates);
  const templateStatus = useTemplateStore((s) => s.status);
  const fetchTemplates = useTemplateStore((s) => s.fetchTemplates);

  // ─── Post state ─────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [activePreview, setActivePreview] = useState('');
  const [mode, setMode] = useState<PostMode>('schedule');
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date(Date.now() + 3600000);
    return d.toISOString().slice(0, 16);
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // ─── Media state ─────────────────────────────────────────────────────────────
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Library picker state ─────────────────────────────────────────────────────
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySelected, setLibrarySelected] = useState<Set<string>>(new Set());

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeBrand?.id) fetchAccounts(activeBrand.id);
  }, [activeBrand?.id, fetchAccounts]);

  useEffect(() => {
    if (activeBrand?.id) fetchTemplates(activeBrand.id);
    setTemplatePickerOpen(false);
  }, [activeBrand?.id, fetchTemplates]);

  useEffect(() => {
    const prefillCaption  = searchParams.get('caption');
    const prefillPlatform = searchParams.get('platform');
    const prefillSchedule = searchParams.get('scheduledAt');
    if (prefillCaption) setCaption(decodeURIComponent(prefillCaption));
    if (prefillSchedule && !Number.isNaN(new Date(prefillSchedule).getTime())) {
      setMode('schedule');
      setScheduleDate(prefillSchedule.slice(0, 16));
    }
    if (prefillPlatform && accounts.length > 0) {
      const match = accounts.find(
        (a) => a.platform.toLowerCase() === prefillPlatform.toLowerCase()
      );
      if (match) {
        setSelectedAccountIds(new Set([match.id]));
        setActivePreview(match.platform);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length]);

  // Pre-load media passed from Media Library's "Use in post" action.
  useEffect(() => {
    const rawIds = searchParams.get('mediaIds') ?? searchParams.get('mediaId');
    if (!rawIds || !activeBrand) return;
    const ids = [...new Set(rawIds.split(',').filter(Boolean))];
    Promise.all(ids.map((id) => api.get<{ id: string; filename: string; mimeType: string; sizeBytes: number; url: string }>(
      `/brands/${activeBrand.id}/media/${id}`
    )))
      .then((media) => setMediaItems(media.map((item) => ({ id: item.id, url: item.url, mimeType: item.mimeType, name: item.filename, size: item.sizeBytes }))))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand?.id]);

  // ─── Derived ──────────────────────────────────────────────────────────────────
  const selectedAccounts = accounts.filter((a) => selectedAccountIds.has(a.id));
  const savedTemplates = templates.filter((template) => template.brandId === activeBrand?.id);
  const previewPlatform = activePreview || selectedAccounts[0]?.platform || 'Instagram';

  const mediaImages = mediaItems.filter(m => m.mimeType.startsWith('image/'));
  const mediaVideos = mediaItems.filter(m => m.mimeType.startsWith('video/'));
  const hasVideo = mediaVideos.length > 0;
  const hasImages = mediaImages.length > 0;

  const effectiveMaxImages = useMemo(() => {
    if (!selectedAccounts.length) return 20;
    return Math.min(...selectedAccounts.map(a => PLATFORM_MEDIA_RULES[a.platform]?.maxImages ?? 20));
  }, [selectedAccounts]);

  const canAddMore = !hasVideo && mediaImages.length < effectiveMaxImages;

  const fileInputAccept = useMemo(() => {
    const platforms = selectedAccounts.map(a => a.platform);
    if (platforms.length === 1 && platforms[0] === 'TikTok') return 'video/mp4,video/quicktime';
    if (hasVideo) return 'video/mp4,video/quicktime';
    if (hasImages) return 'image/jpeg,image/png,image/gif,image/webp';
    return 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime';
  }, [selectedAccounts, hasVideo, hasImages]);

  const mediaWarnings = useMemo(() => {
    if (!mediaItems.length || !selectedAccounts.length) return [];
    const warnings: string[] = [];
    for (const acc of selectedAccounts) {
      const rules = PLATFORM_MEDIA_RULES[acc.platform];
      if (!rules) continue;
      if (rules.maxImages === 0 && hasImages)
        warnings.push(`${acc.platform} is video-only — images won't be posted there.`);
      if (hasImages && rules.maxImages > 0 && mediaImages.length > rules.maxImages)
        warnings.push(`${acc.platform} supports max ${rules.maxImages} images (you have ${mediaImages.length}).`);
    }
    return [...new Set(warnings)];
  }, [mediaItems, selectedAccounts, hasImages, mediaImages.length]);

  const readiness = [
    { label: 'Title', ready: Boolean(title.trim()) },
    { label: 'Caption', ready: Boolean(caption.trim()) },
    { label: 'Account', ready: selectedAccountIds.size > 0 },
    { label: mode === 'schedule' ? 'Time' : 'Timing', ready: mode !== 'schedule' || Boolean(scheduleDate) },
    { label: 'Media', ready: mediaWarnings.length === 0 },
  ];
  const readyCount = readiness.filter((item) => item.ready).length;

  // ─── Library picker handlers ──────────────────────────────────────────────────

  const openLibrary = useCallback(async () => {
    if (!activeBrand) return;
    setLibraryOpen(true);
    setLibrarySelected(new Set());
    setLibraryLoading(true);
    try {
      const data = await api.get<Array<{ id: string; filename: string; mimeType: string; sizeBytes: number; url: string }>>(
        `/brands/${activeBrand.id}/media`
      );
      setLibraryItems(data.map(m => ({ id: m.id, url: m.url, mimeType: m.mimeType, name: m.filename, size: m.sizeBytes })));
    } catch {
      setLibraryItems([]);
    } finally {
      setLibraryLoading(false);
    }
  }, [activeBrand]);

  const confirmLibrarySelection = () => {
    const chosen = libraryItems.filter(i => librarySelected.has(i.id));
    if (!chosen.length) { setLibraryOpen(false); return; }
    setMediaItems(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      return [...prev, ...chosen.filter(c => !existingIds.has(c.id))];
    });
    setLibraryOpen(false);
    setLibrarySelected(new Set());
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const toggleAccount = (id: string, platform: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else { next.add(id); if (!activePreview) setActivePreview(platform); }
      return next;
    });
  };

  const uploadFile = async (file: File): Promise<MediaItem> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('relay_token') : null;
    const res = await fetch(`${API_BASE}/brands/${activeBrand!.id}/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(Array.isArray(err.message) ? err.message[0] : (err.message ?? 'Upload failed'));
    }
    const media = await res.json();
    return { id: media.id, url: media.url, mimeType: media.mimeType, name: media.filename, size: media.sizeBytes };
  };

  const handleMediaFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (!fileArr.length || !activeBrand) return;
    setMediaError('');

    const firstIsVideo = fileArr[0].type.startsWith('video/');

    // Mix guard
    if (firstIsVideo && hasImages) { setMediaError('Cannot mix images and video in the same post.'); return; }
    if (!firstIsVideo && hasVideo)  { setMediaError('Cannot mix images and video in the same post.'); return; }

    // Per-platform validation
    for (const file of fileArr) {
      const sizeMB = file.size / (1024 * 1024);
      const isImg = file.type.startsWith('image/');
      for (const acc of selectedAccounts) {
        const rules = PLATFORM_MEDIA_RULES[acc.platform];
        if (!rules) continue;
        if (isImg && rules.maxImages === 0) {
          setMediaError(`${acc.platform} only supports video. Deselect ${acc.platform} or choose a video instead.`);
          return;
        }
        if (isImg && sizeMB > rules.imageSizeMB) {
          setMediaError(`"${file.name}" (${sizeMB.toFixed(1)} MB) exceeds ${acc.platform}'s ${rules.imageSizeMB} MB image limit.`);
          return;
        }
        if (!isImg && sizeMB > rules.videoSizeMB) {
          setMediaError(`"${file.name}" (${sizeMB.toFixed(1)} MB) exceeds ${acc.platform}'s ${rules.videoSizeMB} MB video limit.`);
          return;
        }
      }
    }

    // Image count guard
    if (!firstIsVideo && mediaImages.length + fileArr.length > effectiveMaxImages) {
      setMediaError(`Max ${effectiveMaxImages} images for your selected platform(s). Remove some first.`);
      return;
    }

    setMediaUploading(true);
    try {
      const uploaded = await Promise.all(fileArr.map(uploadFile));
      setMediaItems(prev => [...prev, ...uploaded]);
    } catch (e: unknown) {
      setMediaError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setMediaUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeMedia = (id: string) => {
    setMediaItems(prev => prev.filter(m => m.id !== id));
    if (activeBrand) api.delete(`/brands/${activeBrand.id}/media/${id}`).catch(() => {});
  };

  const handleAiAction = async (prompt: string) => {
    if (!activeBrand || !caption.trim()) { toast('Write a caption first', 'error'); return; }
    if (prompt === 'shorten-for-x') {
      setCaption((p) => p.slice(0, 280) + (p.length > 280 ? '…' : ''));
      toast('Shortened for X', 'sparkle');
      return;
    }
    setIsAiLoading(true);
    try {
      if (prompt === 'add-hashtags') {
        const { popular } = await api.post<{ popular: string[]; niche: string[] }>(
          `/brands/${activeBrand.id}/ai/generate-hashtags`,
          { topic: caption.slice(0, 200) },
        );
        setCaption((p) => `${p}\n\n${popular.join(' ')}`);
        toast('Hashtags added', 'sparkle');
      } else {
        const action = prompt === 'add-hook' ? 'add-hook' : 'improve-tone';
        const { improved } = await api.post<{ improved: string }>(
          `/brands/${activeBrand.id}/ai/improve-caption`,
          { caption, action },
        );
        setCaption(improved);
        toast('Caption improved', 'sparkle');
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'AI action failed', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Generate a caption by reading the uploaded image (images only, no video)
  const handleGenerateFromImage = async () => {
    if (!activeBrand) return;
    const image = mediaImages[0];
    if (!image) { toast('Add an image first', 'error'); return; }
    setIsAiLoading(true);
    try {
      const { caption: generated, hashtags } = await api.post<{ caption: string; hashtags: string[] }>(
        `/brands/${activeBrand.id}/ai/caption-from-image`,
        { imageUrl: image.url, platform: previewPlatform },
      );
      const tags = hashtags?.length ? `\n\n${hashtags.join(' ')}` : '';
      setCaption(generated + tags);
      toast('Caption generated from your image', 'sparkle');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not generate caption from image', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeBrand) return;
    if (!title.trim()) { setSubmitError('Please enter a title for this post.'); return; }
    if (!caption.trim()) { setSubmitError('Please write a caption.'); return; }
    if (selectedAccountIds.size === 0) { setSubmitError('Select at least one platform account.'); return; }
    if (mode === 'schedule' && !scheduleDate) { setSubmitError('Please pick a schedule date and time.'); return; }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      const targets = [...selectedAccountIds].map((accountId) => ({ accountId, caption }));
      const post = await createPost(activeBrand.id, {
        title: title.trim(),
        targets,
        mediaIds: mediaItems.map(m => m.id),
      });

      if (mode === 'now') {
        const published = await publishNow(activeBrand.id, post.id);
        const failedTargets = published.targets?.filter((t: any) => t.status === 'Failed') ?? [];
        if (failedTargets.length > 0) {
          const errors = failedTargets.map((t: any) => `${t.account?.platform ?? 'Platform'}: ${t.errorMessage ?? 'Unknown error'}`);
          setSubmitError(errors.join('\n'));
          setIsSubmitting(false);
          return;
        }
        toast('Post published successfully!', 'success');
      } else if (mode === 'schedule') {
        await schedulePost(activeBrand.id, post.id, new Date(scheduleDate).toISOString());
        toast('Post scheduled successfully!', 'success');
      } else {
        toast('Saved as draft', 'info');
      }
      router.push('/queue');
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to save post. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!activeBrand || !title.trim()) { setSubmitError('Please enter a title before saving.'); return; }
    setIsSubmitting(true);
    try {
      const targets = [...selectedAccountIds].map((id) => ({ accountId: id, caption }));
      await createPost(activeBrand.id, { title: title.trim(), targets, mediaIds: mediaItems.map(m => m.id) });
      toast('Draft saved', 'info');
      router.push('/queue');
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to save draft.');
      setIsSubmitting(false);
    }
  };

  // ─── No brand guard ───────────────────────────────────────────────────────────
  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle size={24} className="text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No brand selected</p>
        <p className="text-xs text-gray-400">Select a brand from the sidebar first.</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200/80 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/queue" className="btn-clay-secondary h-7.5 px-2.5 text-xs gap-1.5 font-medium">
            <ArrowLeft size={14} /> Back
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Create & Schedule Post</h1>
            <p className="text-xs text-gray-500">for <span className="font-semibold">{activeBrand.name}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleSaveDraft} disabled={isSubmitting}
            className="btn-clay-secondary h-8 px-3.5 text-xs font-semibold disabled:opacity-50">
            Save Draft
          </button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting}
            className="btn-clay-primary h-8 px-4 text-xs font-semibold gap-1.5 inline-flex items-center disabled:opacity-50">
            {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : mode === 'now' ? <Send size={13} /> : <Clock size={13} />}
            {isSubmitting ? 'Saving…' : mode === 'now' ? 'Publish Now' : mode === 'schedule' ? 'Schedule Post' : 'Save Draft'}
          </button>
        </div>
      </div>

      {submitError && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs font-medium text-red-700">{submitError}</p>
        </div>
      )}

      <section className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/80 via-white to-amber-50/70 px-4 py-3 shadow-2xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-bold text-gray-900">Post readiness <span className="ml-1 font-medium text-gray-400">{readyCount}/{readiness.length} checks complete</span></p><p className="mt-0.5 text-[11px] text-gray-500">Complete the essentials, then choose when Relay should publish.</p></div>
          <div className="flex flex-wrap gap-1.5">{readiness.map((item) => <span key={item.label} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold', item.ready ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}><Check size={10} strokeWidth={3} className={item.ready ? '' : 'opacity-35'} />{item.label}</span>)}</div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── Left: Composer ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Title */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
            <div className="mb-2 flex items-center justify-between"><label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Post Title</label><span className="text-[10px] font-semibold text-gray-400">{title.length}/200</span></div>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Product launch announcement"
              maxLength={200}
              className="w-full h-13 px-4 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl text-[15px] font-medium text-gray-800 placeholder:text-gray-400 outline-none shadow-inner shadow-gray-100/40 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
            />
            <p className="mt-2 text-[11px] text-gray-400">A clear internal name makes this post easier to find in Queue and Calendar.</p>
          </div>

          {/* Platform selector */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2.5 shadow-2xs">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Publishing Platforms</label>
            {accounts.length === 0 ? (
              <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle size={13} className="text-amber-600 shrink-0" />
                <p className="text-[12px] text-amber-700">
                  No connected accounts.{' '}
                  <Link href="/accounts" className="font-semibold underline">Connect an account</Link> first.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {accounts.map((acc) => {
                  const meta = PLATFORM_META[acc.platform];
                  const active = selectedAccountIds.has(acc.id);
                  return (
                    <button key={acc.id} type="button" onClick={() => toggleAccount(acc.id, acc.platform)}
                      className={cn('flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-semibold transition-all',
                        active ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-2xs' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700')}>
                      <PlatformBadge platform={PLATFORM_BADGE_ID[acc.platform] ?? acc.platform.toLowerCase()} size="sm" />
                      <span>{meta?.label ?? acc.platform}</span>
                      <span className="text-gray-400 font-normal">{acc.platformHandle}</span>
                      {acc.platform === 'LinkedIn' && (
                        <span className={cn('text-[10px] font-semibold px-1 py-0.5 rounded',
                          acc.platformUserId?.startsWith('org:')
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-500')}>
                          {acc.platformUserId?.startsWith('org:') ? 'Page' : 'Personal'}
                        </span>
                      )}
                      {active && <Check size={12} className="text-orange-600 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Post Caption</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTemplatePickerOpen((open) => !open)}
                  className="btn-clay-secondary h-6.5 px-2.5 text-[11px] font-semibold inline-flex items-center gap-1"
                  aria-expanded={templatePickerOpen}
                >
                  <LayoutTemplate size={11} /> Add template
                </button>
                {selectedAccounts.map((acc) => {
                  const meta = PLATFORM_META[acc.platform];
                  if (!meta) return null;
                  const over = caption.length > meta.limit;
                  return (
                    <span key={acc.id} className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                      over ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200')}>
                      {meta.label.split(' ')[0]}: {caption.length}/{meta.limit}
                    </span>
                  );
                })}
              </div>
            </div>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your post content here…" rows={8}
              className="w-full min-h-[230px] bg-gradient-to-br from-gray-50/90 to-white border border-gray-200 rounded-xl p-4 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none shadow-inner shadow-gray-100/40 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all leading-7 resize-y" />
            <div className="-mt-1 flex items-center justify-between text-[11px]"><span className="text-gray-400">Write naturally — Relay will keep platform limits visible above.</span><span className="font-semibold text-gray-400">{caption.length} characters</span></div>
            {templatePickerOpen && (
              <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Saved templates</span>
                  <button type="button" onClick={() => setTemplatePickerOpen(false)} className="text-[11px] font-semibold text-gray-400 hover:text-gray-700">Close</button>
                </div>
                {templateStatus === 'loading' ? (
                  <div className="flex items-center gap-2 px-2 py-3 text-xs text-gray-400"><Loader2 size={13} className="animate-spin" /> Loading templates…</div>
                ) : savedTemplates.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-gray-400">No saved templates for this brand yet.</p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {savedTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          setCaption((current) => current.trim()
                            ? `${current.trimEnd()}\n\n${template.caption}`
                            : template.caption);
                          setTemplatePickerOpen(false);
                          toast(`${template.name} added to the caption`, 'success');
                        }}
                        className="w-full rounded-md border border-transparent px-2.5 py-2 text-left hover:border-orange-200 hover:bg-white transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-700">{template.name}</span>
                          <span className="shrink-0 text-[10px] text-gray-400">{template.category}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-400">{template.caption}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} className="text-orange-600" /> AI Quick Actions
                </span>
                {isAiLoading && <RefreshCw size={12} className="animate-spin text-orange-600" />}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {hasImages && !hasVideo && (
                  <button type="button" disabled={isAiLoading}
                    onClick={handleGenerateFromImage}
                    title="Write a caption based on what's in your image"
                    className="btn-clay-primary h-6.5 px-2.5 text-[11px] font-semibold disabled:opacity-50 inline-flex items-center gap-1">
                    <ImageIcon size={11} /> Caption from image
                  </button>
                )}
                {AI_QUICK_ACTIONS.map((act) => (
                  <button key={act.label} type="button" disabled={isAiLoading}
                    onClick={() => handleAiAction(act.prompt)}
                    className="btn-clay-secondary h-6.5 px-2.5 text-[11px] font-medium disabled:opacity-50">
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={13} className="text-gray-500" /> Media
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedAccounts.map(acc => {
                  const rules = PLATFORM_MEDIA_RULES[acc.platform];
                  if (!rules) return null;
                  return (
                    <span key={acc.id} className="text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                      {acc.platform}: {rules.note}
                    </span>
                  );
                })}
                <button type="button" onClick={openLibrary}
                  className="flex items-center gap-1 h-6 px-2.5 text-[11px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                  <FolderOpen size={11} /> Browse library
                </button>
              </div>
            </div>

            {/* Validation errors */}
            {mediaError && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-red-700">{mediaError}</p>
              </div>
            )}

            {/* Platform compatibility warnings */}
            {mediaWarnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle size={12} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-amber-700">{w}</p>
              </div>
            ))}

            {/* Thumbnail grid */}
            {mediaItems.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {mediaItems.map((item) => (
                  <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-2xs">
                    {item.mimeType.startsWith('image/') ? (
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2">
                        <Film size={22} className="text-gray-400" />
                        <span className="text-[10px] text-gray-400 font-medium text-center break-all leading-tight line-clamp-2">{item.name}</span>
                      </div>
                    )}
                    <button type="button" onClick={() => removeMedia(item.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                      <XIcon size={10} />
                    </button>
                  </div>
                ))}
                {canAddMore && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors">
                    {mediaUploading ? (
                      <Loader2 size={16} className="text-orange-500 animate-spin" />
                    ) : (
                      <>
                        <Plus size={18} className="text-gray-400" />
                        <span className="text-[10px] text-gray-400 font-medium">Add</span>
                      </>
                    )}
                    <input type="file" accept={fileInputAccept} multiple className="hidden"
                      onChange={(e) => e.target.files && handleMediaFiles(e.target.files)} />
                  </label>
                )}
              </div>
            )}

            {/* Drop zone (empty state) */}
            {mediaItems.length === 0 && (
              <label
                className={cn(
                  'flex flex-col items-center justify-center gap-3 py-9 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                  mediaUploading ? 'border-orange-300 bg-orange-50/30' : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50/20',
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) handleMediaFiles(e.dataTransfer.files); }}
              >
                {mediaUploading ? (
                  <Loader2 size={26} className="text-orange-500 animate-spin" />
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 text-gray-300">
                      <ImageIcon size={26} />
                      <span className="text-gray-200 font-light text-lg">/</span>
                      <Film size={26} />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-gray-600">
                        Drop files here or <span className="text-orange-500">browse</span>
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">JPEG · PNG · GIF · WebP · MP4 · MOV</p>
                    </div>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept={fileInputAccept} multiple className="hidden"
                  onChange={(e) => e.target.files && handleMediaFiles(e.target.files)} />
              </label>
            )}

            {mediaUploading && mediaItems.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <Loader2 size={12} className="animate-spin text-orange-500" /> Uploading…
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2.5 shadow-2xs">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Post Timing</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {([
                { id: 'now',      label: 'Post immediately',   icon: Send     },
                { id: 'schedule', label: 'Schedule for later',  icon: Clock    },
                { id: 'draft',    label: 'Save as draft',       icon: FileText },
              ] as const).map((opt) => (
                <button key={opt.id} type="button" onClick={() => setMode(opt.id)}
                  className={cn('flex min-h-12 flex-col items-start justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition-all text-left',
                    mode === opt.id ? 'bg-orange-50 border-orange-300 text-orange-700 font-semibold shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300')}>
                  <opt.icon size={14} /><span>{opt.label}</span>
                </button>
              ))}
            </div>
            {mode === 'schedule' && (
              <DateTimePicker
                value={scheduleDate}
                onChange={(val) => setScheduleDate(val)}
                min={new Date().toISOString().slice(0, 16)}
              />
            )}
          </div>
        </div>

        {/* ── Right: Preview ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-3 shadow-2xs sticky top-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Live Preview</span>
              <span className="text-[11px] font-semibold text-gray-400">Platform Mockup</span>
            </div>

            {selectedAccounts.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {selectedAccounts.map((acc) => (
                  <button key={acc.id} type="button" onClick={() => setActivePreview(acc.platform)}
                    className={cn('flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0',
                      previewPlatform === acc.platform ? 'bg-gray-900 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                    <PlatformBadge platform={PLATFORM_BADGE_ID[acc.platform] ?? acc.platform.toLowerCase()} size="sm" />
                    <span>{PLATFORM_META[acc.platform]?.label ?? acc.platform}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Post card mockup */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col">
              {/* Post header */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-2xs"
                    style={{ backgroundColor: activeBrand.colorHex }}>
                    {activeBrand.name[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">{activeBrand.name}</span>
                    <span className="text-[10px] text-gray-400">Just now · Public</span>
                  </div>
                </div>
                <PlatformBadge platform={PLATFORM_BADGE_ID[previewPlatform] ?? previewPlatform.toLowerCase()} size="md" />
              </div>

              {/* Media preview */}
              {mediaItems.length > 0 && (
                <div className="w-full bg-black">
                  {hasVideo ? (
                    <video src={mediaVideos[0].url} controls className="w-full aspect-video object-contain max-h-48" />
                  ) : mediaImages.length === 1 ? (
                    <img src={mediaImages[0].url} alt="preview" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className={cn('grid gap-0.5', mediaImages.length >= 4 ? 'grid-cols-2' : mediaImages.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
                      {mediaImages.slice(0, 4).map((img, i) => (
                        <div key={img.id} className="relative aspect-square">
                          <img src={img.url} alt="preview" className="w-full h-full object-cover" />
                          {i === 3 && mediaImages.length > 4 && (
                            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">+{mediaImages.length - 4}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Caption */}
              <div className="px-3 pt-2 pb-1">
                <p className="text-xs text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {caption || <span className="text-gray-400 italic">Your caption will appear here…</span>}
                </p>
              </div>

              {/* Engagement row */}
              <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-100 text-gray-500 mt-1">
                {previewPlatform === 'Instagram' && (
                  <><div className="flex items-center gap-3"><Heart size={16} /><MessageCircle size={16} /><Send size={15} /></div><Bookmark size={16} /></>
                )}
                {previewPlatform === 'LinkedIn' && (
                  <div className="flex items-center justify-between w-full text-[11px] font-semibold text-gray-600">
                    <span className="flex items-center gap-1"><Heart size={14} /> Like</span>
                    <span className="flex items-center gap-1"><MessageCircle size={14} /> Comment</span>
                    <span className="flex items-center gap-1"><Repeat2 size={14} /> Repost</span>
                    <span className="flex items-center gap-1"><Send size={14} /> Send</span>
                  </div>
                )}
                {(previewPlatform === 'X' || previewPlatform === 'Facebook' || previewPlatform === 'TikTok') && (
                  <div className="flex items-center justify-between w-full text-[11px] font-medium text-gray-500">
                    <span className="flex items-center gap-1.5"><MessageCircle size={14} /> 12</span>
                    <span className="flex items-center gap-1.5"><Repeat2 size={14} /> 4</span>
                    <span className="flex items-center gap-1.5"><Heart size={14} /> 48</span>
                    <span className="flex items-center gap-1.5"><Share2 size={14} /> Share</span>
                  </div>
                )}
              </div>
            </div>

            {selectedAccounts.length === 0 && (
              <p className="text-[12px] text-gray-400 text-center py-2">Select a platform above to see the preview</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Library picker modal ─────────────────────────────────────────────── */}
      {libraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="text-[15px] font-bold text-gray-900">Browse Media Library</p>
                <p className="text-[12px] text-gray-400 mt-0.5">Select files to add to this post</p>
              </div>
              <button type="button" onClick={() => setLibraryOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <XIcon size={16} />
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {libraryLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-orange-500" />
                </div>
              ) : libraryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <ImageIcon size={32} className="text-gray-200" />
                  <p className="text-sm font-medium text-gray-400">No media uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {libraryItems.map((item) => {
                    const sel = librarySelected.has(item.id);
                    return (
                      <button key={item.id} type="button"
                        onClick={() => setLibrarySelected(prev => {
                          const n = new Set(prev);
                          sel ? n.delete(item.id) : n.add(item.id);
                          return n;
                        })}
                        className={cn(
                          'relative aspect-square rounded-xl overflow-hidden border-2 transition-all',
                          sel ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-transparent hover:border-orange-300',
                        )}>
                        {item.mimeType.startsWith('image/') ? (
                          <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-1.5 p-2">
                            <Film size={20} className="text-gray-400" />
                            <span className="text-[10px] text-gray-400 font-medium text-center break-all leading-tight line-clamp-2">{item.name}</span>
                          </div>
                        )}
                        {sel && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow">
                            <Check size={11} strokeWidth={3} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
              <span className="text-[12px] text-gray-500">
                {librarySelected.size > 0 ? `${librarySelected.size} selected` : 'Click to select files'}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setLibraryOpen(false)}
                  className="btn-clay-secondary h-8 px-4 text-xs font-semibold">
                  Cancel
                </button>
                <button type="button" onClick={confirmLibrarySelection} disabled={librarySelected.size === 0}
                  className="btn-clay-primary h-8 px-4 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5">
                  <Plus size={13} /> Add {librarySelected.size > 0 ? librarySelected.size : ''} to post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
