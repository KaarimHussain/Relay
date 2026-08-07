import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CreateAutoReplyDto } from './dto/create-auto-reply.dto';
import { Platform, PostStatus } from '@prisma/client';

// ─── Platform fetchers ─────────────────────────────────────────────────────────

async function fetchFacebookComments(postId: string, token: string) {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${postId}/comments?fields=id,from,message,created_time&limit=100&access_token=${token}`
  );
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);
  return (data.data ?? []).map((c: any) => ({
    externalId:    c.id,
    authorName:    c.from?.name ?? 'Unknown',
    authorId:      c.from?.id ?? null,
    text:          c.message ?? '',
    postedAt:      new Date(c.created_time),
  }));
}

async function fetchInstagramComments(mediaId: string, token: string) {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${mediaId}/comments?fields=id,username,text,timestamp&limit=100&access_token=${token}`
  );
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);
  return (data.data ?? []).map((c: any) => ({
    externalId:    c.id,
    authorName:    c.username ?? 'Unknown',
    authorId:      null,
    text:          c.text ?? '',
    postedAt:      new Date(c.timestamp),
  }));
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
  if (data.status === 401 || data.status === 403) {
    throw new Error(`LinkedIn comments require partner API access (${data.status}). Comment reading is not available for standard apps.`);
  }
  return (data.elements ?? []).map((c: any) => ({
    externalId:    c.id,
    authorName:    c.actor?.split(':').pop() ?? 'Unknown',
    authorId:      c.actor ?? null,
    text:          c.message?.text ?? '',
    postedAt:      new Date(c.created?.time ?? Date.now()),
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

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private accounts: AccountsService,
  ) {}

  // ── List comments ────────────────────────────────────────────────────────────

  async listComments(brandId: string, platform?: string, targetId?: string) {
    return this.prisma.comment.findMany({
      where: {
        brandId,
        ...(platform ? { platform: platform as Platform } : {}),
        ...(targetId ? { targetId } : {}),
        isReply: false,
      },
      include: {
        account: { select: { platform: true, platformHandle: true } },
        target: { select: { id: true, post: { select: { title: true } } } },
      },
      orderBy: { postedAt: 'desc' },
      take: 200,
    });
  }

  // ── Reply to a comment ───────────────────────────────────────────────────────

  async replyToComment(brandId: string, commentId: string, text: string) {
    const comment = await this.prisma.comment.findFirst({ where: { id: commentId, brandId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const { accessToken, platform, platformUserId } = await this.accounts.getDecryptedAccount(comment.accountId);

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
    const errors: string[] = [];

    for (const target of targets) {
      const platform = target.account.platform;
      const label = `${platform} / ${target.account.platformHandle}`;
      try {
        const { accessToken } = await this.accounts.getDecryptedAccount(target.accountId);
        const externalPostId = target.externalPostId!;

        let rawComments: any[] = [];
        if (platform === 'Facebook')       rawComments = await fetchFacebookComments(externalPostId, accessToken);
        else if (platform === 'Instagram') rawComments = await fetchInstagramComments(externalPostId, accessToken);
        else if (platform === 'X')         rawComments = await fetchXMentions(target.account.platformUserId, accessToken);
        else if (platform === 'LinkedIn')  rawComments = await fetchLinkedInComments(externalPostId, accessToken);

        for (const c of rawComments) {
          const upserted = await this.prisma.comment.upsert({
            where: { platform_externalId: { platform, externalId: c.externalId } },
            update: { text: c.text },
            create: {
              brandId,
              accountId:     target.accountId,
              targetId:      target.id,
              externalId:    c.externalId,
              externalPostId,
              platform,
              authorName:    c.authorName,
              authorId:      c.authorId,
              text:          c.text,
              postedAt:      c.postedAt,
            },
          });
          total++;

          // Auto-reply on newly created comments only
          if (upserted.id && !upserted.autoReplied) {
            await this.tryAutoReply(brandId, upserted, target.account).catch(() => {});
          }
        }
      } catch (err: any) {
        errors.push(`${label}: ${err.message}`);
      }
    }

    return { synced: total, targets: targets.length, errors };
  }

  private async tryAutoReply(brandId: string, comment: any, account: any) {
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
