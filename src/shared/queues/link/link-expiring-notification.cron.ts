import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/database.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { EmailProducer } from '@/shared/queues/email/email.producer';
import { EmailRenderer } from '@/utils/email/email.util';
import { GlobalConfig } from '@/config/config.type';
import { LinkStatus } from '@/generated/prisma/client';
import { ExpiringLinkData } from '@/common/interfaces/email.interface';

/**
 * Link Expiring Notification Cron Job
 * Runs daily at 9 AM PHT to warn users about expiring links
 */
@Injectable()
export class LinkExpiringNotificationCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProducer: EmailProducer,
    private readonly configService: ConfigService<GlobalConfig>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Daily at 9 AM PHT - Send expiring link warnings
   * Finds links expiring in the next 3 days and notifies their owners
   */
  @Cron('0 9 * * *', {
    name: 'link-expiring-notification',
    timeZone: 'Asia/Manila',
  })
  async sendExpiringLinkNotifications(): Promise<void> {
    this.logger.log(
      'Link expiring notification cron started',
      'LinkExpiringNotificationCron',
      { time: new Date().toISOString() },
    );

    try {
      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Find all active links expiring in the next 3 days, grouped by user
      const expiringLinks = await this.prisma.link.findMany({
        where: {
          status: LinkStatus.ACTIVE,
          isArchived: false,
          isGuest: false,
          userId: { not: null },
          expiresAt: {
            gte: now,
            lte: threeDaysFromNow,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              emailNotificationsEnabled: true,
            },
          },
        },
        orderBy: { expiresAt: 'asc' },
      });

      if (expiringLinks.length === 0) {
        this.logger.log(
          'No expiring links found',
          'LinkExpiringNotificationCron',
        );
        return;
      }

      // Group links by user
      const linksByUser = new Map<
        string,
        {
          email: string;
          links: typeof expiringLinks;
        }
      >();

      for (const link of expiringLinks) {
        if (!link.user || !link.userId) continue;

        // Skip users who opted out
        if (!link.user.emailNotificationsEnabled) continue;

        const existing = linksByUser.get(link.userId);
        if (existing) {
          existing.links.push(link);
        } else {
          linksByUser.set(link.userId, {
            email: link.user.email,
            links: [link],
          });
        }
      }

      const dashboardUrl = this.configService.getOrThrow('app.frontendUrl', {
        infer: true,
      });

      const defaultSender = this.configService.getOrThrow('resend.sender', {
        infer: true,
      });

      let emailsSent = 0;

      // Send email to each user
      for (const [userId, userData] of linksByUser) {
        const expiringLinkData: ExpiringLinkData[] = userData.links.map(
          (link) => {
            const expiresAt = link.expiresAt!;
            const daysRemaining = Math.ceil(
              (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );

            return {
              shortCode: link.shortCode,
              title: link.title ?? undefined,
              originalUrl: link.originalUrl,
              expiresAt: expiresAt,
              daysRemaining: Math.max(0, daysRemaining),
            };
          },
        );

        const html = await EmailRenderer.renderLinkExpiring({
          baseUrl: dashboardUrl,
          expiringLinks: expiringLinkData,
          totalCount: expiringLinkData.length,
          dashboardUrl: `${dashboardUrl}/dashboard`,
        });

        await this.emailProducer.publishSendEmail({
          userId,
          to: userData.email,
          subject:
            expiringLinkData.length === 1
              ? `⏰ Your link expires in ${expiringLinkData[0]?.daysRemaining} days`
              : `⏰ ${expiringLinkData.length} links expiring soon`,
          html,
          from: defaultSender,
        });

        emailsSent++;
      }

      this.logger.log(
        'Link expiring notifications sent',
        'LinkExpiringNotificationCron',
        {
          totalExpiringLinks: expiringLinks.length,
          usersNotified: emailsSent,
        },
      );
    } catch (error) {
      this.logger.error(
        'Link expiring notification cron failed',
        'LinkExpiringNotificationCron',
        { error: error instanceof Error ? error.message : 'Unknown error' },
      );
    }
  }
}
