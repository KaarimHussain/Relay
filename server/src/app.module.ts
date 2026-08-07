import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { AccountsModule } from './accounts/accounts.module';
import { PostsModule } from './posts/posts.module';
import { MediaModule } from './media/media.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { TemplatesModule } from './templates/templates.module';
import { OAuthModule } from './oauth/oauth.module';
import { CommentsModule } from './comments/comments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    BrandsModule,
    AccountsModule,
    PostsModule,
    MediaModule,
    AnalyticsModule,
    AiModule,
    TemplatesModule,
    OAuthModule,
    CommentsModule,
  ],
})
export class AppModule {}
