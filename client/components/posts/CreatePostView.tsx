'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Sparkles, Send, Clock, FileText,
  Upload, Image as ImageIcon, Check, X,
  Heart, MessageCircle, Share2, Repeat2, Bookmark,
  RefreshCw, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformBadge } from '@/components/ui/platform-icons';
import { useToast } from '@/components/ui/toast';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', limit: 2200 },
  { id: 'linkedin',  label: 'LinkedIn',  limit: 3000 },
  { id: 'x',         label: 'X (Twitter)', limit: 280 },
  { id: 'facebook',  label: 'Facebook',  limit: 63206 },
  { id: 'tiktok',    label: 'TikTok',    limit: 2200 },
] as const;

type PlatformId = typeof PLATFORMS[number]['id'];
type PostMode = 'now' | 'schedule' | 'draft';

const AI_QUICK_ACTIONS = [
  { label: '✨ Auto-Fix Tone', prompt: 'Improve tone and clarity' },
  { label: '🔥 Add Viral Hook', prompt: 'Add a strong scroll-stopping hook at the beginning' },
  { label: '🏷️ Generate Hashtags', prompt: 'Add 5 relevant niche hashtags at the end' },
  { label: '📏 Shorten for X', prompt: 'Trim caption to under 280 characters' },
];

const MOCK_MEDIA_ITEMS = [
  { id: '1', name: 'product-hero.jpg', bg: 'from-indigo-400 to-violet-600' },
  { id: '2', name: 'team-brainstorm.jpg', bg: 'from-amber-300 to-orange-500' },
  { id: '3', name: 'launch-banner.png', bg: 'from-sky-400 to-blue-600' },
];

export function CreatePostView() {
  const router = useRouter();
  const { toast } = useToast();

  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformId>>(
    new Set(['instagram', 'linkedin'])
  );
  const [caption, setCaption] = useState(
    "🚀 Excited to introduce our new AI-powered post scheduler! Multi-platform publishing, real-time analytics, and instant caption generation built for creators and brands.\n\nWhat features are you most excited for? Let us know in the comments below 👇 #SocialMedia #Marketing"
  );
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<PlatformId>('instagram');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(MOCK_MEDIA_ITEMS[0].bg);
  const [mode, setMode] = useState<PostMode>('schedule');
  const [scheduleDate, setScheduleDate] = useState('2026-08-06T15:00');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const togglePlatform = (id: PlatformId) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApplyAiAction = (actionLabel: string) => {
    setIsAiLoading(true);
    setTimeout(() => {
      setIsAiLoading(false);
      if (actionLabel.includes('Hashtags')) {
        setCaption((prev) => prev + "\n\n#ContentCreator #GrowthHacking #DigitalMarketing #SMM");
      } else if (actionLabel.includes('Hook')) {
        setCaption((prev) => "🔥 Stop scrolling! " + prev);
      } else if (actionLabel.includes('Shorten')) {
        setCaption((prev) => prev.slice(0, 240) + "...");
      } else {
        toast('Tone polished with AI!', 'sparkle');
      }
      toast(`Applied: ${actionLabel}`, 'sparkle');
    }, 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'now') {
      toast('Post published successfully across selected channels!', 'success');
    } else if (mode === 'schedule') {
      toast('Post scheduled for ' + scheduleDate.replace('T', ' at '), 'success');
    } else {
      toast('Saved as draft in post queue', 'info');
    }
    setTimeout(() => router.push('/queue'), 1000);
  };

  const currentPlatformDef = PLATFORMS.find((p) => p.id === activePreviewPlatform)!;
  const isOverCharLimit = caption.length > currentPlatformDef.limit;

  return (
    <div className="flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="btn-clay-secondary h-7.5 px-2.5 text-xs gap-1.5 font-medium"
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Create & Schedule Post</h1>
            <p className="text-xs text-gray-500">Compose once, preview natively, and publish everywhere</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { toast('Draft saved', 'info'); router.push('/queue'); }}
            className="btn-clay-secondary h-8 px-3.5 text-xs font-semibold"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-clay-primary h-8 px-4 text-xs font-semibold gap-1.5"
          >
            {mode === 'now' ? <Send size={13} /> : <Clock size={13} />}
            {mode === 'now' ? 'Publish Now' : mode === 'schedule' ? 'Schedule Post' : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Composer Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Platform Selector Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2.5 shadow-2xs">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Publishing Platforms
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PLATFORMS.map((p) => {
                const active = selectedPlatforms.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={cn(
                      'flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer',
                      active
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700'
                    )}
                  >
                    <PlatformBadge platform={p.id} size="sm" />
                    <span>{p.label}</span>
                    {active && <Check size={12} className="text-indigo-600 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caption Composer Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Post Caption</label>
              <div className="flex items-center gap-2">
                {Array.from(selectedPlatforms).map((id) => {
                  const p = PLATFORMS.find((x) => x.id === id)!;
                  const over = caption.length > p.limit;
                  return (
                    <span
                      key={id}
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                        over
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      )}
                    >
                      {p.label.split(' ')[0]}: {caption.length}/{p.limit}
                    </span>
                  );
                })}
              </div>
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your post content here..."
              rows={6}
              className="w-full bg-gray-50/80 border border-gray-200 rounded-lg p-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors leading-relaxed resize-none"
            />

            {/* AI Assistant Quick Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} className="text-violet-600" /> AI Assistant Actions
                </span>
                {isAiLoading && <RefreshCw size={12} className="animate-spin text-violet-600" />}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {AI_QUICK_ACTIONS.map((act) => (
                  <button
                    key={act.label}
                    type="button"
                    onClick={() => handleApplyAiAction(act.label)}
                    className="btn-clay-secondary h-6.5 px-2.5 text-[11px] font-medium"
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Media & Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Media Selector */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2.5 shadow-2xs">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Attached Media</label>
              <div className="grid grid-cols-3 gap-2">
                {MOCK_MEDIA_ITEMS.map((item) => {
                  const isSelected = selectedMedia === item.bg;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedMedia(isSelected ? null : item.bg)}
                      className={cn(
                        'h-16 rounded-lg bg-gradient-to-br flex items-center justify-center relative transition-all border overflow-hidden cursor-pointer',
                        item.bg,
                        isSelected ? 'ring-2 ring-indigo-600 border-indigo-600' : 'border-gray-200 hover:opacity-90'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                          <Check size={16} className="text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => toast('Uploaded image attached', 'info')}
                  className="btn-clay-secondary h-7 px-2.5 text-[11px] gap-1 font-medium w-full"
                >
                  <Upload size={12} /> Upload File
                </button>
              </div>
            </div>

            {/* Schedule Options */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2.5 shadow-2xs">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Post Timing</label>
              <div className="flex flex-col gap-2">
                {([
                  { id: 'now', label: 'Post immediately', icon: Send },
                  { id: 'schedule', label: 'Schedule for later', icon: Clock },
                  { id: 'draft', label: 'Save as draft', icon: FileText },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all text-left',
                      mode === opt.id
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white'
                    )}
                  >
                    <opt.icon size={13} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {mode === 'schedule' && (
                <div className="mt-1">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full h-8 bg-gray-50 border border-gray-200 rounded-lg px-2.5 text-xs text-gray-800 font-medium outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Multi-Platform Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          
          {/* Preview Header Tabs */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Live Platform Feed Preview</span>
              <span className="text-[11px] font-semibold text-gray-400">Real-time Mockup</span>
            </div>

            {/* Platform Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {Array.from(selectedPlatforms).map((id) => {
                const isActive = activePreviewPlatform === id;
                const p = PLATFORMS.find((x) => x.id === id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActivePreviewPlatform(id)}
                    className={cn(
                      'flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer',
                      isActive
                        ? 'bg-gray-900 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <PlatformBadge platform={id} size="sm" />
                    <span>{p.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Mockup Frame */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col gap-3">
              
              {/* Profile Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                    AC
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">Acme Co.</span>
                      <span className="text-[10px] text-gray-400 font-medium">@acmeco</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">Just now · Public</span>
                  </div>
                </div>
                <PlatformBadge platform={activePreviewPlatform} size="md" />
              </div>

              {/* Caption Text */}
              <p className="text-xs text-gray-900 leading-relaxed whitespace-pre-wrap font-normal">
                {caption || <span className="text-gray-400 italic">Your caption will appear here...</span>}
              </p>

              {/* Media Preview Box */}
              {selectedMedia && (
                <div className={cn('w-full h-44 rounded-lg bg-gradient-to-br border border-black/5 shadow-2xs', selectedMedia)} />
              )}

              {/* Native Platform Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/80 text-gray-500">
                {activePreviewPlatform === 'instagram' && (
                  <>
                    <div className="flex items-center gap-3">
                      <Heart size={16} className="hover:text-rose-500 cursor-pointer" />
                      <MessageCircle size={16} className="hover:text-indigo-600 cursor-pointer" />
                      <Send size={15} className="hover:text-indigo-600 cursor-pointer" />
                    </div>
                    <Bookmark size={16} className="hover:text-indigo-600 cursor-pointer" />
                  </>
                )}

                {activePreviewPlatform === 'linkedin' && (
                  <div className="flex items-center justify-between w-full text-[11px] font-semibold text-gray-600">
                    <span className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"><Heart size={14} /> Like</span>
                    <span className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"><MessageCircle size={14} /> Comment</span>
                    <span className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"><Repeat2 size={14} /> Repost</span>
                    <span className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"><Send size={14} /> Send</span>
                  </div>
                )}

                {(activePreviewPlatform === 'x' || activePreviewPlatform === 'facebook' || activePreviewPlatform === 'tiktok') && (
                  <div className="flex items-center justify-between w-full text-[11px] font-medium text-gray-500">
                    <span className="flex items-center gap-1.5 hover:text-indigo-600 cursor-pointer"><MessageCircle size={14} /> 12</span>
                    <span className="flex items-center gap-1.5 hover:text-emerald-600 cursor-pointer"><Repeat2 size={14} /> 4</span>
                    <span className="flex items-center gap-1.5 hover:text-rose-500 cursor-pointer"><Heart size={14} /> 48</span>
                    <span className="flex items-center gap-1.5 hover:text-indigo-600 cursor-pointer"><Share2 size={14} /> Share</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
