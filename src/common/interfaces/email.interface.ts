import { UnreadChatDataDto } from '@/shared/queues/chat/dto/chat-job.dto';

/**
 * Base props shared by all email templates
 */
export interface BaseEmailProps {
  baseUrl: string;
}

export interface TestEmailTemplateProps extends BaseEmailProps {
  name?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface ChatUnreadDigestProps extends BaseEmailProps {
  unreadChats: UnreadChatDataDto[];
  totalUnreadCount: number;
}

export interface SecurityAlertEmailProps extends BaseEmailProps {
  originalUrl: string;
  shortCode?: string | null; // Nullable when customAlias is used
  status: string;
  score?: number;
  threats: string[];
  reasoning?: string;
  recommendations?: string;
  scannedAt?: Date | string;
}

export interface ExpiringLinkData {
  shortCode?: string | null; // Nullable when customAlias is used
  title?: string;
  originalUrl: string;
  expiresAt: Date | string;
  daysRemaining: number;
}

export interface LinkExpiringEmailProps extends BaseEmailProps {
  expiringLinks: ExpiringLinkData[];
  totalCount: number;
  dashboardUrl: string;
}

export interface WelcomeEmailProps extends BaseEmailProps {
  firstName?: string;
  dashboardUrl: string;
}

export interface TopLinkData {
  id: string;
  shortCode?: string | null; // Nullable when customAlias is used
  title?: string;
  clicks: number;
  uniqueClicks: number;
}

export interface TopCountryData {
  country: string;
  clicks: number;
}

export interface TopCityData {
  city: string;
  clicks: number;
}

export interface TopDeviceData {
  device: string;
  clicks: number;
  percentage: number;
}

export interface TopBrowserData {
  browser: string;
  clicks: number;
  percentage: number;
}

export interface TopOSData {
  os: string;
  clicks: number;
  percentage: number;
}

export interface TopReferrerData {
  referrer: string;
  clicks: number;
}

export interface ClicksByDateData {
  date: string;
  count: number;
}

export interface MonthlyReportEmailProps extends BaseEmailProps {
  firstName?: string;
  month: string;
  year: number;
  // Summary stats
  totalClicks: number;
  uniqueVisitors: number;
  totalActiveLinks: number;
  linksCreatedThisMonth: number;
  // Growth
  growthPercentage?: number; // vs previous month, undefined if first month
  // Top performers
  topLinks: TopLinkData[];
  topCountries: TopCountryData[];
  topDevices: TopDeviceData[];
  topReferrers: TopReferrerData[];
  // Best day
  bestDay?: { date: string; clicks: number };
  dashboardUrl: string;
}

/**
 * User monthly analytics result from LinkService
 */
export interface UserMonthlyAnalytics {
  totalClicks: number;
  uniqueVisitors: number;
  totalActiveLinks: number;
  linksCreatedThisMonth: number;
  previousMonthClicks: number;
  topLinks: TopLinkData[];
  topCountries: TopCountryData[];
  topCities: TopCityData[];
  topDevices: TopDeviceData[];
  topBrowsers: TopBrowserData[];
  topOs: TopOSData[];
  topReferrers: TopReferrerData[];
  bestDay?: { date: string; clicks: number };
  clicksByDate: ClicksByDateData[];
}

export interface SubscriptionEmailProps extends BaseEmailProps {
  firstName?: string;
  action: 'upgraded' | 'cancelled' | 'renewing';
  tier: 'FREE' | 'PRO';
  periodEnd?: Date | string;
  dashboardUrl: string;
}

/**
 * Link scheduled for deletion data
 */
export interface DeletingLinkData {
  shortCode?: string | null; // Nullable when customAlias is used
  title?: string;
  originalUrl: string;
  createdAt: Date | string;
  daysUntilDeletion: number;
  totalClicks: number;
}

/**
 * FREE user link deletion warning email props
 */
export interface LinkDeletionWarningEmailProps extends BaseEmailProps {
  firstName?: string;
  deletingLinks: DeletingLinkData[];
  totalCount: number;
  upgradeUrl: string;
  dashboardUrl: string;
}

/**
 * FREE user simplified monthly report email props
 */
export interface FreeMonthlyReportEmailProps extends BaseEmailProps {
  firstName?: string;
  month: string;
  year: number;
  totalClicks: number;
  uniqueVisitors: number;
  totalActiveLinks: number;
  linksCreatedThisMonth: number;
  upgradeUrl: string;
  dashboardUrl: string;
}
