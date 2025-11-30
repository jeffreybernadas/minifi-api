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
 * Runs on the 1st of each month at 10 AM UTC
 * Sends analytics report to PRO users
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
   * Monthly report - 1st of each month at 10 AM UTC
   */
  @Cron('0 10 1 * *', {
    name: 'monthly-report',
    timeZone: 'UTC',
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

      // Get all PRO users with email notifications enabled
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

      if (proUsers.length === 0) {
        this.logger.log('No PRO users to send reports to', 'MonthlyReportCron');
        return;
      }

      const dashboardUrl = this.configService.getOrThrow('app.url', {
        infer: true,
      });
      const defaultSender = this.configService.getOrThrow('resend.sender', {
        infer: true,
      });

      let reportsSent = 0;

      for (const user of proUsers) {
        try {
          // Get user's monthly analytics via service
          const analytics = await this.linkService.getUserMonthlyAnalytics(
            user.id,
            lastMonthStart,
            lastMonthEnd,
          );

          // Calculate growth percentage
          let growthPercentage: number | undefined;
          if (analytics.previousMonthClicks > 0) {
            growthPercentage = Math.round(
              ((analytics.totalClicks - analytics.previousMonthClicks) /
                analytics.previousMonthClicks) *
                100,
            );
          } else if (analytics.totalClicks > 0) {
            // First month with activity - no comparison available
            growthPercentage = undefined;
          }

          const html = await EmailRenderer.renderMonthlyReport({
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
            dashboardUrl: `${dashboardUrl}/dashboard/analytics`,
          });

          await this.emailProducer.publishSendEmail({
            userId: user.id,
            to: user.email,
            subject: `📊 Your Minifi Report for ${monthName} ${year}`,
            html,
            from: defaultSender,
          });

          reportsSent++;
        } catch (error) {
          this.logger.error(
            `Failed to send monthly report to user: ${user.id}`,
            'MonthlyReportCron',
            { error: error instanceof Error ? error.message : 'Unknown error' },
          );
        }
      }

      this.logger.log('Monthly reports sent', 'MonthlyReportCron', {
        totalProUsers: proUsers.length,
        reportsSent,
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
