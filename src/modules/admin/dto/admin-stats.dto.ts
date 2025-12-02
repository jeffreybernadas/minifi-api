import { ApiProperty } from '@nestjs/swagger';

export class GrowthDataDto {
  @ApiProperty({ description: 'Current period value' })
  current: number;

  @ApiProperty({ description: 'Previous period value' })
  previous: number;

  @ApiProperty({ description: 'Growth percentage' })
  percentage: number;
}

export class AdminStatsDto {
  @ApiProperty({ description: 'Total registered users' })
  totalUsers: number;

  @ApiProperty({ description: 'Total links created' })
  totalLinks: number;

  @ApiProperty({ description: 'Total clicks across all links' })
  totalClicks: number;

  @ApiProperty({ description: 'Total PRO subscribers' })
  totalProUsers: number;

  @ApiProperty({ description: 'Active links count' })
  activeLinks: number;

  @ApiProperty({ description: 'Blocked users count' })
  blockedUsers: number;

  @ApiProperty({ description: 'Blocked links count' })
  blockedLinks: number;

  @ApiProperty({
    description: 'Users registered in last 30 days',
    type: GrowthDataDto,
  })
  userGrowth: GrowthDataDto;

  @ApiProperty({
    description: 'Links created in last 30 days',
    type: GrowthDataDto,
  })
  linkGrowth: GrowthDataDto;

  @ApiProperty({ description: 'Clicks in last 30 days', type: GrowthDataDto })
  clickGrowth: GrowthDataDto;
}

export class DailyStatDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
  date: string;

  @ApiProperty({ description: 'Count for this date' })
  count: number;
}

export class TopItemDto {
  @ApiProperty({ description: 'Item name or identifier' })
  name: string;

  @ApiProperty({ description: 'Count or value' })
  count: number;
}

export class PlatformAnalyticsDto {
  @ApiProperty({
    description: 'Daily user registrations (last 30 days)',
    type: [DailyStatDto],
  })
  dailyUsers: DailyStatDto[];

  @ApiProperty({
    description: 'Daily link creations (last 30 days)',
    type: [DailyStatDto],
  })
  dailyLinks: DailyStatDto[];

  @ApiProperty({
    description: 'Daily clicks (last 30 days)',
    type: [DailyStatDto],
  })
  dailyClicks: DailyStatDto[];

  @ApiProperty({
    description: 'Top 10 countries by clicks',
    type: [TopItemDto],
  })
  topCountries: TopItemDto[];

  @ApiProperty({ description: 'Top 10 devices', type: [TopItemDto] })
  topDevices: TopItemDto[];

  @ApiProperty({ description: 'Top 10 browsers', type: [TopItemDto] })
  topBrowsers: TopItemDto[];

  @ApiProperty({ description: 'Top 10 referrer domains', type: [TopItemDto] })
  topReferrers: TopItemDto[];
}

export class SecurityStatDto {
  @ApiProperty({ description: 'Security status' })
  status: string;

  @ApiProperty({ description: 'Count of links with this status' })
  count: number;
}

export class RecentAlertDto {
  @ApiProperty({ description: 'Link ID' })
  linkId: string;

  @ApiProperty({ description: 'Short code' })
  shortCode: string;

  @ApiProperty({ description: 'Original URL' })
  originalUrl: string;

  @ApiProperty({ description: 'Security status' })
  scanStatus: string;

  @ApiProperty({ description: 'Security score', nullable: true })
  scanScore: number | null;

  @ApiProperty({ description: 'When the scan was performed', nullable: true })
  scannedAt: Date | null;

  @ApiProperty({ description: 'Owner user ID', nullable: true })
  userId: string | null;
}

export class SecurityOverviewDto {
  @ApiProperty({
    description: 'Links by security status',
    type: [SecurityStatDto],
  })
  byStatus: SecurityStatDto[];

  @ApiProperty({ description: 'Links pending scan' })
  pendingScanCount: number;

  @ApiProperty({ description: 'Malicious links count' })
  maliciousCount: number;

  @ApiProperty({ description: 'Suspicious links count' })
  suspiciousCount: number;

  @ApiProperty({
    description: 'Recent security alerts (last 50)',
    type: [RecentAlertDto],
  })
  recentAlerts: RecentAlertDto[];
}
