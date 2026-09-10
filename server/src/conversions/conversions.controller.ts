import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConversionsService } from './conversions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MemberRole } from '@prisma/client';

// ─── Authenticated routes ─────────────────────────────────────────────────────

@ApiTags('Conversions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/conversions')
export class ConversionsController {
  constructor(private svc: ConversionsService) {}

  @Get('stats')
  stats(@Param('brandId') brandId: string) {
    return this.svc.stats(brandId);
  }

  @Get('rules')
  listRules(@Param('brandId') brandId: string) {
    return this.svc.listRules(brandId);
  }

  @Post('rules')
  @Roles(MemberRole.Admin, MemberRole.Owner)
  createRule(
    @Param('brandId') brandId: string,
    @Body() dto: { name: string; conversionType: string; liAdAccountUrn: string },
  ) {
    return this.svc.createRule(brandId, dto);
  }

  @Delete('rules/:ruleId')
  @Roles(MemberRole.Admin, MemberRole.Owner)
  deleteRule(@Param('brandId') brandId: string, @Param('ruleId') ruleId: string) {
    return this.svc.deleteRule(brandId, ruleId);
  }
}

// ─── Public webhook (no JWT — ruleId cuid acts as secret) ─────────────────────

@ApiTags('Conversions')
@Controller('conversions/webhook')
export class ConversionsWebhookController {
  constructor(private svc: ConversionsService) {}

  @Post(':ruleId')
  ingestEvent(
    @Param('ruleId') ruleId: string,
    @Body() body: {
      email?: string;
      valueAmount?: number;
      valueCurrency?: string;
      pageUrl?: string;
      occurredAt?: string;
    },
  ) {
    return this.svc.ingestEvent(ruleId, body);
  }
}
