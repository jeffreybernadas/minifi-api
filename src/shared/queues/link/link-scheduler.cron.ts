import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/database/database.service';
import { LinkStatus, UserType } from '@/generated/prisma/client';
import { LoggerService } from '@/shared/logger/logger.service';

@Injectable()
export class LinkSchedulerCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
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

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
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

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
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
}
