'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles, Copy, Check, Plus, X,
  PenLine, Lightbulb, Hash, Send,
  RefreshCw, AlertCircle, Bookmark, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useBrandStore } from '@/store/brand';
import { useTemplateStore } from '@/store/template';
import { PlatformBadge } from '@/components/ui/platform-icons';
import { api, ApiError } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function CopyButton({ text, size = 'sm' }: { text: string; size?: 'sm' | 'xs' }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast('Copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy}
      className={cn('btn-clay-secondary gap-1 shrink-0 font-semibold',
        copied ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'text-gray-600',
        size === 'sm' ? 'h-6.5 px-2 text-xs' : 'h-5.5 px-1.5 text-[11px]')}>
      {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

interface SavePayload {
  brandId: string;
  name: string;
  category: string;
  platforms: string[];
  caption: string;
}

function SaveButton({ payload, size = 'sm' }: { payload: SavePayload; size?: 'sm' | 'xs' }) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { toast } = useToast();
  const createTemplate = useTemplateStore((s) => s.createTemplate);

  const save = async () => {
    if (state !== 'idle') return;
    setState('saving');
    try {
      await createTemplate(payload.brandId, {
        name: payload.name,
        category: payload.category,
        platforms: payload.platforms,
        caption: payload.caption,
      });
      setState('saved');
      toast('Saved to Templates!', 'success');
      setTimeout(() => setState('idle'), 2500);
    } catch (e) {
      setState('idle');
      toast(e instanceof ApiError ? e.message : 'Failed to save', 'error');
    }
  };

  return (
    <button onClick={save} disabled={state !== 'idle'}
      className={cn('btn-clay-secondary gap-1 shrink-0 font-semibold transition-colors',
        state === 'saved' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'text-gray-600',
        size === 'sm' ? 'h-6.5 px-2 text-xs' : 'h-5.5 px-1.5 text-[11px]')}>
      {state === 'saved'
        ? <><Check size={11} strokeWidth={2.5} /> Saved</>
        : state === 'saving'
        ? <><RefreshCw size={11} className="animate-spin" /> Saving…</>
        : <><Bookmark size={11} /> Save</>}
    </button>
  );
}

function GenerateButton({ loading, onClick, disabled, label = 'Generate Magic' }: {
  loading: boolean; onClick: () => void; disabled?: boolean; label?: string;
}) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="btn-clay-ai h-8.5 px-4 text-xs gap-1.5 font-semibold">
      {loading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
      {loading ? 'Generating…' : label}
    </button>
  );
}

// ─── Caption Writer ───────────────────────────────────────────────────────────

const TONES = ['Professional', 'Casual', 'Witty', 'Inspirational', 'Promotional'] as const;
type Tone = typeof TONES[number];

const BACKEND_PLATFORMS = ['Instagram', 'X', 'LinkedIn', 'Facebook', 'TikTok'] as const;
type BackendPlatform = typeof BACKEND_PLATFORMS[number];

const PLATFORM_LABELS: Record<BackendPlatform, string> = {
  Instagram: 'Instagram', X: 'X (Twitter)', LinkedIn: 'LinkedIn', Facebook: 'Facebook', TikTok: 'TikTok',
};

const QUICK_PROMPTS = [
  { label: '🔥 Viral Hook',         text: '5 counterintuitive content marketing rules that actually doubled our reach' },
  { label: '✨ Behind-the-Scenes',   text: 'What our team learned after testing 100 AI caption prompts this week' },
  { label: '💼 Thought Leadership',  text: 'Why engagement rate matters more than total follower count in 2025' },
  { label: '🛍️ Product Drop',        text: 'Introducing multi-platform post scheduling with AI assistant features' },
];

interface CaptionVariation { caption: string; hashtags: string[] }

function CaptionWriter() {
  const { toast } = useToast();
  const activeBrand = useBrandStore((s) => s.activeBrand());

  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<Tone>('Professional');
  const [platform, setPlatform] = useState<BackendPlatform>('Instagram');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CaptionVariation[]>([]);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!topic.trim() || !activeBrand) return;
    setLoading(true);
    setError('');
    try {
      const resp = await api.post<{ variations: CaptionVariation[] }>(
        `/brands/${activeBrand.id}/ai/generate-caption`,
        { platform, topic: `[${tone} tone] ${topic}`, variations: 2 },
      );
      setResults(resp.variations);
      toast('AI captions generated!', 'sparkle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate captions. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  if (!activeBrand) {
    return (
      <div className="flex items-center gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle size={14} className="text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700">
          Select a brand first —{' '}
          <Link href="/dashboard" className="font-semibold underline">go to dashboard</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Quick Prompts:</span>
        {QUICK_PROMPTS.map((p) => (
          <button key={p.label} onClick={() => { setTopic(p.text); toast(`Applied: ${p.label}`, 'info'); }}
            className="btn-clay-secondary h-6 px-2.5 text-[11px] font-medium shrink-0">
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3.5 shadow-2xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">What is your post about?</label>
            {topic && (
              <button onClick={() => setTopic('')} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                Clear
              </button>
            )}
          </div>
          <textarea value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Launching our new AI scheduling feature…"
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors resize-none leading-relaxed" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            {TONES.map(t => (
              <button key={t} onClick={() => setTone(t)}
                className={cn('h-7 px-2.5 rounded-md text-xs font-medium transition-colors',
                  tone === t ? 'btn-clay-primary text-white text-[11px]' : 'btn-clay-secondary text-gray-600 text-[11px]')}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Select value={platform} onValueChange={(val) => val && setPlatform(val as BackendPlatform)}>
              <SelectTrigger className="h-8.5 bg-gray-50 border-gray-200 text-xs text-gray-700 font-medium min-w-[130px]">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {BACKEND_PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <GenerateButton loading={loading} onClick={generate} disabled={!topic.trim()} />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={13} className="text-red-500 shrink-0" />
          <p className="text-xs font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Sparkles size={13} className="text-orange-600" />
              Generated Captions ({tone} · {PLATFORM_LABELS[platform]})
            </p>
            <button onClick={generate} disabled={loading} className="btn-clay-secondary h-7 px-2.5 text-xs gap-1">
              <RefreshCw size={12} /> Regenerate
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {results.map((variation, i) => {
              const fullText = variation.hashtags.length > 0
                ? `${variation.caption}\n\n${variation.hashtags.join(' ')}`
                : variation.caption;
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col gap-3 shadow-2xs hover:border-gray-300 transition-colors">
                  <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">{variation.caption}</p>
                  {variation.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {variation.hashtags.map((tag) => (
                        <span key={tag} className="text-[11px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-[11px] font-medium text-gray-400">{variation.caption.length} chars</span>
                    <div className="flex items-center gap-1.5">
                      <CopyButton text={fullText} />
                      {activeBrand && (
                        <SaveButton size="sm" payload={{
                          brandId: activeBrand.id,
                          name: `AI Caption – ${PLATFORM_LABELS[platform]} – ${tone}`,
                          category: tone === 'Promotional' ? 'Promotional' : tone === 'Inspirational' ? 'Inspirational' : 'Educational',
                          platforms: [platform.toLowerCase()],
                          caption: fullText,
                        }} />
                      )}
                      <Link
                        href={`/posts/new?caption=${encodeURIComponent(fullText)}&platform=${platform.toLowerCase()}`}
                        className="btn-clay-primary h-6.5 px-2.5 text-xs gap-1 font-semibold inline-flex items-center">
                        <Send size={11} /> Use in post
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Content Ideas ────────────────────────────────────────────────────────────

interface ContentIdea { theme: string; platform: string; hook: string; title: string; cta: string }

function ContentIdeas() {
  const { toast } = useToast();
  const activeBrand = useBrandStore((s) => s.activeBrand());

  const [niche, setNiche] = useState('');
  const [pillars, setPillars] = useState<string[]>(['Education', 'Behind the scenes']);
  const [pillarInput, setPillarInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ContentIdea[]>([]);
  const [error, setError] = useState('');

  const addPillar = () => {
    const v = pillarInput.trim();
    if (v && !pillars.includes(v)) setPillars(p => [...p, v]);
    setPillarInput('');
  };

  const generate = async () => {
    if (!niche.trim() || !activeBrand) return;
    setLoading(true);
    setError('');
    try {
      const resp = await api.post<{ ideas: ContentIdea[] }>(
        `/brands/${activeBrand.id}/ai/generate-ideas`,
        { niche: niche.trim(), pillars },
      );
      setResults(resp.ideas);
      toast('Content ideas generated!', 'sparkle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate ideas. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Industry or Niche</label>
          <input value={niche} onChange={e => setNiche(e.target.value)}
            placeholder="e.g. B2B SaaS, E-commerce fashion"
            className="h-8.5 bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/10" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Content Pillars</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {pillars.map(p => (
              <span key={p} className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">
                {p}
                <button onClick={() => setPillars(prev => prev.filter(x => x !== p))}><X size={11} /></button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input value={pillarInput} onChange={e => setPillarInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPillar()}
                placeholder="Add pillar…"
                className="h-7 w-28 bg-gray-50 border border-gray-200 rounded text-xs px-2 outline-none" />
              <button onClick={addPillar} className="btn-clay-secondary h-7 w-7 p-0 flex items-center justify-center">
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <GenerateButton loading={loading} onClick={generate} disabled={!niche.trim() || !activeBrand} label="Generate Ideas" />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={13} className="text-red-500 shrink-0" />
          <p className="text-xs font-medium text-red-700">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Sparkles size={13} className="text-orange-600" />
              Generated Ideas ({results.length} ideas for <span className="italic">{niche}</span>)
            </p>
            <button onClick={generate} disabled={loading} className="btn-clay-secondary h-7 px-2.5 text-xs gap-1">
              <RefreshCw size={12} /> Regenerate
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((idea, i) => {
              const ideaCaption = `${idea.hook}\n\n${idea.title}\n\nCTA: ${idea.cta}`;
              const ideaPlatform = idea.platform.toLowerCase().replace(/\s+/g, '');
              const VALID_PLATFORMS = ['instagram', 'x', 'linkedin', 'facebook', 'tiktok'];
              const platform = VALID_PLATFORMS.includes(ideaPlatform) ? ideaPlatform : 'instagram';
              const THEME_TO_CATEGORY: Record<string, string> = {
                educational: 'Educational', promotional: 'Promotional', engagement: 'Engagement',
                inspirational: 'Inspirational', announcement: 'Announcement',
                'behind-the-scenes': 'Behind-the-scenes', storytelling: 'Educational',
              };
              const category = THEME_TO_CATEGORY[idea.theme.toLowerCase()] ?? 'Educational';
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 shadow-2xs">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{idea.theme}</span>
                      <span className="text-[11px] font-medium text-gray-400">{idea.platform}</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 leading-snug">{idea.title}</p>
                    <p className="text-[11px] text-gray-500 italic leading-snug">&ldquo;{idea.hook}&rdquo;</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400 truncate mr-2">CTA: {idea.cta}</span>
                    <div className="flex items-center gap-1.5">
                      <CopyButton text={ideaCaption} size="xs" />
                      {activeBrand && (
                        <SaveButton size="xs" payload={{
                          brandId: activeBrand.id,
                          name: idea.title.length > 60 ? idea.title.slice(0, 57) + '…' : idea.title,
                          category,
                          platforms: [platform],
                          caption: ideaCaption,
                        }} />
                      )}
                      <Link
                        href={`/posts/new?caption=${encodeURIComponent(ideaCaption)}&platform=${platform}`}
                        className="btn-clay-primary h-5.5 px-1.5 text-[11px] gap-1 font-semibold inline-flex items-center"
                      >
                        <Send size={10} /> Use
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hashtag Finder ───────────────────────────────────────────────────────────

function HashtagFinder() {
  const { toast } = useToast();
  const activeBrand = useBrandStore((s) => s.activeBrand());

  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ popular: string[]; niche: string[] } | null>(null);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!topic.trim() || !activeBrand) return;
    setLoading(true);
    setError('');
    try {
      const resp = await api.post<{ popular: string[]; niche: string[] }>(
        `/brands/${activeBrand.id}/ai/generate-hashtags`,
        { topic: topic.trim() },
      );
      setResults(resp);
      toast('Hashtags found!', 'sparkle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate hashtags. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row items-end gap-3 shadow-2xs">
        <div className="flex-1 flex flex-col gap-1 w-full">
          <label className="text-xs font-semibold text-gray-700">Topic or Keywords</label>
          <input value={topic} onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="e.g. Social media automation"
            className="h-8.5 bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/10" />
        </div>
        <GenerateButton loading={loading} onClick={generate} disabled={!topic.trim() || !activeBrand} label="Find Hashtags" />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={13} className="text-red-500 shrink-0" />
          <p className="text-xs font-medium text-red-700">{error}</p>
        </div>
      )}

      {results && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Sparkles size={13} className="text-orange-600" />
              Hashtags for &ldquo;{topic}&rdquo;
            </p>
            <button onClick={generate} disabled={loading} className="btn-clay-secondary h-7 px-2.5 text-xs gap-1">
              <RefreshCw size={12} /> Regenerate
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.entries(results) as [string, string[]][]).map(([category, tags]) => (
              <div key={category} className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-gray-800 capitalize">{category} Hashtags</span>
                    <span className="text-[11px] text-gray-400">{tags.length} tags</span>
                  </div>
                  <CopyButton text={tags.join(' ')} size="xs" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <button
                      key={t}
                      onClick={() => { navigator.clipboard.writeText(t); toast(`Copied ${t}`, 'success'); }}
                      className="bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded text-xs font-medium hover:bg-orange-100 transition-colors">
                      {t.startsWith('#') ? t : `#${t}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Saved Results ────────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram', x: 'X', linkedin: 'LinkedIn', facebook: 'Facebook', tiktok: 'TikTok',
};

function SavedResults() {
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const { templates, status, fetchTemplates, deleteTemplate } = useTemplateStore();
  const { toast } = useToast();

  useEffect(() => {
    if (activeBrand?.id) fetchTemplates(activeBrand.id);
  }, [activeBrand?.id, fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (!activeBrand) return;
    try {
      await deleteTemplate(activeBrand.id, id);
      toast('Removed from saved', 'info');
    } catch {
      toast('Failed to remove', 'error');
    }
  };

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={20} className="text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">No brand selected</p>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
        <RefreshCw size={14} className="animate-spin" />
        <span className="text-xs">Loading saved results…</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
          <Bookmark size={20} className="text-gray-400" />
        </div>
        <p className="text-[15px] font-semibold text-gray-700 mb-1">Nothing saved yet</p>
        <p className="text-[13px] text-gray-400 max-w-xs">
          Click the <span className="inline-flex items-center gap-0.5 font-semibold text-gray-600"><Bookmark size={11} /> Save</span> button on any generated caption or idea to save it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-700">{templates.length} saved result{templates.length !== 1 ? 's' : ''}</p>
        <Link href="/templates" className="text-[11px] font-semibold text-orange-600 hover:underline">
          View all in Templates →
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {templates.map((t) => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-2xs hover:border-gray-300 transition-colors group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
                    {t.category}
                  </span>
                  <div className="flex items-center gap-1">
                    {t.platforms.map((p) => (
                      <div key={p} title={PLATFORM_LABEL[p] ?? p} className="ring-1 ring-gray-100 rounded-full">
                        <PlatformBadge platform={p} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[13px] font-semibold text-gray-900 truncate">{t.name}</p>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
            <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-3">{t.caption}</p>
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <CopyButton text={t.caption} size="xs" />
              <Link
                href={`/posts/new?caption=${encodeURIComponent(t.caption)}&platform=${t.platforms[0] ?? ''}`}
                className="btn-clay-primary h-5.5 px-1.5 text-[11px] gap-1 font-semibold inline-flex items-center">
                <Send size={10} /> Use in post
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Studio main ───────────────────────────────────────────────────────────

type Tool = 'caption' | 'ideas' | 'hashtags' | 'saved';

const TOOLS: { key: Tool; label: string; icon: typeof PenLine; desc: string }[] = [
  { key: 'caption',  label: 'AI Caption Writer', icon: PenLine,   desc: 'Generate converting captions via AI' },
  { key: 'ideas',    label: 'Content Ideas',      icon: Lightbulb, desc: 'Generate post concepts'             },
  { key: 'hashtags', label: 'Hashtag Finder',     icon: Hash,      desc: 'Find niche hashtags'                },
  { key: 'saved',    label: 'Saved Results',       icon: Bookmark,  desc: 'View your saved captions & ideas'  },
];

export function AIStudioView() {
  const [tool, setTool] = useState<Tool>('caption');
  const savedCount = useTemplateStore((s) => s.templates.length);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TOOLS.map(({ key, label, icon: Icon, desc }) => {
          const isActive = tool === key;
          return (
            <button key={key} onClick={() => setTool(key)}
              className={cn('bg-white border rounded-xl p-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer shadow-2xs',
                isActive ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500/20' : 'border-gray-200 hover:border-gray-300')}>
              <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                isActive ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500')}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-gray-900 truncate">{label}</h3>
                <p className="text-[11px] text-gray-500 truncate">{desc}</p>
              </div>
              {key === 'caption' && (
                <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded shrink-0">LIVE AI</span>
              )}
              {key === 'saved' && savedCount > 0 && (
                <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{savedCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {tool === 'caption'  && <CaptionWriter />}
      {tool === 'ideas'    && <ContentIdeas />}
      {tool === 'hashtags' && <HashtagFinder />}
      {tool === 'saved'    && <SavedResults />}
    </div>
  );
}
