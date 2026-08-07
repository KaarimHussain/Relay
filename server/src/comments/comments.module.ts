import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentsScheduler } from './comments.scheduler';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsScheduler],
})
export class CommentsModule {}
