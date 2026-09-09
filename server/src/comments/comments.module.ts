import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentsScheduler } from './comments.scheduler';
import { AccountsModule } from '../accounts/accounts.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AccountsModule, AiModule],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsScheduler],
  exports: [CommentsService],
})
export class CommentsModule {}
