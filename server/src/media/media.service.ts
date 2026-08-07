import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService, private config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key:    config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  private uploadToCloudinary(buffer: Buffer, mimeType: string): Promise<{ secure_url: string; public_id: string }> {
    const resourceType = mimeType.startsWith('video/') ? 'video' : 'image';
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: resourceType, folder: 'relay', unique_filename: true },
        (err, result) => {
          if (err || !result) reject(err ?? new Error('Cloudinary upload failed'));
          else resolve({ secure_url: result.secure_url, public_id: result.public_id });
        },
      ).end(buffer);
    });
  }

  async saveUpload(brandId: string, userId: string, file: Express.Multer.File, postId?: string) {
    const { secure_url, public_id } = await this.uploadToCloudinary(file.buffer, file.mimetype);

    return this.prisma.media.create({
      data: {
        brandId,
        postId: postId ?? null,
        uploadedBy: userId,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: public_id,
        url: secure_url,
      },
    });
  }

  async list(brandId: string, postId?: string) {
    return this.prisma.media.findMany({
      where: { brandId, ...(postId ? { postId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(brandId: string, mediaId: string) {
    const media = await this.prisma.media.findFirst({ where: { id: mediaId, brandId } });
    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async delete(brandId: string, mediaId: string) {
    const media = await this.prisma.media.findFirst({ where: { id: mediaId, brandId } });
    if (!media) throw new NotFoundException('Media not found');

    const resourceType = media.mimeType.startsWith('video/') ? 'video' : 'image';
    try {
      await cloudinary.uploader.destroy(media.storageKey, { resource_type: resourceType });
    } catch { /* already gone */ }

    return this.prisma.media.delete({ where: { id: mediaId } });
  }
}
