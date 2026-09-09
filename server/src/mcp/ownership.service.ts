import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OwnershipService {
  constructor(private prisma: PrismaService) {}

  async assertBrandAccess(userId: string, brandId: string): Promise<void> {
    if (!userId) throw new ForbiddenException('Missing user context');
    if (!brandId) throw new NotFoundException('brandId is required');
    const membership = await this.prisma.membership.findUnique({
      where: { userId_brandId: { userId, brandId } },
    });
    if (!membership) throw new NotFoundException('Brand not found or access denied');
  }
}
