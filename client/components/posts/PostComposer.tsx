'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  ImageIcon,
  Calendar,
  ChevronDown,
  Send,
  FileText,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', abbr: 'IG', color: 'bg-gradient-to-br from-pink-500 via-rose-500 to-amber-400', limit: 2200 },
  { id: 'x',         label: 'X',         abbr: 'X',  color: 'bg-gray-900',  limit: 280  },
  { id: 'linkedin',  label: 'LinkedIn',  abbr: 'LI', color: 'bg-blue-700',  limit: 3000 },
  { id: 'facebook',  label: 'Facebook',  abbr: 'FB', color: 'bg-blue-600',  limit: 63206 },
  { id: 'tiktok',    label: 'TikTok',    abbr: 'TT', color: 'bg-gray-950',  limit: 2200 },
] as const;

type PlatformId = typeof PLATFORMS[number]['id'];

// ─── AI suggestions (mock) ────────────────────────────────────────────────────

const AI_SUGGESTIONS = [
  "🚀 Excited to share what we've been building at {brand}! Our team has been working hard to create something that changes how you approach content strategy. Stay tuned for the big reveal — it's going to be worth the wait. #Innovation #ContentMarketing",
  "The secret to consistent social media growth? It's not just about posting more — it's about posting smarter. Here's what we've learned managing content across 50+ brands 👇 #SocialMediaTips #GrowthHacking",
  "Behind every great brand is a story worth sharing. Today we're pulling back the curtain on our creative process and showing you exactly how we turn ideas into content that drives real results. 🎯",
];

// ─── Schedule picker ──────────────────────────────────────────────────────────

type PostMode = 'now' | 'schedule' | 'draft';

function SchedulePicker({
  mode,
  onChange,
  date,
  onDateChange,
}: {
  mode: PostMode;
  onChange: (m: PostMode) => void;
  date: string;
  onDateChange: (d: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        {([
          { value: 'now',      label: 'Post now',      icon: Send },
          { value: 'schedule', label: 'Schedule',       icon: Clock },
          { value: 'draft',    label: 'Save as draft',  icon: FileText },
        ] as { value: PostMode; label: string; icon: typeof Send }[]).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors',
              mode === value
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {mode === 'schedule' && (
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-gray-400 shrink-0" />
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-colors"
          />
        </div>
      )}
    </div>
  );
}

// ─── Platform preview pill ────────────────────────────────────────────────────

function PlatformPill({
  platform,
  selected,
  onClick,
}: {
  platform: typeof PLATFORMS[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-medium transition-all',
        selected
          ? 'border-transparent text-white shadow-sm'
          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
      )}
      style={selected ? {} : {}}
    >
      {selected ? (
        <span
          className={cn(
            'flex items-center gap-1.5 px-0',
          )}
        >
          <span
            className={cn('w-4 h-4 rounded-sm flex items-center justify-center text-white text-[9px] font-bold', platform.color)}
          >
            {platform.abbr[0]}
          </span>
          <span className="text-gray-800 font-medium">{platform.label}</span>
        </span>
      ) : (
        <>
          <span
            className={cn('w-4 h-4 rounded-sm flex items-center justify-center text-white text-[9px] font-bold', platform.color)}
          >
            {platform.abbr[0]}
          </span>
          {platform.label}
        </>
      )}
    </button>
  );
}

// ─── Post Composer ────────────────────────────────────────────────────────────

interface PostComposerProps {
  onClose: () => void;
}

export function PostComposer({ onClose }: PostComposerProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformId>>(new Set(['instagram']));
  const [caption, setCaption] = useState('');
  const [mode, setMode] = useState<PostMode>('schedule');
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(120, ta.scrollHeight)}px`;
  }, [caption]);

  const togglePlatform = (id: PlatformId) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id) && next.size > 1) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAiGenerate = async () => {
    setAiLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setAiLoading(false);
    setShowAiSuggestions(true);
  };

  const applyAiSuggestion = (text: string) => {
    setCaption(text);
    setShowAiSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setMediaFiles((prev) => [...prev, url]);
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setMediaFiles((prev) => [...prev, url]);
    });
  };

  // Lowest character limit among selected platforms
  const lowestLimit = Math.min(
    ...PLATFORMS.filter((p) => selectedPlatforms.has(p.id)).map((p) => p.limit)
  );
  const charPercent = Math.min((caption.length / lowestLimit) * 100, 100);
  const charColor =
    charPercent > 90 ? 'text-red-500' : charPercent > 70 ? 'text-amber-500' : 'text-gray-400';

  const canSubmit = caption.trim().length > 0 && selectedPlatforms.size > 0;

  const submitLabel =
    mode === 'now' ? 'Publish now' : mode === 'schedule' ? 'Schedule post' : 'Save draft';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[580px] bg-white border-l border-gray-200 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 shrink-0">
          <h2 className="text-[15px] font-semibold text-gray-900">New post</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 flex flex-col gap-5">

            {/* Platform selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                Publish to
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PLATFORMS.map((p) => (
                  <PlatformPill
                    key={p.id}
                    platform={p}
                    selected={selectedPlatforms.has(p.id)}
                    onClick={() => togglePlatform(p.id)}
                  />
                ))}
              </div>
            </div>

            {/* Caption */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                  Caption
                </label>
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 h-7 px-2.5 text-[12px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md hover:bg-indigo-100 transition-colors disabled:opacity-60"
                >
                  <Sparkles size={12} />
                  {aiLoading ? 'Generating…' : 'Write with AI'}
                </button>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What do you want to share?"
                  className="w-full min-h-[120px] px-3.5 pt-3 pb-8 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors resize-none leading-relaxed"
                />
                <div className={cn('absolute bottom-2.5 right-3 text-[11px]', charColor)}>
                  {caption.length} / {lowestLimit.toLocaleString()}
                </div>
              </div>

              {/* AI suggestions */}
              {showAiSuggestions && (
                <div className="flex flex-col gap-2 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[12px] font-medium text-indigo-600 flex items-center gap-1">
                      <Sparkles size={11} />
                      AI suggestions — pick one
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAiSuggestions(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  {AI_SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyAiSuggestion(s)}
                      className="text-left text-[12px] text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2.5 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors line-clamp-2"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Media upload */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                Media
              </label>

              {mediaFiles.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {mediaFiles.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                  dragOver
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                )}
              >
                <ImageIcon size={20} className="text-gray-300" />
                <p className="text-[12px] text-gray-400">
                  Drop images here, or{' '}
                  <span className="text-indigo-500 font-medium">browse</span>
                </p>
                <p className="text-[11px] text-gray-300">PNG, JPG, GIF up to 10MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {/* Per-platform character count breakdown */}
            {selectedPlatforms.size > 1 && caption.length > 0 && (
              <div className="flex flex-col gap-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
                  Character count by platform
                </p>
                {PLATFORMS.filter((p) => selectedPlatforms.has(p.id)).map((p) => {
                  const pct = Math.min((caption.length / p.limit) * 100, 100);
                  const over = caption.length > p.limit;
                  return (
                    <div key={p.id} className="flex items-center gap-2.5">
                      <span
                        className={cn('w-5 h-5 rounded-sm flex items-center justify-center text-white text-[9px] font-bold shrink-0', p.color)}
                      >
                        {p.abbr[0]}
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : 'bg-indigo-400')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={cn('text-[11px] shrink-0 tabular-nums', over ? 'text-red-500 font-medium' : 'text-gray-400')}>
                        {caption.length}/{p.limit}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 flex flex-col gap-3 shrink-0">
          <SchedulePicker
            mode={mode}
            onChange={setMode}
            date={scheduleDate}
            onDateChange={setScheduleDate}
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="btn-clay-secondary h-8 px-4 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              className="btn-clay-primary h-8 px-4 text-xs gap-1.5 font-semibold"
            >
              {mode === 'now' ? <Send size={13} /> : mode === 'schedule' ? <Clock size={13} /> : <FileText size={13} />}
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
