import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PublishProcessor, PUBLISH_QUEUE } from './workers/publish.processor';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: PUBLISH_QUEUE }),
    AccountsModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, PublishProcessor],
})
export class PostsModule {}
