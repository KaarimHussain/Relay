'use client';

import { useState } from 'react';
import {
  Sparkles, Copy, Check, Plus, X,
  PenLine, Lightbulb, Hash, Send,
  RefreshCw, Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostComposer } from '@/components/posts/PostComposer';
import { useToast } from '@/components/ui/toast';

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
    <button
      onClick={copy}
      className={cn(
        'btn-clay-secondary gap-1 shrink-0 font-semibold',
        copied
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
          : 'text-gray-600',
        size === 'sm' ? 'h-6.5 px-2 text-xs' : 'h-5.5 px-1.5 text-[11px]'
      )}
    >
      {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function GenerateButton({
  loading,
  onClick,
  disabled,
  label = 'Generate Magic',
}: {
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="btn-clay-ai h-8.5 px-4 text-xs gap-1.5 font-semibold"
    >
      {loading
        ? <RefreshCw size={13} className="animate-spin" />
        : <Sparkles size={13} />
      }
      {loading ? 'Generating…' : label}
    </button>
  );
}

// ─── Caption Writer ───────────────────────────────────────────────────────────

const TONES = ['Professional', 'Casual', 'Witty', 'Inspirational', 'Promotional'] as const;
type Tone = typeof TONES[number];

const PLATFORMS_CAP = ['Instagram', 'X (Twitter)', 'LinkedIn', 'Facebook', 'TikTok'];

const QUICK_PROMPTS = [
  { label: '🔥 Viral Hook', text: '5 counterintuitive content marketing rules that actually doubled our reach' },
  { label: '✨ Behind-the-Scenes', text: 'What our team learned after testing 100 AI caption prompts this week' },
  { label: '💼 Thought Leadership', text: 'Why engagement rate matters more than total follower count in 2025' },
  { label: '🛍️ Product Drop', text: 'Introducing multi-platform post scheduling with AI assistant features' },
];

const CAPTION_MOCK: Record<Tone, string[]> = {
  Professional: [
    "Navigating the evolving landscape of content strategy requires more than intuition — it demands data. Here's how leading brands are rethinking their social presence in 2025. #ContentStrategy #Marketing",
    "The brands winning on social media aren't the ones posting the most. They're the ones posting with purpose. Here's the framework we use with 50+ clients to drive consistent, measurable results.",
  ],
  Casual: [
    "Okay real talk — we tried something different this week and the results genuinely surprised us 👀 Here's what happened when we stopped posting every day and focused on quality instead. Thread 🧵",
    "Not going to lie, we almost didn't post this. But our community deserves the honest behind-the-scenes, not just the highlight reel. So here it is ✨",
  ],
  Witty: [
    "We asked our AI to write our social media strategy. It asked for a raise. 🤖💸 Fine, we'll do it the human way — here's what actually works.",
  ],
  Inspirational: [
    "Every piece of content you create is a conversation starter. The brands that win aren't the loudest — they're the ones who make their audience feel understood. Keep showing up with intention. 🌟",
  ],
  Promotional: [
    "🚀 Big news: our new content scheduling feature is here and it's changing how teams manage social media. Multi-platform, AI-assisted, and ridiculously easy to use. Try it free for 14 days — link in bio!",
  ],
};

function CaptionWriter() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<Tone>('Professional');
  const [platform, setPlatform] = useState('Instagram');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [composerText, setComposerText] = useState<string | null>(null);
  const { toast } = useToast();

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setResults(CAPTION_MOCK[tone]);
    setLoading(false);
    toast('AI Captions generated!', 'sparkle');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Presets Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Quick Prompts:</span>
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => { setTopic(p.text); toast(`Applied: ${p.label}`, 'info'); }}
            className="btn-clay-secondary h-6 px-2.5 text-[11px] font-medium shrink-0"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Inputs Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3.5 shadow-2xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">
              What is your post about?
            </label>
            {topic && (
              <button 
                onClick={() => setTopic('')}
                className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear text
              </button>
            )}
          </div>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Launching our new AI scheduling feature…"
            rows={2.5}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors resize-none leading-relaxed"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            {TONES.map(t => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={cn(
                  'h-7 px-2.5 rounded-md text-xs font-medium transition-colors',
                  tone === t
                    ? 'btn-clay-primary text-white text-[11px]'
                    : 'btn-clay-secondary text-gray-600 text-[11px]'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="h-8.5 bg-gray-50 border border-gray-200 rounded-lg text-xs px-2.5 font-medium text-gray-700 outline-none"
            >
              {PLATFORMS_CAP.map(p => <option key={p}>{p}</option>)}
            </select>

            <GenerateButton loading={loading} onClick={generate} disabled={!topic.trim()} />
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Sparkles size={13} className="text-orange-600" />
              Generated Captions ({tone} · {platform})
            </p>
            <button
              onClick={generate}
              disabled={loading}
              className="btn-clay-secondary h-7 px-2.5 text-xs gap-1"
            >
              <RefreshCw size={12} /> Regenerate
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {results.map((caption, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col gap-3 shadow-2xs hover:border-gray-300 transition-colors">
                <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-normal">{caption}</p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-[11px] font-medium text-gray-400">{caption.length} chars</span>
                  <div className="flex items-center gap-1.5">
                    <CopyButton text={caption} />
                    <button
                      onClick={() => { setComposerText(caption); toast('Transferred to post composer', 'sparkle'); }}
                      className="btn-clay-primary h-6.5 px-2.5 text-xs gap-1 font-semibold"
                    >
                      <Send size={11} /> Use in composer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {composerText !== null && (
        <PostComposer onClose={() => setComposerText(null)} />
      )}
    </div>
  );
}

// ─── Content Ideas ────────────────────────────────────────────────────────────

const IDEAS_MOCK = [
  { theme: 'Educational',    platform: 'LinkedIn',  hook: 'Most brands get this wrong…',                  title: '5 counterintuitive social media rules that actually drive growth',     cta: 'Share your experience in the comments' },
  { theme: 'Behind-scenes',  platform: 'Instagram', hook: 'We almost didn\'t post this…',                 title: 'The messy reality of running a content team (honest version)',            cta: 'Save this for when you\'re having a tough week' },
];

function ContentIdeas() {
  const [niche, setNiche] = useState('');
  const [pillars, setPillars] = useState<string[]>(['Education', 'Behind the scenes']);
  const [pillarInput, setPillarInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<typeof IDEAS_MOCK>([]);
  const { toast } = useToast();

  const addPillar = () => {
    const v = pillarInput.trim();
    if (v && !pillars.includes(v)) setPillars(p => [...p, v]);
    setPillarInput('');
  };

  const generate = async () => {
    if (!niche.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setResults(IDEAS_MOCK);
    setLoading(false);
    toast('Content ideas generated!', 'sparkle');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Industry or Niche</label>
          <input
            value={niche}
            onChange={e => setNiche(e.target.value)}
            placeholder="e.g. B2B SaaS, E-commerce fashion"
            className="h-8.5 bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 font-medium outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Content Pillars</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {pillars.map(p => (
              <span
                key={p}
                className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs font-medium"
              >
                {p}
                <button onClick={() => setPillars(prev => prev.filter(x => x !== p))}>
                  <X size={11} />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                value={pillarInput}
                onChange={e => setPillarInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPillar()}
                placeholder="Add pillar…"
                className="h-7 w-28 bg-gray-50 border border-gray-200 rounded text-xs px-2"
              />
              <button onClick={addPillar} className="btn-clay-secondary h-7 w-7 p-0">
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <GenerateButton loading={loading} onClick={generate} disabled={!niche.trim()} label="Generate Ideas" />
        </div>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map((idea, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 shadow-2xs">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{idea.theme}</span>
                  <span className="text-[11px] font-medium text-gray-400">{idea.platform}</span>
                </div>
                <p className="text-xs font-bold text-gray-900 leading-snug">{idea.title}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-[10px] text-gray-500">CTA: {idea.cta}</span>
                <CopyButton text={`${idea.hook}\n\n${idea.title}`} size="xs" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hashtag Finder ───────────────────────────────────────────────────────────

const HASHTAG_MOCK = {
  popular: ['#socialmedia', '#marketing', '#digitalmarketing'],
  niche: ['#SMManager', '#schedulePost', '#contentCalendar'],
};

function HashtagFinder() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<typeof HASHTAG_MOCK | null>(null);
  const { toast } = useToast();

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setResults(HASHTAG_MOCK);
    setLoading(false);
    toast('Hashtags found!', 'sparkle');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row items-end gap-3 shadow-2xs">
        <div className="flex-1 flex flex-col gap-1 w-full">
          <label className="text-xs font-semibold text-gray-700">Topic or Keywords</label>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="e.g. Social media automation"
            className="h-8.5 bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 font-medium outline-none"
          />
        </div>
        <GenerateButton loading={loading} onClick={generate} disabled={!topic.trim()} label="Find Hashtags" />
      </div>

      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(results).map(([category, tags]) => (
            <div key={category} className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 capitalize">{category} Hashtags</span>
                <CopyButton text={tags.join(' ')} size="xs" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <span key={t} className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI Studio main ───────────────────────────────────────────────────────────

type Tool = 'caption' | 'ideas' | 'hashtags';

const TOOLS: { key: Tool; label: string; icon: typeof PenLine; desc: string }[] = [
  { key: 'caption',  label: 'AI Caption Writer',  icon: PenLine,   desc: 'Generate converting captions' },
  { key: 'ideas',    label: 'Content Ideas',   icon: Lightbulb, desc: 'Generate post concepts' },
  { key: 'hashtags', label: 'Hashtag Finder',  icon: Hash,      desc: 'Find niche hashtags' },
];

export function AIStudioView() {
  const [tool, setTool] = useState<Tool>('caption');

  return (
    <div className="flex flex-col gap-4">
      {/* Tool Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TOOLS.map(({ key, label, icon: Icon, desc }) => {
          const isActive = tool === key;
          return (
            <button
              key={key}
              onClick={() => setTool(key)}
              className={cn(
                'bg-white border rounded-xl p-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer shadow-2xs',
                isActive
                  ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500/20'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                isActive ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-gray-900 truncate">
                  {label}
                </h3>
                <p className="text-[11px] text-gray-500 truncate">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active tool view */}
      {tool === 'caption'  && <CaptionWriter />}
      {tool === 'ideas'    && <ContentIdeas />}
      {tool === 'hashtags' && <HashtagFinder />}
    </div>
  );
}
