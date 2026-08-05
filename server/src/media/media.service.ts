import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { UploadUrlDto } from './dto/upload-url.dto';

@Injectable()
export class MediaService {
  private s3: S3Client;
  private bucket: string;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.bucket = config.get('S3_BUCKET', 'relay-media');
    this.s3 = new S3Client({
      region: config.get('S3_REGION', 'auto'),
      endpoint: config.get('S3_ENDPOINT'),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async getUploadUrl(brandId: string, userId: string, dto: UploadUrlDto) {
    const key = `${brandId}/${Date.now()}-${dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { url, fields } = await createPresignedPost(this.s3, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 1, 100 * 1024 * 1024], // 100MB max
        ['eq', '$Content-Type', dto.mimeType],
      ],
      Fields: { 'Content-Type': dto.mimeType },
      Expires: 300, // 5 minutes
    });

    const media = await this.prisma.media.create({
      data: {
        brandId,
        postId: dto.postId ?? null,
        uploadedBy: userId,
        filename: dto.filename,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        storageKey: key,
        url: `${this.config.get('S3_PUBLIC_URL', '')}/${key}`,
      },
    });

    return { uploadUrl: url, fields, mediaId: media.id, key };
  }

  async list(brandId: string, postId?: string) {
    return this.prisma.media.findMany({
      where: { brandId, ...(postId ? { postId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(brandId: string, mediaId: string) {
    const media = await this.prisma.media.findFirst({ where: { id: mediaId, brandId } });
    if (!media) throw new NotFoundException('Media not found');
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: media.storageKey })).catch(() => {});
    return this.prisma.media.delete({ where: { id: mediaId } });
  }
}
