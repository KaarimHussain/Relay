import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { SchedulePostDto } from './dto/schedule-post.dto';
import { PostStatus } from '@prisma/client';
import { publishToPlatform } from './workers/platform-publisher';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private accounts: AccountsService,
  ) {}

  async create(brandId: string, userId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        brandId,
        authorId: userId,
        title: dto.title,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        media: dto.mediaIds?.length
          ? { connect: dto.mediaIds.map(id => ({ id })) }
          : undefined,
        targets: dto.targets?.length
          ? { create: dto.targets.map(t => ({ accountId: t.accountId, caption: t.caption, hashtags: t.hashtags })) }
          : undefined,
      },
      include: { targets: true, media: true },
    });
    return post;
  }

  async list(brandId: string, status?: PostStatus) {
    return this.prisma.post.findMany({
      where: { brandId, ...(status ? { status } : {}) },
      include: { targets: { include: { account: { select: { platform: true, platformHandle: true } } } }, media: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(brandId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, brandId },
      include: { targets: { include: { account: true, snapshots: { orderBy: { takenAt: 'desc' }, take: 1 } } }, media: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async update(brandId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, brandId } });
    if (!post) throw new NotFoundException('Post not found');

    if (dto.targets?.length) {
      await this.prisma.postPlatformTarget.deleteMany({ where: { postId } });
      await this.prisma.postPlatformTarget.createMany({
        data: dto.targets.map(t => ({
          postId,
          accountId: t.accountId,
          caption: t.caption,
          hashtags: t.hashtags ?? null,
        })),
      });
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.scheduledAt !== undefined && { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }),
        ...(dto.mediaIds !== undefined && {
          media: {
            set: dto.mediaIds.map(id => ({ id })),
          },
        }),
      },
      include: { targets: { include: { account: { select: { platform: true, platformHandle: true } } } }, media: true },
    });
  }

  async delete(brandId: string, postId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, brandId } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.post.delete({ where: { id: postId } });
  }

  async schedule(brandId: string, postId: string, dto: SchedulePostDto) {
    const post = await this.findOne(brandId, postId);
    if (!post.targets.length) throw new BadRequestException('Post has no platform targets');
    const scheduledAt = new Date(dto.scheduledAt);

    await this.prisma.post.update({ where: { id: postId }, data: { status: PostStatus.Scheduled, scheduledAt } });
    await this.prisma.postPlatformTarget.updateMany({
      where: { postId },
      data: { status: PostStatus.Scheduled, scheduledAt },
    });

    return this.findOne(brandId, postId);
  }

  // Runs publish logic inline — no queue, no Redis dependency.
  async publishNow(brandId: string, postId: string) {
    const post = await this.findOne(brandId, postId);
    if (!post.targets.length) throw new BadRequestException('Post has no platform targets');

    await this.prisma.post.update({ where: { id: postId }, data: { status: PostStatus.Publishing } });

    for (const target of post.targets) {
      await this.prisma.postPlatformTarget.update({
        where: { id: target.id },
        data: { status: PostStatus.Publishing },
      });

      try {
        const account = await this.accounts.getDecryptedAccount(target.accountId);
        const externalPostId = await publishToPlatform(
          account.platform,
          account.platformUserId,
          account.accessToken,
          target.caption,
          target.hashtags,
          post.media.map(m => ({ url: m.url, mimeType: m.mimeType })),
        );
        await this.prisma.postPlatformTarget.update({
          where: { id: target.id },
          data: { status: PostStatus.Published, publishedAt: new Date(), externalPostId },
        });
      } catch (err: any) {
        await this.prisma.postPlatformTarget.update({
          where: { id: target.id },
          data: { status: PostStatus.Failed, errorMessage: err?.message ?? 'Unknown error' },
        });
      }
    }

    const updatedTargets = await this.prisma.postPlatformTarget.findMany({ where: { postId } });
    const allPublished = updatedTargets.every(t => t.status === PostStatus.Published);
    const anyFailed   = updatedTargets.some(t  => t.status === PostStatus.Failed);
    const finalStatus = allPublished ? PostStatus.Published : anyFailed ? PostStatus.Failed : PostStatus.Publishing;

    return this.prisma.post.update({
      where: { id: postId },
      data: { status: finalStatus },
      include: { targets: { include: { account: { select: { platform: true, platformHandle: true } } } }, media: true },
    });
  }

  async cancel(brandId: string, postId: string) {
    const post = await this.findOne(brandId, postId);
    await this.prisma.postPlatformTarget.updateMany({
      where: { postId: post.id },
      data: { status: PostStatus.Draft, scheduledAt: null },
    });
    return this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.Draft, scheduledAt: null },
    });
  }

  // Called by PostScheduler — publishes all overdue scheduled posts.
  async publishDueScheduledPosts() {
    const now = new Date();
    const duePosts = await this.prisma.post.findMany({
      where: { status: PostStatus.Scheduled, scheduledAt: { lte: now } },
      include: { targets: true },
    });

    for (const post of duePosts) {
      await this.publishNow(post.brandId, post.id).catch(() => {});
    }
  }
}
