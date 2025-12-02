import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/database.service';
import { LinkStatus, ScanStatus } from '@/generated/prisma/client';
import {
  AdminStatsDto,
  PlatformAnalyticsDto,
  SecurityOverviewDto,
  DailyStatDto,
  TopItemDto,
} from './dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminStatsDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalLinks,
      totalClicks,
      totalProUsers,
      activeLinks,
      blockedUsers,
      blockedLinks,
      usersLast30Days,
      usersPrev30Days,
      linksLast30Days,
      linksPrev30Days,
      clicksLast30Days,
      clicksPrev30Days,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.link.count(),
      this.prisma.link.aggregate({ _sum: { clickCount: true } }),
      this.prisma.user.count({ where: { userType: 'PRO' } }),
      this.prisma.link.count({
        where: { status: LinkStatus.ACTIVE, isArchived: false },
      }),
      this.prisma.user.count({ where: { isBlocked: true } }),
      this.prisma.link.count({ where: { status: LinkStatus.BLOCKED } }),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      this.prisma.link.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.link.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      this.prisma.linkAnalytics.count({
        where: { clickedAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.linkAnalytics.count({
        where: { clickedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]);

    const calcGrowth = (current: number, previous: number) => ({
      current,
      previous,
      percentage:
        previous === 0
          ? current > 0
            ? 100
            : 0
          : Math.round(((current - previous) / previous) * 100),
    });

    return {
      totalUsers,
      totalLinks,
      totalClicks: totalClicks._sum.clickCount ?? 0,
      totalProUsers,
      activeLinks,
      blockedUsers,
      blockedLinks,
      userGrowth: calcGrowth(usersLast30Days, usersPrev30Days),
      linkGrowth: calcGrowth(linksLast30Days, linksPrev30Days),
      clickGrowth: calcGrowth(clicksLast30Days, clicksPrev30Days),
    };
  }

  async getAnalytics(): Promise<PlatformAnalyticsDto> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      dailyUsersRaw,
      dailyLinksRaw,
      dailyClicksRaw,
      topCountriesRaw,
      topDevicesRaw,
      topBrowsersRaw,
      topReferrersRaw,
    ] = await Promise.all([
      this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
        FROM "User"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `,
      this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
        FROM "Link"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `,
      this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE("clickedAt") as date, COUNT(*)::bigint as count
        FROM "LinkAnalytics"
        WHERE "clickedAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("clickedAt")
        ORDER BY date DESC
      `,
      this.prisma.linkAnalytics.groupBy({
        by: ['country'],
        _count: { id: true },
        where: { country: { not: null }, clickedAt: { gte: thirtyDaysAgo } },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.linkAnalytics.groupBy({
        by: ['device'],
        _count: { id: true },
        where: { device: { not: null }, clickedAt: { gte: thirtyDaysAgo } },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.linkAnalytics.groupBy({
        by: ['browser'],
        _count: { id: true },
        where: { browser: { not: null }, clickedAt: { gte: thirtyDaysAgo } },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.linkAnalytics.groupBy({
        by: ['referrerDomain'],
        _count: { id: true },
        where: {
          referrerDomain: { not: null },
          clickedAt: { gte: thirtyDaysAgo },
        },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const mapDaily = (
      raw: Array<{ date: Date; count: bigint }>,
    ): DailyStatDto[] =>
      raw
        .filter((r) => r.date)
        .map((r) => ({
          date: r.date.toISOString().split('T')[0]!,
          count: Number(r.count),
        }));

    const mapTop = <T extends { _count: { id: number } }>(
      raw: T[],
      key: keyof T,
    ): TopItemDto[] =>
      raw.map((r) => ({
        name: String(r[key] ?? 'Unknown'),
        count: r._count.id,
      }));

    return {
      dailyUsers: mapDaily(dailyUsersRaw),
      dailyLinks: mapDaily(dailyLinksRaw),
      dailyClicks: mapDaily(dailyClicksRaw),
      topCountries: mapTop(topCountriesRaw, 'country'),
      topDevices: mapTop(topDevicesRaw, 'device'),
      topBrowsers: mapTop(topBrowsersRaw, 'browser'),
      topReferrers: mapTop(topReferrersRaw, 'referrerDomain'),
    };
  }

  async getSecurityOverview(): Promise<SecurityOverviewDto> {
    const [byStatusRaw, recentAlertsRaw] = await Promise.all([
      this.prisma.link.groupBy({
        by: ['scanStatus'],
        _count: { id: true },
      }),
      this.prisma.link.findMany({
        where: {
          scanStatus: {
            in: [
              ScanStatus.MALICIOUS,
              ScanStatus.SUSPICIOUS,
              ScanStatus.ADULT_CONTENT,
            ],
          },
        },
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
          scanStatus: true,
          scanScore: true,
          scannedAt: true,
          userId: true,
        },
        orderBy: { scannedAt: 'desc' },
        take: 50,
      }),
    ]);

    const byStatus = byStatusRaw.map((r) => ({
      status: r.scanStatus,
      count: r._count.id,
    }));

    const pendingScanCount =
      byStatus.find((s) => s.status === ScanStatus.PENDING)?.count ?? 0;
    const maliciousCount =
      byStatus.find((s) => s.status === ScanStatus.MALICIOUS)?.count ?? 0;
    const suspiciousCount =
      byStatus.find((s) => s.status === ScanStatus.SUSPICIOUS)?.count ?? 0;

    return {
      byStatus,
      pendingScanCount,
      maliciousCount,
      suspiciousCount,
      recentAlerts: recentAlertsRaw.map((r) => ({
        linkId: r.id,
        shortCode: r.shortCode,
        originalUrl: r.originalUrl,
        scanStatus: r.scanStatus,
        scanScore: r.scanScore,
        scannedAt: r.scannedAt,
        userId: r.userId,
      })),
    };
  }
}
