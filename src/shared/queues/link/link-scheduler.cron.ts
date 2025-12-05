import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/database.service';
import { LinkStatus, UserType } from '@/generated/prisma/client';
import { LoggerService } from '@/shared/logger/logger.service';
import { EmailProducer } from '@/shared/queues/email/email.producer';
import { EmailRenderer } from '@/utils/email/email.util';
import { GlobalConfig } from '@/config/config.type';
import { DeletingLinkData } from '@/common/interfaces/email.interface';

@Injectable()
export class LinkSchedulerCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly emailProducer: EmailProducer,
    private readonly configService: ConfigService<GlobalConfig>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async activateScheduledLinks(): Promise<void> {
    const now = new Date();
    const result = await this.prisma.link.updateMany({
      where: {
        status: LinkStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
      data: { status: LinkStatus.ACTIVE },
    });
    if (result.count > 0) {
      this.logger.log(
        `Activated ${result.count} scheduled links`,
        'LinkSchedulerCron',
        {
          count: result.count,
        },
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async disableExpiredLinks(): Promise<void> {
    const now = new Date();
    const result = await this.prisma.link.updateMany({
      where: {
        status: LinkStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      data: { status: LinkStatus.DISABLED, isArchived: true },
    });
    if (result.count > 0) {
      this.logger.log(
        `Disabled ${result.count} expired links`,
        'LinkSchedulerCron',
        {
          count: result.count,
        },
      );
    }
  }

  @Cron('0 3 * * *', {
    name: 'delete-expired-guest-links',
    timeZone: 'Asia/Manila',
  })
  async deleteExpiredGuestLinks(): Promise<void> {
    const now = new Date();
    const result = await this.prisma.link.deleteMany({
      where: {
        isGuest: true,
        expiresAt: { lte: now },
      },
    });
    if (result.count > 0) {
      this.logger.log(
        `Deleted ${result.count} expired guest links`,
        'LinkSchedulerCron',
        {
          count: result.count,
        },
      );
    }
  }

  @Cron('0 3 * * *', {
    name: 'delete-old-free-links',
    timeZone: 'Asia/Manila',
  })
  async deleteOldFreeLinks(): Promise<void> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const result = await this.prisma.link.deleteMany({
      where: {
        isGuest: false,
        userId: { not: null },
        user: { userType: UserType.FREE },
        createdAt: { lte: threeMonthsAgo },
      },
    });
    if (result.count > 0) {
      this.logger.log(
        `Deleted ${result.count} old FREE tier links`,
        'LinkSchedulerCron',
        {
          count: result.count,
        },
      );
    }
  }

  /**
   * Daily at 9 AM PHT - Warn FREE users about links being deleted in 7 days
   * Finds links created 83-89 days ago (will be deleted at 90 days)
   */
  @Cron('0 9 * * *', {
    name: 'free-link-deletion-warning',
    timeZone: 'Asia/Manila',
  })
  async sendFreeLinkDeletionWarnings(): Promise<void> {
    this.logger.log(
      'FREE link deletion warning cron started',
      'LinkSchedulerCron',
      { time: new Date().toISOString() },
    );

    try {
      const now = new Date();

      // Links created 83-89 days ago (will be deleted in 1-7 days)
      const warningStartDate = new Date();
      warningStartDate.setDate(warningStartDate.getDate() - 89); // 89 days ago = 1 day until deletion

      const warningEndDate = new Date();
      warningEndDate.setDate(warningEndDate.getDate() - 83); // 83 days ago = 7 days until deletion

      // Find FREE user links in the warning window
      const linksToWarn = await this.prisma.link.findMany({
        where: {
          isGuest: false,
          isArchived: false,
          userId: { not: null },
          user: {
            userType: UserType.FREE,
            emailNotificationsEnabled: true,
          },
          createdAt: {
            gte: warningStartDate,
            lte: warningEndDate,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
            },
          },
          _count: {
            select: { analytics: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (linksToWarn.length === 0) {
        this.logger.log(
          'No FREE user links in deletion warning window',
          'LinkSchedulerCron',
        );
        return;
      }

      // Group links by user
      const linksByUser = new Map<
        string,
        {
          email: string;
          firstName?: string;
          links: typeof linksToWarn;
        }
      >();

      for (const link of linksToWarn) {
        if (!link.user || !link.userId) continue;

        const existing = linksByUser.get(link.userId);
        if (existing) {
          existing.links.push(link);
        } else {
          linksByUser.set(link.userId, {
            email: link.user.email,
            firstName: link.user.firstName ?? undefined,
            links: [link],
          });
        }
      }

      const appUrl = this.configService.getOrThrow('app.url', { infer: true });
      const defaultSender = this.configService.getOrThrow('resend.sender', {
        infer: true,
      });

      let emailsSent = 0;

      // Send warning email to each user
      for (const [userId, userData] of linksByUser) {
        const deletingLinkData: DeletingLinkData[] = userData.links.map(
          (link) => {
            const createdAt = link.createdAt;
            const daysSinceCreation = Math.floor(
              (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
            );
            const daysUntilDeletion = 90 - daysSinceCreation;

            return {
              shortCode: link.shortCode,
              title: link.title ?? undefined,
              originalUrl: link.originalUrl,
              createdAt: createdAt,
              daysUntilDeletion: Math.max(0, daysUntilDeletion),
              totalClicks: link._count.analytics,
            };
          },
        );

        const html = await EmailRenderer.renderLinkDeletionWarning({
          firstName: userData.firstName,
          deletingLinks: deletingLinkData,
          totalCount: deletingLinkData.length,
          upgradeUrl: `${appUrl}/pricing`,
          dashboardUrl: `${appUrl}/dashboard/links`,
        });

        await this.emailProducer.publishSendEmail({
          userId,
          to: userData.email,
          subject:
            deletingLinkData.length === 1
              ? `Your link will be deleted in ${deletingLinkData[0]?.daysUntilDeletion} days`
              : `${deletingLinkData.length} links will be deleted soon`,
          html,
          from: defaultSender,
        });

        emailsSent++;
      }

      this.logger.log('FREE link deletion warnings sent', 'LinkSchedulerCron', {
        totalLinksWarned: linksToWarn.length,
        usersNotified: emailsSent,
      });
    } catch (error) {
      this.logger.error(
        'FREE link deletion warning cron failed',
        'LinkSchedulerCron',
        { error: error instanceof Error ? error.message : 'Unknown error' },
      );
    }
  }
}
