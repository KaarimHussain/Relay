import { Module } from '@nestjs/common';
import { ConversionsService } from './conversions.service';
import { ConversionsController, ConversionsWebhookController } from './conversions.controller';

@Module({
  controllers: [ConversionsController, ConversionsWebhookController],
  providers: [ConversionsService],
})
export class ConversionsModule {}
