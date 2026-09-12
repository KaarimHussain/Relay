'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Edit2, Trash2, Send,
  X, Check, LayoutTemplate, AlertCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTemplateStore, Template, CreateTemplatePayload } from '@/store/template';
import { useBrandStore } from '@/store/brand';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  PlatformBadge,
  InstagramIcon, XIcon, LinkedInIcon, FacebookIcon, TikTokIcon,
} from '@/components/ui/platform-icons';

// ─── Config ───────────────────────────────────────────────────────────────────

type Platform = 'instagram' | 'x' | 'linkedin' | 'facebook' | 'tiktok';
type Category =
  | 'Promotional' | 'Educational' | 'Engagement'
  | 'Behind-the-scenes' | 'Announcement' | 'Inspirational' | 'Weekly roundup';

const CATEGORIES: Category[] = [
  'Promotional', 'Educational', 'Engagement',
  'Behind-the-scenes', 'Announcement', 'Inspirational', 'Weekly roundup',
];

const CATEGORY_COLORS: Record<Category, string> = {
  Promotional:         'bg-orange-50 text-orange-700 border-orange-200',
  Educational:         'bg-blue-50 text-blue-700 border-blue-200',
  Engagement:          'bg-rose-50 text-rose-700 border-rose-200',
  'Behind-the-scenes': 'bg-purple-50 text-purple-700 border-purple-200',
  Announcement:        'bg-amber-50 text-amber-700 border-amber-200',
  Inspirational:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Weekly roundup':    'bg-sky-50 text-sky-700 border-sky-200',
};

const CATEGORY_STRIPE: Record<Category, string> = {
  Promotional:         'bg-orange-400',
  Educational:         'bg-blue-500',
  Engagement:          'bg-rose-500',
  'Behind-the-scenes': 'bg-purple-500',
  Announcement:        'bg-amber-400',
  Inspirational:       'bg-emerald-500',
  'Weekly roundup':    'bg-sky-500',
};

const ALL_PLATFORMS: { id: Platform; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { id: 'x',         label: 'X',         Icon: XIcon         },
  { id: 'linkedin',  label: 'LinkedIn',  Icon: LinkedInIcon  },
  { id: 'facebook',  label: 'Facebook',  Icon: FacebookIcon  },
  { id: 'tiktok',    label: 'TikTok',    Icon: TikTokIcon    },
];

const PLATFORM_BG: Record<Platform, string> = {
  instagram: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600',
  x:         'bg-gray-900',
  linkedin:  'bg-[#0A66C2]',
  facebook:  'bg-[#1877F2]',
  tiktok:    'bg-black',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat as Category] ?? 'bg-gray-100 text-gray-600 border-gray-200';
}
function categoryStripe(cat: string): string {
  return CATEGORY_STRIPE[cat as Category] ?? 'bg-gray-300';
}

// ─── Template form modal ──────────────────────────────────────────────────────

function TemplateFormModal({
  initial, saving, onSave, onClose,
}: {
  initial?: Template;
  saving: boolean;
  onSave: (data: CreateTemplatePayload) => void;
  onClose: () => void;
}) {
  const [name, setName]         = useState(initial?.name ?? '');
  const [category, setCategory] = useState<string>(initial?.category ?? 'Educational');
  const [platforms, setPlatforms] = useState<Set<Platform>>(
    new Set((initial?.platforms ?? ['instagram']) as Platform[])
  );
  const [caption, setCaption]   = useState(initial?.caption ?? '');

  const togglePlatform = (p: Platform) =>
    setPlatforms((prev) => {
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
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">{initial ? 'Edit template' : 'New template'}</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {initial ? 'Update your saved caption template.' : 'Save a reusable caption format for your brand.'}
            </p>
          </div>
          <button onClick={onClose} disabled={saving}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5 overflow-y-auto">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700">Template name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekly tips thread"
              autoFocus
              className="w-full h-[38px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700">Category</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={cn(
                    'h-7 px-2.5 rounded-full border text-[11px] font-semibold transition-colors',
                    category === c ? categoryColor(c) : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  )}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700">Platforms</label>
            <div className="flex items-center gap-2 flex-wrap">
              {ALL_PLATFORMS.map(({ id, label, Icon }) => {
                const active = platforms.has(id);
                return (
                  <button key={id} type="button" onClick={() => togglePlatform(id)}
                    className={cn(
                      'flex items-center gap-2 h-8 px-3 rounded-lg border text-[12px] font-semibold transition-all',
                      active
                        ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700'
                    )}>
                    <PlatformBadge platform={id} size="sm" />
                    <span>{label}</span>
                    {active && <Check size={12} className="text-orange-600 stroke-[2.5]" />}
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
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your template caption. Use [brackets] for parts that change each time, e.g. [Brand Name], [Topic], [CTA]."
              rows={8}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors resize-none leading-relaxed font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} disabled={saving} className="btn-clay-secondary h-[34px] px-4 text-[13px] disabled:opacity-40">
            Cancel
          </button>
          <button
            disabled={!canSave || saving}
            onClick={() => onSave({ name: name.trim(), category, platforms: [...platforms], caption })}
            className="btn-clay-primary h-[34px] px-4 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {saving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template, onEdit, onDelete, onUse,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onUse: () => void;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const platforms = template.platforms as Platform[];
  const placeholders = [...new Set(template.caption.match(/\[[^\]]+\]/g) ?? [])];

  return (
    <div className="relative flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md transition-all group">
      {/* Category stripe */}
      <div className={cn('h-1 w-full shrink-0', categoryStripe(template.category))} />

      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className={cn('self-start text-[10px] font-semibold px-2 py-0.5 rounded-full border', categoryColor(template.category))}>
              {template.category}
            </span>
            <p className="text-[14px] font-semibold text-gray-900 leading-snug">{template.name}</p>
          </div>
          {/* Actions — shown on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
            <button onClick={onEdit}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <Edit2 size={13} />
            </button>
            <button onClick={() => setDeleteConfirm(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Caption preview */}
        <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-4 flex-1">{template.caption}</p>

        {/* Placeholder tags */}
        {placeholders.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {placeholders.slice(0, 4).map((p) => (
              <span key={p} className="text-[10px] font-mono font-medium text-orange-500 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
                {p}
              </span>
            ))}
            {placeholders.length > 4 && (
              <span className="text-[10px] text-gray-400">+{placeholders.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40 shrink-0">
        {/* Platform icons */}
        <div className="flex -space-x-1.5">
          {platforms.map((p) => (
            <div key={p} title={p} className="ring-2 ring-white rounded-full">
              <PlatformBadge platform={p} size="sm" />
            </div>
          ))}
        </div>
        <button onClick={onUse}
          className="btn-clay-primary h-7 px-3 text-[12px] font-semibold gap-1.5 inline-flex items-center">
          <Send size={11} /> Use template
        </button>
      </div>

      {/* Delete confirm overlay */}
      {deleteConfirm && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/96 backdrop-blur-[2px] rounded-xl z-10 p-4">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-gray-900">Delete template?</p>
            <p className="text-[12px] text-gray-400 mt-0.5">This can&apos;t be undone.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDeleteConfirm(false)}
              className="btn-clay-secondary h-8 px-3.5 text-[12px]">
              Cancel
            </button>
            <button onClick={() => { onDelete(); setDeleteConfirm(false); }}
              className="h-8 px-3.5 text-[12px] font-semibold text-white bg-red-500 border border-red-600 rounded-lg hover:bg-red-600 transition-colors shadow-2xs">
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
        {filtered ? 'No templates match this filter' : 'No templates yet'}
      </p>
      <p className="text-[13px] text-gray-400 max-w-xs mb-5">
        {filtered
          ? 'Try a different category or clear the search.'
          : 'Save your best-performing post formats as templates to reuse them with one click.'}
      </p>
      {!filtered && (
        <button onClick={onNew} className="btn-clay-primary h-9 px-4 text-[13px] gap-1.5 font-semibold inline-flex items-center">
          <Plus size={14} strokeWidth={2.5} /> Create your first template
        </button>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function TemplatesView() {
  const router = useRouter();
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const { templates, status, error, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = useTemplateStore();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch]     = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | undefined>();
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (activeBrand?.id) fetchTemplates(activeBrand.id);
  }, [activeBrand?.id, fetchTemplates]);

  const filtered = useMemo(() => {
    let list = templates;
    if (activeCategory !== 'all') list = list.filter((t) => t.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.caption.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, activeCategory, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    templates.forEach((t) => { c[t.category] = (c[t.category] ?? 0) + 1; });
    return c;
  }, [templates]);

  const handleSave = async (data: CreateTemplatePayload) => {
    if (!activeBrand) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateTemplate(activeBrand.id, editTarget.id, data);
        toast('Template updated', 'success');
      } else {
        await createTemplate(activeBrand.id, data);
        toast('Template created', 'success');
      }
      setFormOpen(false);
      setEditTarget(undefined);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeBrand) return;
    try {
      await deleteTemplate(activeBrand.id, id);
      toast('Template deleted', 'info');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Failed to delete template', 'error');
    }
  };

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={22} className="text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">No brand selected</p>
        <p className="text-xs text-gray-400 mt-1">Select a brand from the sidebar to manage templates.</p>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading templates…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl">
        <AlertCircle size={15} className="text-red-500 shrink-0" />
        <p className="text-[13px] text-red-700 font-medium flex-1">{error}</p>
        <button onClick={() => fetchTemplates(activeBrand.id)} className="text-xs font-semibold text-red-600 hover:underline shrink-0">Retry</button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/80 via-white to-amber-50/60 px-4 py-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-gray-900">Your reusable playbook</p><p className="mt-0.5 text-xs text-gray-500">Save the structures that work, then start a post with one click.</p></div>
          <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-orange-100"><p className="text-lg font-bold text-orange-600">{templates.length}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Templates</p></div>
        </section>
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 h-8 w-64 px-3 bg-white border border-gray-200 rounded-lg shadow-2xs">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 outline-none"
            />
          </div>
          <button
            onClick={() => { setEditTarget(undefined); setFormOpen(true); }}
            className="btn-clay-primary h-8 px-3 text-xs gap-1.5 font-semibold inline-flex items-center">
            <Plus size={13} strokeWidth={2.5} /> New template
          </button>
        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'h-7 px-3 rounded-full border text-[12px] font-medium transition-colors',
              activeCategory === 'all'
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            )}>
            All
            <span className="ml-1.5 text-[10px] opacity-60">{templates.length}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setActiveCategory(c)}
              className={cn(
                'h-7 px-3 rounded-full border text-[12px] font-medium transition-colors',
                activeCategory === c ? categoryColor(c) : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              )}>
              {c}
              {counts[c] !== undefined && (
                <span className="ml-1.5 text-[10px] opacity-60">{counts[c]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 relative">
          {filtered.length === 0 ? (
            <EmptyState
              filtered={activeCategory !== 'all' || search.trim().length > 0}
              onNew={() => { setEditTarget(undefined); setFormOpen(true); }}
            />
          ) : (
            filtered.map((t) => (
              <div key={t.id} className="relative">
                <TemplateCard
                  template={t}
                  onEdit={() => { setEditTarget(t); setFormOpen(true); }}
                  onDelete={() => handleDelete(t.id)}
                  onUse={() => {
                    const params = new URLSearchParams({ caption: t.caption });
                    if (t.platforms[0]) params.set('platform', t.platforms[0]);
                    router.push(`/posts/new?${params.toString()}`);
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {formOpen && (
        <TemplateFormModal
          initial={editTarget}
          saving={saving}
          onSave={handleSave}
          onClose={() => { if (!saving) { setFormOpen(false); setEditTarget(undefined); } }}
        />
      )}

    </>
  );
}
