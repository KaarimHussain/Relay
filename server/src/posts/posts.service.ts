import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { SchedulePostDto } from './dto/schedule-post.dto';
import { PostStatus } from '@prisma/client';
import { PUBLISH_QUEUE, PublishJobData } from './workers/publish.processor';
import { publishToPlatform } from './workers/platform-publisher';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private accounts: AccountsService,
    @InjectQueue(PUBLISH_QUEUE) private publishQueue: Queue,
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

    // Rebuild targets if provided
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
      },
      include: { targets: { include: { account: { select: { platform: true, platformHandle: true } } } }, media: true },
    });
  }

  async delete(brandId: string, postId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, brandId } });
    if (!post) throw new NotFoundException('Post not found');
    const targets = await this.prisma.postPlatformTarget.findMany({ where: { postId } });
    for (const t of targets) {
      if (t.jobId) await this.publishQueue.remove(t.jobId).catch(() => {});
    }
    return this.prisma.post.delete({ where: { id: postId } });
  }

  async schedule(brandId: string, postId: string, dto: SchedulePostDto) {
    const post = await this.findOne(brandId, postId);
    if (!post.targets.length) throw new BadRequestException('Post has no platform targets');
    const scheduledAt = new Date(dto.scheduledAt);
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());

    await this.prisma.post.update({ where: { id: postId }, data: { status: PostStatus.Scheduled, scheduledAt } });

    for (const target of post.targets) {
      const jobData: PublishJobData = { targetId: target.id, postId, accountId: target.accountId };
      const job = await this.publishQueue.add('publish', jobData, {
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        jobId: `target-${target.id}`,
      });
      await this.prisma.postPlatformTarget.update({
        where: { id: target.id },
        data: { status: PostStatus.Scheduled, scheduledAt, jobId: job.id },
      });
    }
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

    // Set parent post status based on target outcomes
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
    for (const target of post.targets) {
      if (target.jobId) await this.publishQueue.remove(target.jobId).catch(() => {});
      await this.prisma.postPlatformTarget.update({
        where: { id: target.id },
        data: { status: PostStatus.Draft, jobId: null, scheduledAt: null },
      });
    }
    return this.prisma.post.update({ where: { id: postId }, data: { status: PostStatus.Draft, scheduledAt: null } });
  }
}
