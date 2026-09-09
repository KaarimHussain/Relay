import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BrandsModule } from '../brands/brands.module';
import { AccountsModule } from '../accounts/accounts.module';
import { PostsModule } from '../posts/posts.module';
import { CommentsModule } from '../comments/comments.module';
import { TemplatesModule } from '../templates/templates.module';
import { AiModule } from '../ai/ai.module';
import { CompetitorsModule } from '../competitors/competitors.module';
import { TrendsModule } from '../trends/trends.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { OwnershipService } from './ownership.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BrandsModule,
    AccountsModule,
    PostsModule,
    CommentsModule,
    TemplatesModule,
    AiModule,
    CompetitorsModule,
    TrendsModule,
    AnalyticsModule,
  ],
  controllers: [McpController],
  providers: [McpService, OwnershipService],
  exports: [McpService],
})
export class McpModule {}
