'use client';

import { useState, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Send,
  X, Check, LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostComposer } from '@/components/posts/PostComposer';

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'instagram' | 'x' | 'linkedin' | 'facebook' | 'tiktok';
type Category =
  | 'Promotional'
  | 'Educational'
  | 'Engagement'
  | 'Behind-the-scenes'
  | 'Announcement'
  | 'Inspirational'
  | 'Weekly roundup';

interface Template {
  id: string;
  name: string;
  category: Category;
  platforms: Platform[];
  caption: string;
  createdAt: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Product launch announcement',
    category: 'Announcement',
    platforms: ['instagram', 'facebook', 'linkedin'],
    caption: '🚀 Big news — [Product Name] is officially here!\n\nWe built this because [pain point]. And today, we\'re changing that.\n\n✅ [Feature 1]\n✅ [Feature 2]\n✅ [Feature 3]\n\nTry it free for 14 days — link in bio. No credit card needed.',
    createdAt: 'Jan 15, 2025',
  },
  {
    id: '2',
    name: 'Weekly tips thread',
    category: 'Educational',
    platforms: ['x', 'linkedin'],
    caption: 'Thread: [Number] things I wish I knew about [topic] when I started 🧵\n\n1/ [Tip 1 — make it surprising or counterintuitive]\n\n2/ [Tip 2]\n\n3/ [Tip 3]\n\n...\n\n[N]/ The most important one: [powerful closing insight]\n\nRetweet if this helped. Follow for more [topic] tips every week.',
    createdAt: 'Jan 22, 2025',
  },
  {
    id: '3',
    name: 'Behind the scenes day',
    category: 'Behind-the-scenes',
    platforms: ['instagram'],
    caption: 'Not your typical [day/week] 👀\n\nHere\'s what actually goes on behind the scenes at [Brand]:\n\n[Honest, candid observation 1]\n[Honest, candid observation 2]\n[Honest, candid observation 3]\n\nThe real stuff. Not the highlight reel.\n\nSave this if it resonated 🙌',
    createdAt: 'Feb 3, 2025',
  },
  {
    id: '4',
    name: 'Community engagement question',
    category: 'Engagement',
    platforms: ['instagram', 'facebook', 'x'],
    caption: 'Hot take: [Polarising statement related to your niche] 🔥\n\nDo you agree or disagree? Drop your answer below 👇\n\nA) Yes, 100%\nB) Hard disagree\nC) It depends\nD) Never thought about it\n\nLet\'s debate 👇',
    createdAt: 'Feb 10, 2025',
  },
  {
    id: '5',
    name: 'LinkedIn thought leadership',
    category: 'Educational',
    platforms: ['linkedin'],
    caption: 'After [time period] of [experience], here\'s the one thing that changed everything:\n\n[Core insight — make it specific and unexpected]\n\nMost people think [common misconception].\n\nThe reality: [truth that challenges the misconception].\n\nHere\'s why that matters for [audience]:\n\n→ [Implication 1]\n→ [Implication 2]\n→ [Implication 3]\n\nWhat\'s your take? I\'d love to hear from people who\'ve experienced this differently.',
    createdAt: 'Feb 18, 2025',
  },
  {
    id: '6',
    name: 'Client results spotlight',
    category: 'Promotional',
    platforms: ['linkedin', 'facebook'],
    caption: 'From [starting point] to [result] in [timeframe] 📈\n\nHere\'s how [Client/Brand] did it with [Your Product/Service]:\n\n🎯 The challenge: [What they were struggling with]\n💡 The approach: [What we did together]\n📊 The result: [Specific, measurable outcome]\n\n"[Short client quote about their experience]" — [Name, Title @ Company]\n\nWant results like this? DM us or click the link.',
    createdAt: 'Mar 5, 2025',
  },
  {
    id: '7',
    name: 'Motivational Monday',
    category: 'Inspirational',
    platforms: ['instagram', 'facebook'],
    caption: 'Monday reminder 💪\n\n[Motivational truth relevant to your audience]\n\nThis week, instead of [common unhelpful habit], try:\n\n✨ [Positive action 1]\n✨ [Positive action 2]\n✨ [Positive action 3]\n\nYou\'ve got this. Drop a 🙌 if you needed to hear this today.',
    createdAt: 'Mar 12, 2025',
  },
  {
    id: '8',
    name: 'Weekly content roundup',
    category: 'Weekly roundup',
    platforms: ['instagram', 'linkedin', 'facebook'],
    caption: '📋 This week in [Brand/Niche] — a quick roundup:\n\n🔗 [Top piece of content or news — link]\n💡 [Tip or insight from the week]\n📊 [Data point or stat worth knowing]\n🎯 [Upcoming event, drop, or announcement]\n\nSave this for later and share it with someone who needs it.\n\nSee you next [Day] 👋',
    createdAt: 'Mar 20, 2025',
  },
  {
    id: '9',
    name: 'New feature spotlight',
    category: 'Announcement',
    platforms: ['instagram', 'x', 'linkedin', 'facebook'],
    caption: 'You asked. We built it. 🎉\n\nIntroducing [Feature Name] — [one-line description of what it does].\n\nWith [Feature Name] you can now:\n→ [Benefit 1]\n→ [Benefit 2]\n→ [Benefit 3]\n\nAvailable to all [plan] users today. Update your app to get started.\n\nQuestions? Drop them below 👇',
    createdAt: 'Apr 1, 2025',
  },
  {
    id: '10',
    name: 'TikTok hook formula',
    category: 'Educational',
    platforms: ['tiktok', 'instagram'],
    caption: 'POV: you finally figured out [desirable outcome] ✨\n\n[Relatable situation that hooks viewers in the first 2 seconds]\n\nHere\'s exactly what I did:\n\nStep 1: [Action]\nStep 2: [Action]\nStep 3: [Action]\n\nTry this and tell me what happens 👇\n\n#[Niche]tips #[Niche] #[BroadHashtag]',
    createdAt: 'Apr 8, 2025',
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  'Promotional', 'Educational', 'Engagement',
  'Behind-the-scenes', 'Announcement', 'Inspirational', 'Weekly roundup',
];

const CATEGORY_COLORS: Record<Category, string> = {
  Promotional:         'bg-indigo-50 text-indigo-700 border-indigo-100',
  Educational:         'bg-blue-50 text-blue-700 border-blue-100',
  Engagement:          'bg-rose-50 text-rose-700 border-rose-100',
  'Behind-the-scenes': 'bg-purple-50 text-purple-700 border-purple-100',
  Announcement:        'bg-amber-50 text-amber-700 border-amber-100',
  Inspirational:       'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Weekly roundup':    'bg-sky-50 text-sky-700 border-sky-100',
};

const PLATFORM_CONFIG: Record<Platform, { abbr: string; color: string }> = {
  instagram: { abbr: 'IG', color: 'bg-pink-500'  },
  x:         { abbr: 'X',  color: 'bg-gray-800'  },
  linkedin:  { abbr: 'LI', color: 'bg-blue-700'  },
  facebook:  { abbr: 'FB', color: 'bg-blue-600'  },
  tiktok:    { abbr: 'TT', color: 'bg-gray-950'  },
};

const ALL_PLATFORMS: Platform[] = ['instagram', 'x', 'linkedin', 'facebook', 'tiktok'];

// ─── Template form modal ──────────────────────────────────────────────────────

function TemplateFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Template;
  onSave: (t: Omit<Template, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Educational');
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(initial?.platforms ?? ['instagram']));
  const [caption, setCaption] = useState(initial?.caption ?? '');

  const togglePlatform = (p: Platform) =>
    setPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(p) && next.size > 1) next.delete(p);
      else next.add(p);
      return next;
    });

  const canSave = name.trim() && caption.trim() && platforms.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
      <div className="w-full max-w-[560px] mx-4 bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[15px] font-semibold text-gray-900">
            {initial ? 'Edit template' : 'New template'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5 overflow-y-auto">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700">Template name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Weekly tips thread"
              autoFocus
              className="w-full h-[38px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700">Category</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'h-7 px-2.5 rounded-full border text-[11px] font-semibold transition-colors',
                    category === c
                      ? CATEGORY_COLORS[c]
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700">Platforms</label>
            <div className="flex items-center gap-2">
              {ALL_PLATFORMS.map(p => {
                const cfg = PLATFORM_CONFIG[p];
                const active = platforms.has(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      'flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-medium transition-all',
                      active
                        ? 'border-transparent text-white shadow-sm ' + cfg.color
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    <span className={cn('w-3.5 h-3.5 rounded-sm flex items-center justify-center text-white text-[8px] font-bold shrink-0', active ? 'bg-white/25' : cfg.color)}>
                      {cfg.abbr[0]}
                    </span>
                    {cfg.abbr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caption */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-gray-700">Caption template</label>
              <span className="text-[11px] text-gray-400">Use [brackets] for placeholders</span>
            </div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Write your template caption. Use [brackets] for parts that change each time, e.g. [Brand Name], [Topic], [CTA]."
              rows={8}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors resize-none leading-relaxed font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="h-9 px-4 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            disabled={!canSave}
            onClick={() => { onSave({ name: name.trim(), category, platforms: [...platforms], caption }); onClose(); }}
            className="h-9 px-4 text-[13px] font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <Check size={13} /> Save template
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onUse,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onUse: () => void;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Count placeholder slots
  const placeholders = template.caption.match(/\[[^\]]+\]/g) ?? [];
  const uniquePlaceholders = [...new Set(placeholders)];

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group">
      {/* Category stripe */}
      <div className={cn('h-1 w-full', CATEGORY_COLORS[template.category].split(' ')[0])} />

      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className={cn('self-start text-[10px] font-semibold px-2 py-0.5 rounded-full border', CATEGORY_COLORS[template.category])}>
              {template.category}
            </span>
            <p className="text-[14px] font-semibold text-gray-900 leading-snug">{template.name}</p>
          </div>
          {/* Actions — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={onEdit}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Caption preview */}
        <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-4 flex-1">
          {template.caption}
        </p>

        {/* Placeholders */}
        {uniquePlaceholders.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {uniquePlaceholders.slice(0, 4).map(p => (
              <span key={p} className="text-[10px] font-mono font-medium text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                {p}
              </span>
            ))}
            {uniquePlaceholders.length > 4 && (
              <span className="text-[10px] text-gray-400">+{uniquePlaceholders.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
        {/* Platform dots */}
        <div className="flex -space-x-1">
          {template.platforms.map(p => (
            <div
              key={p}
              title={p}
              className={cn('w-5 h-5 rounded-full ring-2 ring-white flex items-center justify-center text-white text-[8px] font-bold', PLATFORM_CONFIG[p].color)}
            >
              {PLATFORM_CONFIG[p].abbr[0]}
            </div>
          ))}
        </div>

        <button
          onClick={onUse}
          className="flex items-center gap-1.5 h-7 px-3 text-[12px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <Send size={11} /> Use template
        </button>
      </div>

      {/* Delete confirm overlay */}
      {deleteConfirm && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 backdrop-blur-sm rounded-xl z-10 p-4">
          <Trash2 size={22} className="text-red-400" />
          <div className="text-center">
            <p className="text-[14px] font-semibold text-gray-900">Delete template?</p>
            <p className="text-[12px] text-gray-400 mt-0.5">This can't be undone.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDeleteConfirm(false)} className="h-8 px-3.5 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={() => { onDelete(); setDeleteConfirm(false); }} className="h-8 px-3.5 text-[12px] font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filtered, onNew }: { filtered: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 col-span-3 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
        <LayoutTemplate size={20} className="text-gray-400" />
      </div>
      <p className="text-[15px] font-semibold text-gray-700 mb-1">
        {filtered ? 'No templates in this category' : 'No templates yet'}
      </p>
      <p className="text-[13px] text-gray-400 max-w-xs mb-5">
        {filtered
          ? 'Try a different category or create a new template.'
          : 'Save your best-performing post formats as templates to reuse them with one click.'}
      </p>
      {!filtered && (
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} /> Create your first template
        </button>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function TemplatesView() {
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | undefined>();
  const [composerOpen, setComposerOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = templates;
    if (activeCategory !== 'all') list = list.filter(t => t.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.caption.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, activeCategory, search]);

  const counts = useMemo(() => {
    const c: Partial<Record<Category, number>> = {};
    templates.forEach(t => { c[t.category] = (c[t.category] ?? 0) + 1; });
    return c;
  }, [templates]);

  const handleSave = (data: Omit<Template, 'id' | 'createdAt'>) => {
    if (editTarget) {
      setTemplates(prev => prev.map(t => t.id === editTarget.id ? { ...t, ...data } : t));
    } else {
      setTemplates(prev => [
        { id: Date.now().toString(), createdAt: 'Just now', ...data },
        ...prev,
      ]);
    }
    setEditTarget(undefined);
  };

  const handleEdit = (t: Template) => { setEditTarget(t); setFormOpen(true); };
  const handleDelete = (id: string) => setTemplates(prev => prev.filter(t => t.id !== id));

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 h-8 w-64 px-3 bg-white border border-gray-200 rounded-lg">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 outline-none"
            />
          </div>
          <button
            onClick={() => { setEditTarget(undefined); setFormOpen(true); }}
            className="btn-clay-primary h-7.5 px-3 text-xs gap-1 font-semibold"
          >
            <Plus size={13} strokeWidth={2.5} /> New template
          </button>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'h-7 px-3 rounded-full border text-[12px] font-medium transition-colors',
              activeCategory === 'all'
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            )}
          >
            All
            <span className="ml-1.5 text-[10px] opacity-60">{templates.length}</span>
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={cn(
                'h-7 px-3 rounded-full border text-[12px] font-medium transition-colors',
                activeCategory === c
                  ? CATEGORY_COLORS[c]
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              )}
            >
              {c}
              {counts[c] !== undefined && (
                <span className="ml-1.5 text-[10px] opacity-60">{counts[c]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-4 relative">
          {filtered.length === 0 ? (
            <EmptyState
              filtered={activeCategory !== 'all' || search.trim().length > 0}
              onNew={() => { setEditTarget(undefined); setFormOpen(true); }}
            />
          ) : (
            filtered.map(t => (
              <div key={t.id} className="relative">
                <TemplateCard
                  template={t}
                  onEdit={() => handleEdit(t)}
                  onDelete={() => handleDelete(t.id)}
                  onUse={() => setComposerOpen(true)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form modal */}
      {formOpen && (
        <TemplateFormModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditTarget(undefined); }}
        />
      )}

      {/* Composer with template pre-filled */}
      {composerOpen && <PostComposer onClose={() => setComposerOpen(false)} />}
    </>
  );
}
