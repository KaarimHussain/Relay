import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { AiService } from '../ai/ai.service';
import { CreateAutoReplyDto } from './dto/create-auto-reply.dto';
import { UpdateCommentAiConfigDto } from './dto/update-comment-ai-config.dto';
import { Platform, PostStatus } from '@prisma/client';

// ─── Platform fetchers ─────────────────────────────────────────────────────────

interface RawComment {
  externalId: string;
  authorName: string;
  authorId: string | null;
  text: string;
  postedAt: Date;
  replies: RawComment[];
}

/**
 * Raised when a post/media object no longer exists on the platform (deleted, or
 * the stored external ID is stale). The Graph API reports this as code 100 /
 * subcode 33 or code 10 "Object does not exist" — a data problem, not a
 * permission or credentials problem, so the sync skips it instead of erroring.
 */
class DeletedObjectError extends Error {}

/** True when a Graph error means "this object is gone", not "you lack access". */
function isDeletedObjectError(err: any): boolean {
  if (!err) return false;
  const code = err.code;
  const sub = err.error_subcode;
  const msg = String(err.message ?? '');
  return (code === 100 && sub === 33)
    || (code === 10 && /does not exist/i.test(msg))
    || /Object with ID .* does not exist/i.test(msg);
}

/**
 * True when Graph rejects reading a commenter's *identity* (the `from` field)
 * because the app lacks the "Page Public Content Access" feature. The comment
 * text is still readable — only the author's name/id is gated. Signature is
 * code 100 mentioning pages_read_engagement / Page Public Content / reviewable
 * feature, WITHOUT the deleted-object subcode 33.
 */
function isPublicContentError(err: any): boolean {
  if (!err || err.code !== 100 || err.error_subcode === 33) return false;
  return /pages_read_engagement|Page Public (Content|Metadata)|reviewable feature/i.test(String(err.message ?? ''));
}

async function fetchFacebookComments(postId: string, token: string): Promise<RawComment[]> {
  const base = `https://graph.facebook.com/v21.0/${postId}/comments?limit=100&access_token=${token}&fields=`;
  // Preferred: include author identity + nested replies in one call.
  const withAuthor = 'id,from,message,created_time,comments.limit(50){id,from,message,created_time}';
  // Fallback: drop `from` — reading an external commenter's identity needs the
  // Page Public Content Access feature (App Review). Text is still available.
  const noAuthor = 'id,message,created_time,comments.limit(50){id,message,created_time}';

  let data = await fetch(base + encodeURIComponent(withAuthor)).then(r => r.json()) as any;
  if (data.error && isPublicContentError(data.error)) {
    data = await fetch(base + encodeURIComponent(noAuthor)).then(r => r.json()) as any;
  }
  if (data.error) {
    if (isDeletedObjectError(data.error)) throw new DeletedObjectError(data.error.message);
    throw new Error(data.error.message);
  }
  const map = (c: any): RawComment => ({
    externalId: c.id,
    authorName: c.from?.name ?? 'Facebook user',
    authorId:   c.from?.id ?? null,
    text:       c.message ?? '',
    postedAt:   new Date(c.created_time),
    replies:    (c.comments?.data ?? []).map(map),
  });
  return (data.data ?? []).map(map);
}

async function fetchInstagramComments(mediaId: string, token: string): Promise<RawComment[]> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${mediaId}/comments?fields=id,username,text,timestamp,replies.limit(50){id,username,text,timestamp}&limit=100&access_token=${token}`
  );
  const data = await res.json() as any;
  if (data.error) {
    if (isDeletedObjectError(data.error)) throw new DeletedObjectError(data.error.message);
    throw new Error(data.error.message);
  }
  const map = (c: any): RawComment => ({
    externalId: c.id,
    authorName: c.username ?? 'Unknown',
    authorId:   null,
    text:       c.text ?? '',
    postedAt:   new Date(c.timestamp),
    replies:    (c.replies?.data ?? []).map(map),
  });
  return (data.data ?? []).map(map);
}

async function fetchXMentions(userId: string, token: string) {
  const res = await fetch(
    `https://api.twitter.com/2/users/${userId}/mentions?tweet.fields=created_at,author_id,text&expansions=author_id&user.fields=name,username&max_results=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json() as any;
  if (data.errors) return []; // non-fatal
  const usersMap: Record<string, any> = {};
  for (const u of data.includes?.users ?? []) usersMap[u.id] = u;
  return (data.data ?? []).map((t: any) => ({
    externalId:    t.id,
    authorName:    usersMap[t.author_id]?.name ?? 'Unknown',
    authorId:      t.author_id,
    text:          t.text ?? '',
    postedAt:      new Date(t.created_at),
    replies:       [] as RawComment[],
  }));
}

async function fetchLinkedInComments(postUrn: string, token: string) {
  const encoded = encodeURIComponent(postUrn);
  const res = await fetch(
    `https://api.linkedin.com/rest/socialActions/${encoded}/comments?count=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'LinkedIn-Version': '202601',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    }
  );
  const data = await res.json() as any;
  // LinkedIn's comment API (socialActions) is gated behind their Community
  // Management API partner program — standard apps get 401/403. This is a hard
  // platform limitation, not a fixable error, so skip silently instead of
  // spamming the sync error list.
  if (data.status === 401 || data.status === 403) return [];
  return (data.elements ?? []).map((c: any) => ({
    externalId:    c.id,
    authorName:    c.actor?.split(':').pop() ?? 'Unknown',
    authorId:      c.actor ?? null,
    text:          c.message?.text ?? '',
    postedAt:      new Date(c.created?.time ?? Date.now()),
    replies:       [] as RawComment[],
  }));
}

// ─── Platform reply senders ────────────────────────────────────────────────────

async function replyOnFacebook(commentId: string, text: string, token: string) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${commentId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, access_token: token }),
  });
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

async function replyOnInstagram(commentId: string, text: string, token: string) {
  // Instagram replies use the parent media's reply endpoint
  const res = await fetch(`https://graph.facebook.com/v21.0/${commentId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, access_token: token }),
  });
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

async function replyOnX(tweetId: string, text: string, token: string) {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, reply: { in_reply_to_tweet_id: tweetId } }),
  });
  const data = await res.json() as any;
  if (data.errors) throw new Error(data.title ?? 'X reply failed');
  return data.data?.id;
}

async function replyOnLinkedIn(commentUrn: string, postUrn: string, text: string, token: string, authorUrn: string) {
  const encoded = encodeURIComponent(postUrn);
  const res = await fetch(`https://api.linkedin.com/rest/socialActions/${encoded}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': '202601',
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      actor: authorUrn,
      message: { text },
      parentComment: commentUrn,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn reply failed: ${res.status}`);
  return res.headers.get('x-restli-id') ?? 'linkedin-reply';
}

// ─── AI comment-reply defaults ──────────────────────────────────────────────────
// `guidelines` and `niche` are static for now (shown read-only in the settings
// panel); only `behaviour` is user-editable.
const DEFAULT_AI_BEHAVIOUR =
  'Super casual and full of humour — like texting a witty friend. Playful, warm, and quick. ' +
  'Keep it light, throw in the occasional joke or pun, and never sound like a corporate bot.';
const DEFAULT_AI_GUIDELINES =
  'Be kind and respectful. Never argue or get defensive. Keep replies brand-safe and inclusive. ' +
  'Do not make promises about pricing, refunds, or delivery. For anything sensitive, invite the person to DM us.';
const DEFAULT_AI_NICHE = 'Social media management & content creation SaaS.';

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private accounts: AccountsService,
    private ai: AiService,
  ) {}

  // ── List comments ────────────────────────────────────────────────────────────

  async listComments(brandId: string, platform?: string, targetId?: string, postId?: string) {
    return this.prisma.comment.findMany({
      where: {
        brandId,
        ...(platform ? { platform: platform as Platform } : {}),
        ...(targetId ? { targetId } : {}),
        ...(postId ? { target: { postId } } : {}),
        isReply: false,
      },
      include: {
        account: { select: { platform: true, platformHandle: true } },
        target: { select: { id: true, post: { select: { title: true } } } },
        _count: { select: { replies: true } },
      },
      orderBy: { postedAt: 'desc' },
      take: 200,
    });
  }

  // ── Replies for a single comment (lazy-loaded by the UI dropdown) ─────────────

  async getReplies(brandId: string, commentId: string) {
    const parent = await this.prisma.comment.findFirst({ where: { id: commentId, brandId }, select: { id: true } });
    if (!parent) throw new NotFoundException('Comment not found');
    return this.prisma.comment.findMany({
      where: { parentId: commentId },
      include: { account: { select: { platform: true, platformHandle: true } } },
      orderBy: { postedAt: 'asc' },
    });
  }

  /**
   * Upsert one comment or reply. Returns the stored row plus whether it was
   * newly created this sync — the auto-reply trigger relies on `created` so it
   * fires exactly once, when a comment first appears.
   */
  private async upsertComment(
    brandId: string,
    target: { id: string; accountId: string; account: { platform: Platform } },
    externalPostId: string,
    raw: RawComment,
    parentId: string | null,
  ) {
    const platform = target.account.platform;
    const existing = await this.prisma.comment.findUnique({
      where: { platform_externalId: { platform, externalId: raw.externalId } },
      select: { id: true },
    });

    if (existing) {
      const row = await this.prisma.comment.update({
        where: { id: existing.id },
        data: { text: raw.text },
      });
      return { row, created: false };
    }

    const row = await this.prisma.comment.create({
      data: {
        brandId,
        accountId:     target.accountId,
        targetId:      target.id,
        externalId:    raw.externalId,
        externalPostId,
        platform,
        authorName:    raw.authorName,
        authorId:      raw.authorId,
        text:          raw.text,
        postedAt:      raw.postedAt,
        isReply:       parentId !== null,
        parentId,
      },
    });
    return { row, created: true };
  }

  // ── Reply to a comment ───────────────────────────────────────────────────────

  async replyToComment(brandId: string, commentId: string, text: string) {
    const comment = await this.prisma.comment.findFirst({ where: { id: commentId, brandId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const account = await this.accounts.getDecryptedAccount(comment.accountId);
    const { accessToken, platform, platformUserId, platformHandle } = account;

    let externalReplyId: string;
    switch (platform) {
      case 'Facebook':
        externalReplyId = await replyOnFacebook(comment.externalId, text, accessToken);
        break;
      case 'Instagram':
        externalReplyId = await replyOnInstagram(comment.externalId, text, accessToken);
        break;
      case 'X':
        externalReplyId = await replyOnX(comment.externalId, text, accessToken);
        break;
      case 'LinkedIn':
        externalReplyId = await replyOnLinkedIn(
          comment.externalId,
          comment.externalPostId,
          text,
          accessToken,
          platformUserId.startsWith('urn:li:') ? platformUserId : `urn:li:person:${platformUserId}`,
        );
        break;
      default:
        throw new Error(`Replies not supported for ${platform}`);
    }

    // Store the reply immediately so it shows in the thread without waiting for
    // the next sync. Some platforms return a placeholder id (e.g. LinkedIn) —
    // fall back to a synthetic unique id so we never collide on the unique
    // (platform, externalId) key. A real id lets the next sync reconcile it.
    const realId = externalReplyId && /^\d|^urn:|_/.test(externalReplyId) && externalReplyId.length > 6;
    const replyExternalId = realId ? externalReplyId : `local-${randomUUID()}`;
    await this.prisma.comment.upsert({
      where: { platform_externalId: { platform, externalId: replyExternalId } },
      update: { text },
      create: {
        brandId,
        accountId:     comment.accountId,
        targetId:      comment.targetId,
        externalId:    replyExternalId,
        externalPostId: comment.externalPostId,
        platform,
        authorName:    platformHandle,
        authorId:      platformUserId,
        text,
        postedAt:      new Date(),
        isReply:       true,
        parentId:      comment.id,
      },
    }).catch(() => {/* non-fatal — the reply is already posted on the platform */});

    return { externalReplyId };
  }

  // ── Sync comments from all published posts ───────────────────────────────────

  async syncComments(brandId: string) {
    const targets = await this.prisma.postPlatformTarget.findMany({
      where: {
        post: { brandId },
        status: PostStatus.Published,
        externalPostId: { not: null },
      },
      include: { account: true },
    });

    if (targets.length === 0) {
      return { synced: 0, targets: 0, errors: [], message: 'No published posts with platform IDs found.' };
    }

    let total = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const target of targets) {
      const platform = target.account.platform;
      const label = `${platform} / ${target.account.platformHandle}`;
      try {
        const { accessToken } = await this.accounts.getDecryptedAccount(target.accountId);
        const externalPostId = target.externalPostId!;

        let rawComments: RawComment[] = [];
        if (platform === 'Facebook')       rawComments = await fetchFacebookComments(externalPostId, accessToken);
        else if (platform === 'Instagram') rawComments = await fetchInstagramComments(externalPostId, accessToken);
        else if (platform === 'X')         rawComments = await fetchXMentions(target.account.platformUserId, accessToken);
        else if (platform === 'LinkedIn')  rawComments = await fetchLinkedInComments(externalPostId, accessToken);

        for (const c of rawComments) {
          const { row: parent, created } = await this.upsertComment(brandId, target, externalPostId, c, null);
          total++;

          // Persist replies (linked to their parent, flagged as replies).
          for (const r of c.replies) {
            await this.upsertComment(brandId, target, externalPostId, r, parent.id);
            total++;
          }

          // Auto-reply ONLY on top-level comments the first time we see them.
          // Gating on `created` (not just the autoReplied flag) means new replies
          // arriving under an existing comment never re-trigger a reply, and our
          // own replies (which are children) are never eligible.
          if (created && !parent.autoReplied) {
            await this.tryAutoReply(brandId, parent, target.account).catch(() => {});
          }
        }
      } catch (err: any) {
        if (err instanceof DeletedObjectError) {
          // The post/media was deleted on the platform. Clear the stale external
          // ID so future syncs skip this target entirely instead of re-hitting a
          // guaranteed 404 — and don't surface it as an error.
          skipped++;
          await this.prisma.postPlatformTarget.update({
            where: { id: target.id },
            data: { externalPostId: null },
          }).catch(() => {});
        } else {
          errors.push(`${label}: ${err.message}`);
        }
      }
    }

    const message = skipped > 0
      ? `${skipped} deleted post${skipped !== 1 ? 's' : ''} were skipped (no longer on the platform).`
      : undefined;
    return { synced: total, targets: targets.length, skipped, errors, message };
  }

  private async tryAutoReply(brandId: string, comment: any, account: any) {
    // Never auto-reply to a reply — only top-level comments are eligible.
    if (comment.isReply || comment.parentId) return;

    // AI mode takes precedence: when enabled, every new top-level comment gets a
    // contextual, on-tone reply generated from the comment's actual content.
    const aiConfig = await this.prisma.commentAiConfig.findUnique({ where: { brandId } });
    if (aiConfig?.isEnabled) {
      let replyText: string;
      try {
        replyText = await this.ai.generateCommentReply(brandId, {
          platform:   account.platform,
          commentText: comment.text,
          authorName: comment.authorName,
          behaviour:  aiConfig.behaviour || DEFAULT_AI_BEHAVIOUR,
          guidelines: aiConfig.guidelines || DEFAULT_AI_GUIDELINES,
          niche:      aiConfig.niche || DEFAULT_AI_NICHE,
        });
      } catch {
        return; // AI failed — skip rather than fall back to a template silently.
      }
      await this.replyToComment(brandId, comment.id, replyText);
      await this.prisma.comment.update({
        where: { id: comment.id },
        data: { autoReplied: true, repliedAt: new Date() },
      });
      return;
    }

    // Template mode: the per-platform fixed-text rule.
    const rule = await this.prisma.autoReply.findUnique({
      where: { brandId_platform: { brandId, platform: account.platform } },
    });
    if (!rule || !rule.isEnabled) return;

    const keywords = rule.triggerType === 'keyword' && rule.keywords
      ? rule.keywords.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean)
      : [];

    const matches = keywords.length === 0
      || keywords.some((kw: string) => comment.text.toLowerCase().includes(kw));
    if (!matches) return;

    await this.replyToComment(brandId, comment.id, rule.replyText);
    await this.prisma.comment.update({
      where: { id: comment.id },
      data: { autoReplied: true, repliedAt: new Date() },
    });
  }

  // ── AI comment-reply config ──────────────────────────────────────────────────

  async getAiConfig(brandId: string) {
    const config = await this.prisma.commentAiConfig.findUnique({ where: { brandId } });
    return {
      isEnabled:  config?.isEnabled ?? false,
      behaviour:  config?.behaviour || DEFAULT_AI_BEHAVIOUR,
      guidelines: config?.guidelines || DEFAULT_AI_GUIDELINES,
      niche:      config?.niche || DEFAULT_AI_NICHE,
    };
  }

  async updateAiConfig(brandId: string, dto: UpdateCommentAiConfigDto) {
    await this.prisma.commentAiConfig.upsert({
      where: { brandId },
      update: {
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
        ...(dto.behaviour !== undefined ? { behaviour: dto.behaviour } : {}),
      },
      create: {
        brandId,
        isEnabled: dto.isEnabled ?? false,
        behaviour: dto.behaviour ?? DEFAULT_AI_BEHAVIOUR,
      },
    });
    return this.getAiConfig(brandId);
  }

  // ── Auto-reply rules ─────────────────────────────────────────────────────────

  async listAutoReplies(brandId: string) {
    return this.prisma.autoReply.findMany({ where: { brandId }, orderBy: { platform: 'asc' } });
  }

  async upsertAutoReply(brandId: string, dto: CreateAutoReplyDto) {
    return this.prisma.autoReply.upsert({
      where: { brandId_platform: { brandId, platform: dto.platform } },
      update: {
        replyText:   dto.replyText,
        isEnabled:   dto.isEnabled ?? true,
        triggerType: dto.triggerType ?? 'all',
        keywords:    dto.keywords ?? null,
      },
      create: {
        brandId,
        platform:    dto.platform,
        replyText:   dto.replyText,
        isEnabled:   dto.isEnabled ?? true,
        triggerType: dto.triggerType ?? 'all',
        keywords:    dto.keywords ?? null,
      },
    });
  }

  async deleteAutoReply(brandId: string, ruleId: string) {
    const rule = await this.prisma.autoReply.findFirst({ where: { id: ruleId, brandId } });
    if (!rule) throw new NotFoundException('Auto-reply rule not found');
    return this.prisma.autoReply.delete({ where: { id: ruleId } });
  }

  async toggleAutoReply(brandId: string, ruleId: string, isEnabled: boolean) {
    const rule = await this.prisma.autoReply.findFirst({ where: { id: ruleId, brandId } });
    if (!rule) throw new NotFoundException('Auto-reply rule not found');
    return this.prisma.autoReply.update({ where: { id: ruleId }, data: { isEnabled } });
  }
}
