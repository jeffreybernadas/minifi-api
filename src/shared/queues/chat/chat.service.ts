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
      // Find all chat members with their chats and last message
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
                take: 1,
              },
            },
          },
        },
      });

      // First pass: identify all (chatId, userId) pairs with potential unread messages
      const potentialUnreadPairs: Array<{
        chatId: string;
        userId: string;
        chatName: string;
        lastMessage: (typeof chatMembers)[0]['chat']['messages'][0];
      }> = [];

      for (const member of chatMembers) {
        const unreadMessages = member.chat.messages.filter(
          (msg) =>
            !msg.readBy.some((read) => read.userId === member.userId) &&
            msg.senderId !== member.userId,
        );

        if (unreadMessages.length > 0 && unreadMessages[0]) {
          potentialUnreadPairs.push({
            chatId: member.chatId,
            userId: member.userId,
            chatName: member.chat.name ?? 'Direct Chat',
            lastMessage: unreadMessages[0],
          });
        }
      }

      if (potentialUnreadPairs.length === 0) {
        this.logger.log(
          'No users with unread messages found',
          'ChatQueueService',
        );
        return;
      }

      // Batch query: get all unread counts in a single raw query
      // This avoids N+1 queries for admins with many chats
      const unreadCountsRaw = await this.prisma.$queryRaw<
        Array<{ chat_id: string; user_id: string; unread_count: bigint }>
      >`
        SELECT
          m."chatId" as chat_id,
          cm."userId" as user_id,
          COUNT(m.id) as unread_count
        FROM "Message" m
        INNER JOIN "ChatMember" cm ON cm."chatId" = m."chatId"
        WHERE m."isDeleted" = false
          AND m."senderId" != cm."userId"
          AND NOT EXISTS (
            SELECT 1 FROM "MessageRead" mr
            WHERE mr."messageId" = m.id AND mr."userId" = cm."userId"
          )
        GROUP BY m."chatId", cm."userId"
        HAVING COUNT(m.id) > 0
      `;

      // Build a lookup map for quick access
      const unreadCountMap = new Map<string, number>();
      for (const row of unreadCountsRaw) {
        const key = `${row.chat_id}:${row.user_id}`;
        unreadCountMap.set(key, Number(row.unread_count));
      }

      // Build userUnreadMap using pre-fetched counts
      const userUnreadMap = new Map<
        string,
        { userId: string; unreadChats: UnreadChatDataDto[] }
      >();

      for (const pair of potentialUnreadPairs) {
        const key = `${pair.chatId}:${pair.userId}`;
        const unreadCount = unreadCountMap.get(key) ?? 0;

        if (unreadCount === 0) {
          continue;
        }

        if (!userUnreadMap.has(pair.userId)) {
          userUnreadMap.set(pair.userId, {
            userId: pair.userId,
            unreadChats: [],
          });
        }

        userUnreadMap.get(pair.userId)!.unreadChats.push({
          chatId: pair.chatId,
          chatName: pair.chatName,
          unreadCount,
          lastMessageContent: pair.lastMessage.content,
          lastMessageSenderId: pair.lastMessage.senderId,
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
      // Fetch user from database to get email, subscription tier, and notification preferences
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          emailNotificationsEnabled: true,
          firstName: true,
          subscription: {
            select: { tier: true },
          },
        },
      });

      // Skip if user not found or notifications disabled
      if (!user) {
        this.logger.warn(
          `User not found for unread digest: ${userId}`,
          'ChatQueueService',
        );
        return;
      }

      // Skip if user is not PRO (chat is PRO-only feature)
      // This handles users who downgraded but still have old unread messages
      if (user.subscription?.tier !== 'PRO') {
        this.logger.log(
          `Skipping unread digest - user is not PRO: ${userId}`,
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

      const baseUrl = this.configService.getOrThrow('app.frontendUrl', {
        infer: true,
      });

      // Render email template
      const html = await EmailRenderer.renderChatUnreadDigest({
        baseUrl: baseUrl ?? '',
        unreadChats,
        totalUnreadCount,
      });

      const defaultSender = this.configService.getOrThrow('resend.sender', {
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
