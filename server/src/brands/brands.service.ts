import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { MemberRole } from '@prisma/client';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
}

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBrandDto) {
    const brand = await this.prisma.brand.create({
      data: {
        name: dto.name,
        slug: slugify(dto.name),
        colorHex: dto.colorHex ?? '#F97316',
        voiceTone: dto.voiceTone,
        pillars: dto.pillars,
        memberships: { create: { userId, role: MemberRole.Owner } },
      },
    });
    return brand;
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { brand: true },
    });
    return memberships.map(m => ({ ...m.brand, role: m.role }));
  }

  async findOne(brandId: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(brandId: string, dto: UpdateBrandDto) {
    return this.prisma.brand.update({ where: { id: brandId }, data: dto });
  }

  async delete(brandId: string) {
    return this.prisma.brand.delete({ where: { id: brandId } });
  }

  async inviteMember(brandId: string, dto: InviteMemberDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.membership.upsert({
      where: { userId_brandId: { userId: user.id, brandId } },
      update: { role: dto.role },
      create: { userId: user.id, brandId, role: dto.role },
    });
  }

  async removeMember(brandId: string, userId: string, requestingUserId: string) {
    if (userId === requestingUserId) throw new ForbiddenException('Cannot remove yourself');
    return this.prisma.membership.delete({
      where: { userId_brandId: { userId, brandId } },
    });
  }

  async listMembers(brandId: string) {
    return this.prisma.membership.findMany({
      where: { brandId },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    });
  }
}
