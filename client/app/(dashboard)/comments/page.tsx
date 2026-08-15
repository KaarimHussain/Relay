'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare, RefreshCw, Send, Loader2, Bot, Trash2,
  Plus, ToggleLeft, ToggleRight, ChevronDown, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandStore } from '@/store/brand';
import { api } from '@/lib/api';

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'bg-gradient-to-br from-pink-500 to-orange-400',
  Facebook:  'bg-blue-600',
  X:         'bg-black',
  LinkedIn:  'bg-blue-700',
  TikTok:    'bg-black',
};

const PLATFORMS = ['Instagram', 'Facebook', 'X', 'LinkedIn', 'TikTok'];

interface Comment {
  id: string;
  platform: string;
  authorName: string;
  text: string;
  postedAt: string;
  autoReplied: boolean;
  repliedAt: string | null;
  account: { platformHandle: string };
  target?: { post?: { title: string } } | null;
  _count?: { replies: number };
}

interface Reply {
  id: string;
  authorName: string;
  text: string;
  postedAt: string;
  account: { platform: string; platformHandle: string };
}

interface PostOption {
  id: string;
  title: string;
  status: string;
}

interface AutoReply {
  id: string;
  platform: string;
  isEnabled: boolean;
  replyText: string;
  triggerType: string;
  keywords: string | null;
}

// ─── Comments Tab ─────────────────────────────────────────────────────────────

function CommentsTab({ brandId }: { brandId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [platform, setPlatform] = useState('');
  const [posts, setPosts] = useState<PostOption[]>([]);
  const [postId, setPostId] = useState('');
  const [syncResult, setSyncResult] = useState<{ synced: number; targets: number; skipped?: number; errors: string[]; message?: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  // Lazily-loaded reply threads, keyed by comment id.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [repliesById, setRepliesById] = useState<Record<string, Reply[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());

  const toggleReplies = useCallback(async (commentId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
    // Fetch on first expand only — avoids pulling every thread up front.
    if (!repliesById[commentId] && !loadingReplies.has(commentId)) {
      setLoadingReplies((s) => new Set(s).add(commentId));
      try {
        const data = await api.get<Reply[]>(`/brands/${brandId}/comments/${commentId}/replies`);
        setRepliesById((m) => ({ ...m, [commentId]: data }));
      } catch {
        setRepliesById((m) => ({ ...m, [commentId]: [] }));
      } finally {
        setLoadingReplies((s) => { const n = new Set(s); n.delete(commentId); return n; });
      }
    }
  }, [brandId, repliesById, loadingReplies]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (platform) qs.set('platform', platform);
      if (postId) qs.set('postId', postId);
      const params = qs.toString() ? `?${qs.toString()}` : '';
      const data = await api.get<Comment[]>(`/brands/${brandId}/comments${params}`);
      setComments(data);
    } finally {
      setLoading(false);
    }
  }, [brandId, platform, postId]);

  useEffect(() => { load(); }, [load]);

  // Load the brand's published posts so users can narrow comments to one post
  useEffect(() => {
    let active = true;
    api.get<PostOption[]>(`/brands/${brandId}/posts?status=Published`)
      .then((data) => { if (active) setPosts(data); })
      .catch(() => { if (active) setPosts([]); });
    return () => { active = false; };
  }, [brandId]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.post<{ synced: number; targets: number; skipped?: number; errors: string[]; message?: string }>(
        `/brands/${brandId}/comments/sync`, {}
      );
      setSyncResult(result);
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await api.post(`/brands/${brandId}/comments/${commentId}/reply`, { text: replyText.trim() });
      setReplyingTo(null);
      setReplyText('');
      // The reply is stored server-side immediately — re-fetch the thread and
      // keep it expanded so the new reply shows without waiting for a sync.
      setExpanded((s) => new Set(s).add(commentId));
      try {
        const fresh = await api.get<Reply[]>(`/brands/${brandId}/comments/${commentId}/replies`);
        setRepliesById((m) => ({ ...m, [commentId]: fresh }));
      } catch {}
      await load();
    } catch (err: any) {
      alert(err.message ?? 'Reply failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 outline-none focus:border-orange-500"
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={postId}
          onChange={(e) => setPostId(e.target.value)}
          className="h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 outline-none focus:border-orange-500 max-w-[220px]"
        >
          <option value="">All posts</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>{p.title || 'Untitled post'}</option>
          ))}
        </select>

        {(platform || postId) && (
          <button
            onClick={() => { setPlatform(''); setPostId(''); }}
            className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear filters
          </button>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-clay-secondary h-8 px-3 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>

        <p className="text-[11px] text-gray-400 ml-auto">
          Syncs automatically every 30 seconds
        </p>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className="flex flex-col gap-1.5">
          <div className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs',
            syncResult.errors.length === 0
              ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
              : 'bg-amber-50 border border-amber-100 text-amber-700'
          )}>
            <span className="font-semibold">
              {syncResult.targets === 0 && syncResult.message
                ? syncResult.message
                : `Synced ${syncResult.synced} comment${syncResult.synced !== 1 ? 's' : ''} across ${syncResult.targets} post target${syncResult.targets !== 1 ? 's' : ''}.`}
            </span>
            {!!syncResult.skipped && syncResult.skipped > 0 && (
              <span className="text-gray-500">{syncResult.skipped} deleted post{syncResult.skipped !== 1 ? 's' : ''} skipped.</span>
            )}
            {syncResult.errors.length > 0 && (
              <span className="text-amber-600">{syncResult.errors.length} error{syncResult.errors.length !== 1 ? 's' : ''}.</span>
            )}
          </div>
          {syncResult.errors.map((e, i) => (
            <p key={i} className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
              {e}
            </p>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <MessageSquare size={32} className="text-gray-200" />
          <div>
            <p className="text-sm font-semibold text-gray-500">
              {platform || postId ? 'No comments match this filter' : 'No comments yet'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {platform || postId
                ? 'Try clearing the filters or syncing again.'
                : 'Click "Sync now" to fetch comments from your published posts.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {comments.map((c) => {
            const replyCount = c._count?.replies ?? 0;
            const isOpen = expanded.has(c.id);
            const replies = repliesById[c.id];
            return (
            <div key={c.id} className="bg-white border border-gray-100 rounded-lg px-3 py-2.5 flex flex-col gap-1.5 shadow-2xs">
              {/* Header row — avatar, author + inline meta, timestamp */}
              <div className="flex items-center gap-2">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0', PLATFORM_COLORS[c.platform] ?? 'bg-gray-400')}>
                  {c.platform[0]}
                </div>
                <p className="text-xs font-bold text-gray-900 shrink-0">{c.authorName}</p>
                <p className="text-[10px] text-gray-400 truncate min-w-0">
                  {c.platform} · {c.account.platformHandle}
                  {c.target?.post && <> · <span className="text-gray-500">{c.target.post.title}</span></>}
                </p>
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  {c.autoReplied && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Bot size={9} /> Auto-replied
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">{new Date(c.postedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Comment text */}
              <p className="text-[13px] text-gray-700 leading-snug pl-8">{c.text}</p>

              {/* Actions row — reply + replies toggle */}
              <div className="flex items-center gap-3 pl-8">
                {replyingTo !== c.id && (
                  <button
                    onClick={() => { setReplyingTo(c.id); setReplyText(''); }}
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    Reply
                  </button>
                )}
                {replyCount > 0 && (
                  <button
                    onClick={() => toggleReplies(c.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} />
                    {isOpen ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                  </button>
                )}
              </div>

              {/* Inline reply composer */}
              {replyingTo === c.id && (
                <div className="flex gap-2 pl-8">
                  <input
                    autoFocus
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleReply(c.id); if (e.key === 'Escape') setReplyingTo(null); }}
                    placeholder="Write a reply…"
                    className="flex-1 h-8 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                  <button
                    onClick={() => handleReply(c.id)}
                    disabled={sending || !replyText.trim()}
                    className="btn-clay-primary h-8 w-8 flex items-center justify-center disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  </button>
                  <button
                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-1"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Replies dropdown (lazy) */}
              {isOpen && (
                <div className="ml-8 mt-0.5 pl-3 border-l-2 border-gray-100 flex flex-col gap-2">
                  {loadingReplies.has(c.id) ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 py-1">
                      <Loader2 size={11} className="animate-spin" /> Loading replies…
                    </div>
                  ) : replies && replies.length > 0 ? (
                    replies.map((r) => (
                      <div key={r.id} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-gray-800">{r.authorName}</span>
                          <span className="text-[9px] text-gray-400">{new Date(r.postedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[12px] text-gray-600 leading-snug">{r.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-gray-400 py-1">No replies to show.</p>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Auto-Reply Tab ───────────────────────────────────────────────────────────

function AutoReplyTab({ brandId }: { brandId: string }) {
  const [rules, setRules] = useState<AutoReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    platform: 'Instagram' as string,
    replyText: '',
    triggerType: 'all',
    keywords: '',
    isEnabled: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<AutoReply[]>(`/brands/${brandId}/comments/auto-replies`);
      setRules(data);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.replyText.trim()) return;
    setSaving(true);
    try {
      await api.post(`/brands/${brandId}/comments/auto-replies`, {
        platform:    form.platform,
        replyText:   form.replyText.trim(),
        triggerType: form.triggerType,
        keywords:    form.triggerType === 'keyword' ? form.keywords : null,
        isEnabled:   form.isEnabled,
      });
      setShowForm(false);
      setForm({ platform: 'Instagram', replyText: '', triggerType: 'all', keywords: '', isEnabled: true });
      await load();
    } catch (err: any) {
      alert(err.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: AutoReply) => {
    try {
      await api.patch(`/brands/${brandId}/comments/auto-replies/${rule.id}/toggle`, { isEnabled: !rule.isEnabled });
      await load();
    } catch {}
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Delete this auto-reply rule?')) return;
    try {
      await api.delete(`/brands/${brandId}/comments/auto-replies/${ruleId}`);
      await load();
    } catch {}
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Add rule button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Auto-replies trigger on new comments matching your rules.
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-clay-primary h-8 px-3 text-xs inline-flex items-center gap-1.5"
        >
          <Plus size={12} /> Add rule
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-orange-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
          <p className="text-xs font-bold text-gray-900">New auto-reply rule</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Platform</label>
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                className="h-8 px-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-500"
              >
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Trigger</label>
              <select
                value={form.triggerType}
                onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value }))}
                className="h-8 px-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-500"
              >
                <option value="all">All comments</option>
                <option value="keyword">Keyword match</option>
              </select>
            </div>
          </div>

          {form.triggerType === 'keyword' && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Keywords (comma-separated)</label>
              <input
                type="text"
                value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                placeholder="price, order, help"
                className="h-8 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-500"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Reply message</label>
            <textarea
              value={form.replyText}
              onChange={(e) => setForm((f) => ({ ...f, replyText: e.target.value }))}
              placeholder="Thanks for your comment! We'll get back to you shortly."
              rows={3}
              className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-clay-secondary h-8 px-3 text-xs">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.replyText.trim()}
              className="btn-clay-primary h-8 px-3 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving && <Loader2 size={11} className="animate-spin" />}
              Save rule
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Bot size={32} className="text-gray-200" />
          <div>
            <p className="text-sm font-semibold text-gray-500">No auto-reply rules yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Add a rule to start auto-replying to comments.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0', PLATFORM_COLORS[rule.platform] ?? 'bg-gray-400')}>
                {rule.platform[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-bold text-gray-900">{rule.platform}</p>
                  <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded', rule.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                    {rule.isEnabled ? 'Active' : 'Paused'}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {rule.triggerType === 'keyword' ? `Keywords: ${rule.keywords}` : 'All comments'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 truncate">{rule.replyText}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggle(rule)}
                  title={rule.isEnabled ? 'Pause' : 'Activate'}
                  className="text-gray-400 hover:text-orange-500 transition-colors"
                >
                  {rule.isEnabled
                    ? <ToggleRight size={18} className="text-emerald-500" />
                    : <ToggleLeft size={18} />
                  }
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommentsPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const [tab, setTab] = useState<'comments' | 'auto-reply'>('comments');

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2 text-center">
        <MessageSquare size={32} className="text-gray-200" />
        <p className="text-sm font-medium text-gray-500">No brand selected</p>
        <p className="text-xs text-gray-400">Create or select a brand from the sidebar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-[22px] font-bold text-gray-900 tracking-tight">Comments</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage comments and auto-replies for{' '}
          <span className="font-semibold text-gray-700">{activeBrand.name}</span>.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(['comments', 'auto-reply'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'h-7 px-4 text-xs font-semibold rounded-lg transition-colors',
              tab === t ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t === 'comments' ? 'Comments' : 'Auto-Reply Rules'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'comments'
        ? <CommentsTab brandId={activeBrand.id} />
        : <AutoReplyTab brandId={activeBrand.id} />
      }
    </div>
  );
}
