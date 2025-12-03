import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { SubscriptionModule } from '@/modules/subscription/subscription.module';
import { ProTierGuard } from '@/shared/guards/pro-tier.guard';

@Module({
  imports: [SubscriptionModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ProTierGuard],
  exports: [ChatService],
})
export class ChatModule {}
