import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoggerService } from '@/shared/logger/logger.service';
import { ChatQueueService } from './chat.service';

/**
 * Chat Unread Digest Cron Job
 * Runs daily at 8 PM Philippine Time (UTC+8)
 * Sends unread message digest emails to users
 */
@Injectable()
export class ChatUnreadDigestCron {
  constructor(
    private readonly chatQueueService: ChatQueueService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Cron job that runs at 8 PM Philippine Time (12:00 PM UTC)
   * Philippine Time is UTC+8, so 8 PM PHT = 12:00 PM UTC
   * Cron expression: '0 12 * * *' (At 12:00 PM UTC every day)
   */
  @Cron('0 12 * * *', {
    name: 'chat-unread-digest',
    timeZone: 'UTC',
  })
  async handleUnreadDigest(): Promise<void> {
    try {
      await this.chatQueueService.sendUnreadDigestEmails();
    } catch (error) {
      this.logger.error(
        'Chat unread digest cron job failed',
        'ChatUnreadDigestCron',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
  }
}
