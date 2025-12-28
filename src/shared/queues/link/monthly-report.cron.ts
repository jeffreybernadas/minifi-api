import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/database.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { EmailProducer } from '@/shared/queues/email/email.producer';
import { EmailRenderer } from '@/utils/email/email.util';
import { GlobalConfig } from '@/config/config.type';
import { UserType } from '@/generated/prisma/client';
import { LinkService } from '@/modules/link/link.service';

/**
 * Monthly Report Cron Job
 * Runs on the 1st of each month at 9 AM PHT
 * - PRO users: Detailed analytics report
 * - FREE users: Basic stats with upgrade CTA
 */
@Injectable()
export class MonthlyReportCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly linkService: LinkService,
    private readonly emailProducer: EmailProducer,
    private readonly configService: ConfigService<GlobalConfig>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Monthly report - 1st of each month at 9 AM PHT
   */
  @Cron('0 9 1 * *', {
    name: 'monthly-report',
    timeZone: 'Asia/Manila',
  })
  async sendMonthlyReports(): Promise<void> {
    this.logger.log('Monthly report cron started', 'MonthlyReportCron', {
      time: new Date().toISOString(),
    });

    try {
      // Get previous month's date range
      const now = new Date();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
      );

      const monthName = lastMonthStart.toLocaleString('en-US', {
        month: 'long',
      });
      const year = lastMonthStart.getFullYear();

      const appUrl = this.configService.getOrThrow('app.frontendUrl', {
        infer: true,
      });
      const defaultSender = this.configService.getOrThrow('resend.sender', {
        infer: true,
      });

      let proReportsSent = 0;
      let freeReportsSent = 0;

      // ========== PRO USERS: Detailed Report ==========
      const proUsers = await this.prisma.user.findMany({
        where: {
          userType: UserType.PRO,
          emailNotificationsEnabled: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
        },
      });

      for (const user of proUsers) {
        try {
          const analytics = await this.linkService.getUserMonthlyAnalytics(
            user.id,
            lastMonthStart,
            lastMonthEnd,
          );

          let growthPercentage: number | undefined;
          if (analytics.previousMonthClicks > 0) {
            growthPercentage = Math.round(
              ((analytics.totalClicks - analytics.previousMonthClicks) /
                analytics.previousMonthClicks) *
                100,
            );
          } else if (analytics.totalClicks > 0) {
            growthPercentage = undefined;
          }

          const html = await EmailRenderer.renderMonthlyReport({
            baseUrl: appUrl,
            firstName: user.firstName ?? undefined,
            month: monthName,
            year,
            totalClicks: analytics.totalClicks,
            uniqueVisitors: analytics.uniqueVisitors,
            totalActiveLinks: analytics.totalActiveLinks,
            linksCreatedThisMonth: analytics.linksCreatedThisMonth,
            growthPercentage,
            topLinks: analytics.topLinks,
            topCountries: analytics.topCountries,
            topDevices: analytics.topDevices,
            topReferrers: analytics.topReferrers,
            bestDay: analytics.bestDay,
            dashboardUrl: `${appUrl}/dashboard/analytics/overview`,
          });

          await this.emailProducer.publishSendEmail({
            userId: user.id,
            to: user.email,
            subject: `📊 Your Minifi Report for ${monthName} ${year}`,
            html,
            from: defaultSender,
          });

          proReportsSent++;
        } catch (error) {
          this.logger.error(
            `Failed to send PRO monthly report to user: ${user.id}`,
            'MonthlyReportCron',
            { error: error instanceof Error ? error.message : 'Unknown error' },
          );
        }
      }

      // ========== FREE USERS: Basic Report with Upgrade CTA ==========
      const freeUsers = await this.prisma.user.findMany({
        where: {
          userType: UserType.FREE,
          emailNotificationsEnabled: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
        },
      });

      for (const user of freeUsers) {
        try {
          const analytics = await this.linkService.getUserMonthlyAnalytics(
            user.id,
            lastMonthStart,
            lastMonthEnd,
          );

          // Skip users with zero activity to avoid spammy emails
          if (
            analytics.totalClicks === 0 &&
            analytics.linksCreatedThisMonth === 0
          ) {
            continue;
          }

          const html = await EmailRenderer.renderFreeMonthlyReport({
            baseUrl: appUrl,
            firstName: user.firstName ?? undefined,
            month: monthName,
            year,
            totalClicks: analytics.totalClicks,
            uniqueVisitors: analytics.uniqueVisitors,
            totalActiveLinks: analytics.totalActiveLinks,
            linksCreatedThisMonth: analytics.linksCreatedThisMonth,
            upgradeUrl: `${appUrl}/dashboard/settings`,
            dashboardUrl: `${appUrl}/dashboard`,
          });

          await this.emailProducer.publishSendEmail({
            userId: user.id,
            to: user.email,
            subject: `📊 Your Minifi Report for ${monthName} ${year}`,
            html,
            from: defaultSender,
          });

          freeReportsSent++;
        } catch (error) {
          this.logger.error(
            `Failed to send FREE monthly report to user: ${user.id}`,
            'MonthlyReportCron',
            { error: error instanceof Error ? error.message : 'Unknown error' },
          );
        }
      }

      this.logger.log('Monthly reports sent', 'MonthlyReportCron', {
        proUsers: proUsers.length,
        proReportsSent,
        freeUsers: freeUsers.length,
        freeReportsSent,
        month: monthName,
        year,
      });
    } catch (error) {
      this.logger.error('Monthly report cron failed', 'MonthlyReportCron', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
