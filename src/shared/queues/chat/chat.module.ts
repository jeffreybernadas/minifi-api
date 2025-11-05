import { Module } from '@nestjs/common';
import { ChatQueueService } from './chat.service';
import { ChatUnreadDigestCron } from './chat-unread-digest.cron';
import { EmailQueueModule } from '@/shared/queues/email/email.module';

/**
 * Chat Queue Module
 * Provides chat queue functionality for worker process
 * - Service: Business logic for chat background tasks
 * - Cron: Scheduled job for unread digest emails
 */
@Module({
  imports: [EmailQueueModule],
  providers: [ChatQueueService, ChatUnreadDigestCron],
  exports: [ChatQueueService],
})
export class ChatQueueModule {}
