import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkAnalyticsResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() linkId: string;
  @ApiProperty() clickedAt: Date;

  @ApiPropertyOptional() ipAddress?: string;
  @ApiPropertyOptional() userAgent?: string;
  @ApiPropertyOptional() browser?: string;
  @ApiPropertyOptional() browserVersion?: string;
  @ApiPropertyOptional() os?: string;
  @ApiPropertyOptional() osVersion?: string;
  @ApiPropertyOptional() device?: string;

  @ApiPropertyOptional() country?: string;
  @ApiPropertyOptional() countryCode?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() region?: string;
  @ApiPropertyOptional() latitude?: number;
  @ApiPropertyOptional() longitude?: number;

  @ApiPropertyOptional() referrer?: string;
  @ApiPropertyOptional() utmSource?: string;
  @ApiPropertyOptional() utmMedium?: string;
  @ApiPropertyOptional() utmCampaign?: string;
  @ApiPropertyOptional() utmTerm?: string;
  @ApiPropertyOptional() utmContent?: string;
}

export class LinkAnalyticsSummaryDto {
  @ApiProperty() totalClicks: number;
  @ApiProperty() uniqueVisitors: number;

  @ApiProperty({ type: [Object], description: 'Clicks by date' })
  clicksByDate: Array<{ date: string; count: number }>;

  @ApiProperty({ type: [Object], description: 'Top countries' })
  topCountries: Array<{ country: string; count: number }>;

  @ApiProperty({ type: [Object], description: 'Top cities' })
  topCities: Array<{ city: string; count: number }>;

  @ApiProperty({ type: [Object], description: 'Top devices' })
  topDevices: Array<{ device: string; count: number }>;

  @ApiProperty({ type: [Object], description: 'Top browsers' })
  topBrowsers: Array<{ browser: string; count: number }>;

  @ApiProperty({ type: [Object], description: 'Top referrers' })
  topReferrers: Array<{ referrer: string; count: number }>;
}
