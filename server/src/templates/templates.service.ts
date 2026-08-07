import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  private serialize(t: { platforms: string; [k: string]: unknown }) {
    return { ...t, platforms: JSON.parse(t.platforms) as string[] };
  }

  async list(brandId: string) {
    const rows = await this.prisma.template.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(brandId: string, dto: CreateTemplateDto) {
    const row = await this.prisma.template.create({
      data: {
        brandId,
        name: dto.name,
        category: dto.category,
        platforms: JSON.stringify(dto.platforms),
        caption: dto.caption,
      },
    });
    return this.serialize(row);
  }

  async update(brandId: string, id: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.template.findFirst({ where: { id, brandId } });
    if (!existing) throw new NotFoundException('Template not found');
    const row = await this.prisma.template.update({
      where: { id },
      data: {
        ...(dto.name     !== undefined && { name:      dto.name }),
        ...(dto.category !== undefined && { category:  dto.category }),
        ...(dto.platforms !== undefined && { platforms: JSON.stringify(dto.platforms) }),
        ...(dto.caption  !== undefined && { caption:   dto.caption }),
      },
    });
    return this.serialize(row);
  }

  async remove(brandId: string, id: string) {
    const existing = await this.prisma.template.findFirst({ where: { id, brandId } });
    if (!existing) throw new NotFoundException('Template not found');
    await this.prisma.template.delete({ where: { id } });
  }
}
