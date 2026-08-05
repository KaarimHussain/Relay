import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  private uploadsDir: string;
  private baseUrl: string;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.uploadsDir = path.resolve(process.cwd(), 'uploads');
    this.baseUrl = config.get('BASE_URL', 'http://localhost:3001');
    if (!fs.existsSync(this.uploadsDir)) fs.mkdirSync(this.uploadsDir, { recursive: true });
  }

  async saveUpload(
    brandId: string,
    userId: string,
    file: Express.Multer.File,
    postId?: string,
  ) {
    const publicUrl = `${this.baseUrl}/uploads/${file.filename}`;
    const media = await this.prisma.media.create({
      data: {
        brandId,
        postId: postId ?? null,
        uploadedBy: userId,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: file.filename,
        url: publicUrl,
      },
    });
    return media;
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

    const filePath = path.join(this.uploadsDir, media.storageKey);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }

    return this.prisma.media.delete({ where: { id: mediaId } });
  }
}
