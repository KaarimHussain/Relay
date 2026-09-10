import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CampaignPlansService } from './campaign-plans.service';

@ApiTags('Campaign plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaign-plans')
export class CampaignPlansController {
  constructor(private campaigns: CampaignPlansService) {}

  @Get(':planId')
  findOne(@CurrentUser() user: any, @Param('planId') planId: string) {
    return this.campaigns.findOne(user.id, planId);
  }

  @Post(':planId/approve')
  approve(@CurrentUser() user: any, @Param('planId') planId: string) {
    return this.campaigns.approveAndExecute(user.id, planId);
  }
}
