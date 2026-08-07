import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PostScheduler } from './workers/post.scheduler';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  controllers: [PostsController],
  providers: [PostsService, PostScheduler],
})
export class PostsModule {}
