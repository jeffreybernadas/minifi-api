import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TopLinkDataDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  shortCode: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiProperty()
  clicks: number;

  @ApiProperty()
  uniqueClicks: number;
}

export class TopCountryDataDto {
  @ApiProperty()
  country: string;

  @ApiProperty()
  clicks: number;
}

export class TopDeviceDataDto {
  @ApiProperty()
  device: string;

  @ApiProperty()
  clicks: number;

  @ApiProperty()
  percentage: number;
}

export class TopBrowserDataDto {
  @ApiProperty()
  browser: string;

  @ApiProperty()
  clicks: number;

  @ApiProperty()
  percentage: number;
}

export class TopOsDataDto {
  @ApiProperty()
  os: string;

  @ApiProperty()
  clicks: number;

  @ApiProperty()
  percentage: number;
}

export class TopReferrerDataDto {
  @ApiProperty()
  referrer: string;

  @ApiProperty()
  clicks: number;
}

export class ClicksByDateDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  count: number;
}

export class BestDayDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  clicks: number;
}

export class UserMonthlyAnalyticsDto {
  @ApiProperty()
  totalClicks: number;

  @ApiProperty()
  uniqueVisitors: number;

  @ApiProperty()
  totalActiveLinks: number;

  @ApiProperty()
  linksCreatedThisMonth: number;

  @ApiProperty()
  previousMonthClicks: number;

  @ApiProperty({ type: [TopLinkDataDto] })
  topLinks: TopLinkDataDto[];

  @ApiProperty({ type: [TopCountryDataDto] })
  topCountries: TopCountryDataDto[];

  @ApiProperty({ type: [TopDeviceDataDto] })
  topDevices: TopDeviceDataDto[];

  @ApiProperty({ type: [TopBrowserDataDto] })
  topBrowsers: TopBrowserDataDto[];

  @ApiProperty({ type: [TopOsDataDto] })
  topOs: TopOsDataDto[];

  @ApiProperty({ type: [TopReferrerDataDto] })
  topReferrers: TopReferrerDataDto[];

  @ApiPropertyOptional({ type: BestDayDto })
  bestDay?: BestDayDto;

  @ApiProperty({ type: [ClicksByDateDto] })
  clicksByDate: ClicksByDateDto[];
}
