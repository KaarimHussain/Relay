import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PostsModule } from '../posts/posts.module';
import { CampaignPlansController } from './campaign-plans.controller';
import { CampaignPlansService } from './campaign-plans.service';
import { OwnershipService } from '../mcp/ownership.service';

@Module({
  imports: [PrismaModule, PostsModule],
  controllers: [CampaignPlansController],
  providers: [CampaignPlansService, OwnershipService],
  exports: [CampaignPlansService],
})
export class CampaignPlansModule {}
