export interface TestEmailTemplateProps {
  name?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface UnreadChatData {
  chatId: string;
  chatName: string;
  unreadCount: number;
  lastMessageContent: string;
  lastMessageSenderId: string;
}

export interface ChatUnreadDigestProps {
  unreadChats: UnreadChatData[];
  totalUnreadCount: number;
}

export interface SecurityAlertEmailProps {
  originalUrl: string;
  shortCode: string;
  status: string;
  score?: number;
  threats: string[];
  reasoning?: string;
  recommendations?: string;
  scannedAt?: Date | string;
}

export interface ExpiringLinkData {
  shortCode: string;
  title?: string;
  originalUrl: string;
  expiresAt: Date | string;
  daysRemaining: number;
}

export interface LinkExpiringEmailProps {
  expiringLinks: ExpiringLinkData[];
  totalCount: number;
  dashboardUrl: string;
}

export interface WelcomeEmailProps {
  firstName?: string;
  dashboardUrl: string;
}

export interface TopLinkData {
  shortCode: string;
  title?: string;
  clicks: number;
  uniqueClicks: number;
}

export interface TopCountryData {
  country: string;
  clicks: number;
}

export interface TopDeviceData {
  device: string;
  clicks: number;
  percentage: number;
}

export interface TopReferrerData {
  referrer: string;
  clicks: number;
}

export interface MonthlyReportEmailProps {
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
  topDevices: TopDeviceData[];
  topReferrers: TopReferrerData[];
  bestDay?: { date: string; clicks: number };
}

export interface SubscriptionEmailProps {
  firstName?: string;
  action: 'upgraded' | 'cancelled' | 'renewing';
  tier: 'FREE' | 'PRO';
  periodEnd?: Date | string;
  dashboardUrl: string;
}
