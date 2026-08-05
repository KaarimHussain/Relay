import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { MemberRole } from '@prisma/client';

const ROLE_ORDER: MemberRole[] = ['Editor', 'Admin', 'Owner'];

@Injectable()
export class BrandMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;
    const brandId = req.params.brandId;
    if (!brandId || !userId) throw new ForbiddenException('Missing brand or user context');

    const membership = await this.prisma.membership.findUnique({
      where: { userId_brandId: { userId, brandId } },
    });
    if (!membership) throw new NotFoundException('Brand not found or access denied');

    req.membership = membership;

    const required = this.reflector.getAllAndOverride<MemberRole[]>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const userLevel = ROLE_ORDER.indexOf(membership.role);
    const minLevel = Math.min(...required.map(r => ROLE_ORDER.indexOf(r)));
    if (userLevel < minLevel) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
