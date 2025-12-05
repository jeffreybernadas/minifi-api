import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoggerService } from '@/shared/logger/logger.service';
import { ChatQueueService } from './chat.service';

/**
 * Chat Unread Digest Cron Job
 * Runs daily at 8 PM Philippine Time
 * Sends unread message digest emails to users
 */
@Injectable()
export class ChatUnreadDigestCron {
  constructor(
    private readonly chatQueueService: ChatQueueService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Cron job that runs at 8 PM Philippine Time
   */
  @Cron('0 20 * * *', {
    name: 'chat-unread-digest',
    timeZone: 'Asia/Manila',
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
