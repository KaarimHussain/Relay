'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  MessageSquare, RefreshCw, Send, Loader2, Bot, Trash2,
  Plus, ToggleLeft, ToggleRight, ChevronDown, AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandStore } from '@/store/brand';
import { api } from '@/lib/api';
import { PlatformBadge } from '@/components/ui/platform-icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PLATFORMS = ['Instagram', 'Facebook', 'X', 'LinkedIn', 'TikTok'];

// Relative timestamp: "2m ago", "3h ago", "5d ago", or "Aug 12"
function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

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

// ─── Author Avatar ─────────────────────────────────────────────────────────────

function AuthorAvatar({ name, platform }: { name: string; platform: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative shrink-0">
      <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500 select-none">
        {initials || '?'}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 ring-1.5 ring-white rounded-full">
        <PlatformBadge platform={platform} size="sm" />
      </div>
    </div>
  );
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [repliesById, setRepliesById] = useState<Record<string, Reply[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [triage, setTriage] = useState<'all' | 'unanswered' | 'replied' | 'automated'>('all');

  const toggleReplies = useCallback(async (commentId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
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

  const hasFilters = !!(platform || postId);
  const commentStats = useMemo(() => {
    const unanswered = comments.filter((comment) => !comment.autoReplied && (comment._count?.replies ?? 0) === 0).length;
    const replied = comments.filter((comment) => (comment._count?.replies ?? 0) > 0).length;
    const automated = comments.filter((comment) => comment.autoReplied).length;
    return { total: comments.length, unanswered, replied, automated };
  }, [comments]);
  const visibleComments = useMemo(() => comments.filter((comment) => {
    const replyCount = comment._count?.replies ?? 0;
    if (triage === 'unanswered') return !comment.autoReplied && replyCount === 0;
    if (triage === 'replied') return replyCount > 0;
    if (triage === 'automated') return comment.autoReplied;
    return true;
  }), [comments, triage]);
  const triageOptions = [
    { key: 'all' as const, label: 'All', count: commentStats.total },
    { key: 'unanswered' as const, label: 'Needs reply', count: commentStats.unanswered },
    { key: 'replied' as const, label: 'Replied', count: commentStats.replied },
    { key: 'automated' as const, label: 'Automated', count: commentStats.automated },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Platform filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', ...PLATFORMS] as const).map((p) => {
          const isActive = p === 'all' ? !platform : platform === p;
          return (
            <button
              key={p}
              onClick={() => setPlatform(p === 'all' ? '' : p)}
              className={cn(
                'h-7 px-2.5 text-[11px] font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 shrink-0 border',
                isActive
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800'
              )}
            >
              {p === 'all' ? 'All platforms' : p}
            </button>
          );
        })}
      </div>

      {/* Inbox health and client-side triage */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {triageOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => setTriage(option.key)}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-left transition-all',
              triage === option.key
                ? 'border-orange-300 bg-orange-50/70 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70'
            )}
          >
            <span className="block text-lg font-bold leading-none text-gray-900 tabular-nums">{option.count}</span>
            <span className={cn('mt-1 block text-[11px] font-semibold', triage === option.key ? 'text-orange-700' : 'text-gray-500')}>
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {/* Secondary toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Post filter */}
        {posts.length > 0 && (
          <Select
            value={postId || 'ALL'}
            onValueChange={(val) => setPostId(!val || val === 'ALL' ? '' : val)}
          >
            <SelectTrigger className="h-8 bg-white border-gray-200 text-xs text-gray-700 min-w-[150px] max-w-[220px]">
              <SelectValue placeholder="All posts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All posts</SelectItem>
              {posts.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title || 'Untitled post'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasFilters && (
          <button
            onClick={() => { setPlatform(''); setPostId(''); }}
            className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear filters
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {loading && (
            <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> Loading…
            </span>
          )}
          {!loading && (
            <span className="text-[11px] text-gray-400">
              {visibleComments.length} of {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-clay-secondary h-8 px-3 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className="flex flex-col gap-1.5">
          <div className={cn(
            'flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs',
            syncResult.errors.length === 0
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          )}>
            <Info size={13} className="shrink-0 mt-px" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">
                {syncResult.targets === 0 && syncResult.message
                  ? syncResult.message
                  : `Synced ${syncResult.synced} comment${syncResult.synced !== 1 ? 's' : ''} across ${syncResult.targets} post target${syncResult.targets !== 1 ? 's' : ''}.`}
              </span>
              {!!syncResult.skipped && syncResult.skipped > 0 && (
                <span className="text-[11px] opacity-80">{syncResult.skipped} deleted post{syncResult.skipped !== 1 ? 's' : ''} skipped.</span>
              )}
              {syncResult.errors.length > 0 && (
                <span className="text-[11px]">{syncResult.errors.length} error{syncResult.errors.length !== 1 ? 's' : ''} — see below.</span>
              )}
            </div>
          </div>
          {syncResult.errors.map((e, i) => (
            <p key={i} className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
              {e}
            </p>
          ))}
        </div>
      )}

      {/* Comment list */}
      {loading && comments.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading comments…
        </div>
      ) : visibleComments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
            <MessageSquare size={24} className="text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600">
              {hasFilters || triage !== 'all' ? 'No comments match this view' : 'No comments yet'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {hasFilters || triage !== 'all'
                ? 'Try another view, clear the filters, or sync again.'
                : 'Click "Sync now" to fetch comments from your published posts.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleComments.map((c) => {
            const replyCount = c._count?.replies ?? 0;
            const isOpen = expanded.has(c.id);
            const replies = repliesById[c.id];
            const postTitle = c.target?.post?.title;

            return (
              <div
                key={c.id}
                className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden"
              >
                {/* Main comment row */}
                <div className="px-4 pt-3.5 pb-3 flex gap-3">
                  <AuthorAvatar name={c.authorName} platform={c.platform} />

                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    {/* Author + meta row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-bold text-gray-900 leading-tight">{c.authorName}</span>
                          <span className="text-[11px] text-gray-400">{c.account.platformHandle}</span>
                          {postTitle && (
                            <span className="inline-flex items-center h-4 px-1.5 text-[10px] font-semibold bg-gray-100 text-gray-500 rounded truncate max-w-[140px]">
                              {postTitle}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.autoReplied && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <Bot size={10} /> Auto-replied
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 tabular-nums">
                          {relativeTime(c.postedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Comment text */}
                    <p className="text-[13px] text-gray-700 leading-relaxed">{c.text}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-0.5">
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
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <ChevronDown
                            size={12}
                            className={cn('transition-transform duration-150', isOpen && 'rotate-180')}
                          />
                          {isOpen ? 'Hide' : 'Show'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reply composer */}
                {replyingTo === c.id && (
                  <div className="px-4 pb-3 border-t border-gray-100 pt-3 bg-gray-50/50">
                    <div className="flex gap-2 items-end">
                      <textarea
                        autoFocus
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply(c.id);
                          if (e.key === 'Escape') setReplyingTo(null);
                        }}
                        placeholder="Write a reply… (Cmd+Enter to send)"
                        className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 transition-all resize-none leading-relaxed"
                      />
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => handleReply(c.id)}
                          disabled={sending || !replyText.trim()}
                          className="btn-clay-primary h-8 w-8 flex items-center justify-center rounded-lg disabled:opacity-50"
                        >
                          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        </button>
                        <button
                          onClick={() => { setReplyingTo(null); setReplyText(''); }}
                          className="text-[10px] font-medium text-gray-400 hover:text-gray-600 text-center"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reply thread */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-3 flex flex-col gap-3">
                    {loadingReplies.has(c.id) ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 py-1">
                        <Loader2 size={11} className="animate-spin" /> Loading replies…
                      </div>
                    ) : replies && replies.length > 0 ? (
                      replies.map((r) => (
                        <div key={r.id} className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                            {r.authorName[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5 mb-0.5">
                              <span className="text-[12px] font-semibold text-gray-800">{r.authorName}</span>
                              <span className="text-[10px] text-gray-400">{relativeTime(r.postedAt)}</span>
                            </div>
                            <p className="text-[12px] text-gray-600 leading-snug">{r.text}</p>
                          </div>
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

  const activeRules = rules.filter((rule) => rule.isEnabled).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-gray-700">Automatic replies</p>
            {!loading && rules.length > 0 && (
              <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                {activeRules} active
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Rules trigger when new comments match your criteria and post a reply instantly.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-clay-primary h-8 px-3 text-xs inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus size={12} /> Add rule
        </button>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <span><strong>Review before enabling.</strong> Active rules reply publicly as soon as a comment matches. Use keyword rules for support or sales prompts, and pause any rule when the message needs a human response.</span>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-orange-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">New auto-reply rule</p>
            <button
              onClick={() => setShowForm(false)}
              className="text-[11px] font-semibold text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Platform</label>
              <Select
                value={form.platform}
                onValueChange={(val) => val && setForm((f) => ({ ...f, platform: val }))}
              >
                <SelectTrigger className="h-8 bg-gray-50 border-gray-200 text-xs text-gray-700 w-full">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Trigger</label>
              <Select
                value={form.triggerType}
                onValueChange={(val) => val && setForm((f) => ({ ...f, triggerType: val }))}
              >
                <SelectTrigger className="h-8 bg-gray-50 border-gray-200 text-xs text-gray-700 w-full">
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All comments</SelectItem>
                  <SelectItem value="keyword">Keyword match</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.triggerType === 'keyword' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Keywords <span className="normal-case font-normal text-gray-400">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                placeholder="price, order, help"
                className="h-8 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Reply message</label>
            <textarea
              value={form.replyText}
              onChange={(e) => setForm((f) => ({ ...f, replyText: e.target.value }))}
              placeholder="Thanks for your comment! We'll get back to you shortly."
              rows={3}
              className="px-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !form.replyText.trim()}
              className="btn-clay-primary h-8 px-4 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving && <Loader2 size={11} className="animate-spin" />}
              Save rule
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
            <Bot size={24} className="text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600">No auto-reply rules yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Add a rule to start auto-replying to comments automatically.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rules.map((rule) => {
            const keywords = rule.keywords
              ? rule.keywords.split(',').map((k) => k.trim()).filter(Boolean)
              : [];

            return (
              <div key={rule.id} className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
                {/* Rule header */}
                <div className="px-4 pt-3.5 pb-3 flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <PlatformBadge platform={rule.platform} size="md" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[13px] font-bold text-gray-900">{rule.platform}</span>
                      <span className={cn(
                        'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border',
                        rule.isEnabled
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      )}>
                        {rule.isEnabled ? 'Active' : 'Paused'}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {rule.triggerType === 'keyword' ? 'Keyword match' : 'All comments'}
                      </span>
                    </div>

                    {/* Reply text */}
                    <p className="text-[12.5px] text-gray-600 leading-relaxed">{rule.replyText}</p>

                    {/* Keywords */}
                    {keywords.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        <span className="text-[10px] text-gray-400 font-medium">Triggers on:</span>
                        {keywords.map((kw) => (
                          <span key={kw} className="inline-flex h-4.5 items-center px-1.5 text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-100 rounded">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(rule)}
                      title={rule.isEnabled ? 'Pause rule' : 'Activate rule'}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {rule.isEnabled
                        ? <ToggleRight size={20} className="text-emerald-500" />
                        : <ToggleLeft size={20} className="text-gray-300" />
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      title="Delete rule"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
          <MessageSquare size={24} className="text-gray-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-600">No brand selected</p>
          <p className="text-xs text-gray-400 mt-0.5">Create or select a brand from the sidebar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight leading-tight">Comments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage comments and auto-replies for{' '}
            <span className="font-semibold text-gray-700">{activeBrand.name}</span>.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-1 bg-gray-100/80 rounded-xl w-fit border border-gray-200/60">
        {(['comments', 'auto-reply'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'h-7 px-4 text-xs font-semibold rounded-lg transition-all',
              tab === t
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t === 'comments' ? 'Comments' : 'Auto-Reply Rules'}
          </button>
        ))}
      </div>

      {tab === 'comments'
        ? <CommentsTab brandId={activeBrand.id} />
        : <AutoReplyTab brandId={activeBrand.id} />
      }
    </div>
  );
}
