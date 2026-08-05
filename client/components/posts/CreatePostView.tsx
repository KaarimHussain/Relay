'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Sparkles, Send, Clock, FileText,
  Upload, Check, Heart, MessageCircle, Share2, Repeat2, Bookmark,
  RefreshCw, AlertCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformBadge } from '@/components/ui/platform-icons';
import { useToast } from '@/components/ui/toast';
import { useBrandStore } from '@/store/brand';
import { useAccountStore } from '@/store/account';
import { usePostStore } from '@/store/post';
import { ApiError } from '@/lib/api';

const PLATFORM_META: Record<string, { label: string; limit: number }> = {
  Instagram: { label: 'Instagram', limit: 2200  },
  LinkedIn:  { label: 'LinkedIn',  limit: 3000  },
  X:         { label: 'X',         limit: 280   },
  Facebook:  { label: 'Facebook',  limit: 63206 },
  TikTok:    { label: 'TikTok',    limit: 2200  },
};

// Maps backend Platform enum to PlatformBadge id
const PLATFORM_BADGE_ID: Record<string, string> = {
  Instagram: 'instagram', LinkedIn: 'linkedin', X: 'x', Facebook: 'facebook', TikTok: 'tiktok',
};

type PostMode = 'now' | 'schedule' | 'draft';
type PreviewPlatform = string;

const AI_QUICK_ACTIONS = [
  { label: '✨ Auto-Fix Tone',     prompt: 'improve-tone'   },
  { label: '🔥 Add Viral Hook',    prompt: 'add-hook'       },
  { label: '🏷️ Generate Hashtags', prompt: 'add-hashtags'   },
  { label: '📏 Shorten for X',     prompt: 'shorten-for-x'  },
];

export function CreatePostView() {
  const router = useRouter();
  const { toast } = useToast();
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const accounts = useAccountStore((s) => s.accounts.filter((a) => a.status === 'Active'));
  const { createPost, schedulePost, publishNow } = usePostStore();

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [activePreview, setActivePreview] = useState<PreviewPlatform>('');
  const [mode, setMode] = useState<PostMode>('schedule');
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date(Date.now() + 3600000);
    return d.toISOString().slice(0, 16);
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const toggleAccount = (id: string, platform: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else { next.add(id); if (!activePreview) setActivePreview(platform); }
      return next;
    });
  };

  const selectedAccounts = accounts.filter((a) => selectedAccountIds.has(a.id));
  const previewPlatform = activePreview || selectedAccounts[0]?.platform || 'Instagram';

  const handleAiAction = (prompt: string) => {
    setIsAiLoading(true);
    setTimeout(() => {
      if (prompt === 'add-hashtags') setCaption((p) => p + '\n\n#ContentCreator #GrowthHacking #DigitalMarketing #SMM');
      else if (prompt === 'add-hook') setCaption((p) => '🔥 Stop scrolling! ' + p);
      else if (prompt === 'shorten-for-x') setCaption((p) => p.slice(0, 270) + (p.length > 270 ? '…' : ''));
      else toast('Tone polished with AI!', 'sparkle');
      setIsAiLoading(false);
      toast('Applied AI action', 'sparkle');
    }, 800);
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
      const post = await createPost(activeBrand.id, { title: title.trim(), targets });

      if (mode === 'now') {
        await publishNow(activeBrand.id, post.id);
        toast('Post queued for publishing!', 'success');
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
      await createPost(activeBrand.id, { title: title.trim(), targets });
      toast('Draft saved', 'info');
      router.push('/queue');
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to save draft.');
      setIsSubmitting(false);
    }
  };

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle size={24} className="text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No brand selected</p>
        <p className="text-xs text-gray-400">Select a brand from the sidebar first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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

      {/* Error */}
      {submitError && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs font-medium text-red-700">{submitError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Composer */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Title */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Post Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Product launch announcement"
              maxLength={200}
              className="w-full h-[38px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">Used internally to identify this post in your queue.</p>
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
                      {active && <Check size={12} className="text-orange-600 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Post Caption</label>
              <div className="flex items-center gap-2">
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
              placeholder="Write your post content here…"
              rows={6}
              className="w-full bg-gray-50/80 border border-gray-200 rounded-lg p-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors leading-relaxed resize-none" />

            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} className="text-orange-600" /> AI Quick Actions
                </span>
                {isAiLoading && <RefreshCw size={12} className="animate-spin text-orange-600" />}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
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

          {/* Schedule options */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2.5 shadow-2xs">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Post Timing</label>
            <div className="flex flex-col gap-2">
              {([
                { id: 'now',      label: 'Post immediately',  icon: Send     },
                { id: 'schedule', label: 'Schedule for later', icon: Clock    },
                { id: 'draft',    label: 'Save as draft',      icon: FileText },
              ] as const).map((opt) => (
                <button key={opt.id} type="button" onClick={() => setMode(opt.id)}
                  className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all text-left',
                    mode === opt.id ? 'bg-orange-50 border-orange-300 text-orange-700 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white')}>
                  <opt.icon size={13} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            {mode === 'schedule' && (
              <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full h-8 bg-gray-50 border border-gray-200 rounded-lg px-2.5 text-xs text-gray-800 font-medium outline-none focus:border-orange-500" />
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Live Preview</span>
              <span className="text-[11px] font-semibold text-gray-400">Platform Mockup</span>
            </div>

            {selectedAccounts.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {selectedAccounts.map((acc) => {
                  const isActive = previewPlatform === acc.platform;
                  return (
                    <button key={acc.id} type="button" onClick={() => setActivePreview(acc.platform)}
                      className={cn('flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0',
                        isActive ? 'bg-gray-900 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                      <PlatformBadge platform={PLATFORM_BADGE_ID[acc.platform] ?? acc.platform.toLowerCase()} size="sm" />
                      <span>{PLATFORM_META[acc.platform]?.label ?? acc.platform}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-2xs"
                    style={{ backgroundColor: activeBrand.colorHex }}>
                    {activeBrand.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">{activeBrand.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Just now · Public</span>
                  </div>
                </div>
                <PlatformBadge platform={PLATFORM_BADGE_ID[previewPlatform] ?? previewPlatform.toLowerCase()} size="md" />
              </div>

              <p className="text-xs text-gray-900 leading-relaxed whitespace-pre-wrap">
                {caption || <span className="text-gray-400 italic">Your caption will appear here…</span>}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200/80 text-gray-500">
                {previewPlatform === 'Instagram' && (
                  <>
                    <div className="flex items-center gap-3">
                      <Heart size={16} /><MessageCircle size={16} /><Send size={15} />
                    </div>
                    <Bookmark size={16} />
                  </>
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
    </div>
  );
}
