import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/database.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { EmailProducer } from '@/shared/queues/email/email.producer';
import { EmailRenderer } from '@/utils/email/email.util';
import { ConfigService } from '@nestjs/config';
import { GlobalConfig } from '@/config/config.type';
import { UnreadChatDataDto } from './dto/chat-job.dto';

/**
 * Chat Queue Service
 * Handles business logic for chat background tasks
 * Used by cron jobs and consumers to process chat-related tasks
 */
@Injectable()
export class ChatQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly emailProducer: EmailProducer,
    private readonly configService: ConfigService<GlobalConfig>,
  ) {}

  /**
   * Find all users with unread messages and send digest emails
   * Called by the cron job at 8 PM PH time
   * @returns void
   */
  async sendUnreadDigestEmails(): Promise<void> {
    this.logger.log('Starting unread digest email job', 'ChatQueueService', {});

    try {
      // Find all chat members with unread messages
      const chatMembers = await this.prisma.chatMember.findMany({
        include: {
          chat: {
            include: {
              messages: {
                where: {
                  isDeleted: false,
                },
                include: {
                  readBy: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
                take: 1, // Get only the last unread message per chat
              },
            },
          },
        },
      });

      // Group by userId and filter out users with no unread messages
      const userUnreadMap = new Map<
        string,
        { userId: string; unreadChats: UnreadChatDataDto[] }
      >();

      for (const member of chatMembers) {
        // Filter messages that are not read by this specific user and not sent by them
        const unreadMessages = member.chat.messages.filter(
          (msg) =>
            !msg.readBy.some((read) => read.userId === member.userId) &&
            msg.senderId !== member.userId,
        );

        if (unreadMessages.length === 0) {
          continue;
        }

        // Count total unread messages for this user in this chat
        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: member.chatId,
            isDeleted: false,
            senderId: {
              not: member.userId,
            },
            readBy: {
              none: {
                userId: member.userId,
              },
            },
          },
        });

        if (unreadCount === 0) {
          continue;
        }

        const lastMessage = unreadMessages[0];

        if (!lastMessage) {
          continue;
        }

        if (!userUnreadMap.has(member.userId)) {
          userUnreadMap.set(member.userId, {
            userId: member.userId,
            unreadChats: [],
          });
        }

        userUnreadMap.get(member.userId)!.unreadChats.push({
          chatId: member.chatId,
          chatName: member.chat.name ?? 'Direct Chat',
          unreadCount,
          lastMessageContent: lastMessage.content,
          lastMessageSenderId: lastMessage.senderId,
        });
      }

      this.logger.log(
        `Found ${userUnreadMap.size} users with unread messages`,
        'ChatQueueService',
        {
          userCount: userUnreadMap.size,
        },
      );

      // Send digest email for each user
      for (const [userId, data] of userUnreadMap) {
        await this.sendDigestEmailForUser(userId, data.unreadChats);
      }

      this.logger.log('Completed unread digest email job', 'ChatQueueService', {
        emailsSent: userUnreadMap.size,
      });
    } catch (error) {
      this.logger.error(
        'Failed to send unread digest emails',
        'ChatQueueService',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      throw error;
    }
  }

  /**
   * Send unread digest email for a specific user
   * @param userId - Keycloak user ID
   * @param unreadChats - Array of chats with unread messages
   * @returns void
   */
  private async sendDigestEmailForUser(
    userId: string,
    unreadChats: UnreadChatDataDto[],
  ): Promise<void> {
    try {
      // Fetch user from database to get email and check notification preferences
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          emailNotificationsEnabled: true,
          firstName: true,
          subscription: true,
        },
      });

      // Skip if user not found, notifications disabled, or no subscription
      if (!user) {
        this.logger.warn(
          `User not found for unread digest: ${userId}`,
          'ChatQueueService',
        );
        return;
      }

      if (!user.subscription) {
        this.logger.log(
          `Skipping unread digest - no subscription for user: ${userId}`,
          'ChatQueueService',
        );
        return;
      }

      if (!user.emailNotificationsEnabled) {
        this.logger.log(
          `Skipping unread digest - notifications disabled for user: ${userId}`,
          'ChatQueueService',
        );
        return;
      }

      const totalUnreadCount = unreadChats.reduce(
        (sum, chat) => sum + chat.unreadCount,
        0,
      );

      // Render email template
      const html = await EmailRenderer.renderChatUnreadDigest({
        unreadChats,
        totalUnreadCount,
      });

      const defaultSender = this.configService.get('resend.sender', {
        infer: true,
      });

      // Publish email job to queue
      await this.emailProducer.publishSendEmail({
        userId,
        to: user.email,
        subject: `You have ${totalUnreadCount} unread message${totalUnreadCount > 1 ? 's' : ''}`,
        html,
        from: defaultSender,
      });

      this.logger.log(
        'Unread digest email queued for user',
        'ChatQueueService',
        {
          userId,
          email: user.email,
          unreadChatsCount: unreadChats.length,
          totalUnreadCount,
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to send digest email for user',
        'ChatQueueService',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
        },
      );
      // Don't throw - continue processing other users
    }
  }
}
