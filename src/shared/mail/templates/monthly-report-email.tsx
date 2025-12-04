import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { MonthlyReportEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

const LOGO_URL = 'https://cdn-icons-png.flaticon.com/128/7347/7347153.png';

/**
 * Monthly Report Email Template
 * Sent to PRO users on the 1st of each month with analytics summary
 */
export const MonthlyReportEmailTemplate = (props: MonthlyReportEmailProps) => {
  const {
    firstName,
    month,
    year,
    totalClicks,
    uniqueVisitors,
    totalActiveLinks,
    linksCreatedThisMonth,
    growthPercentage,
    topLinks,
    topCountries,
    topDevices,
    topReferrers,
    bestDay,
    dashboardUrl,
  } = props;

  const previewText = `Your Minifi Report for ${month || 'Month'} ${year?.toString() || new Date().getFullYear().toString()}`;

  const formatGrowth = (growth?: number) => {
    if (growth === undefined) return null;
    if (growth === 0) return '0%';
    const sign = growth > 0 ? '+' : '';
    return `${sign}${growth.toFixed(0)}%`;
  };

  const growthColor =
    growthPercentage !== undefined && growthPercentage > 0
      ? 'text-green-600'
      : growthPercentage !== undefined && growthPercentage < 0
        ? 'text-red-600'
        : 'text-[#666666]';

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{previewText}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={LOGO_URL}
                width="40"
                height="37"
                alt="Minifi"
                className="mx-auto my-0"
              />
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              Your {month || 'Month'} {year || new Date().getFullYear()} Report
            </Heading>

            <Text className="text-[14px] text-black leading-[24px]">
              {firstName ? `Hey ${firstName},` : 'Hey there,'} here's how your
              links performed last month.
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            {/* Summary Stats */}
            <Section className="my-[20px]">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td className="text-center p-[16px] bg-[#f7fafc] rounded-lg w-1/2">
                      <Text className="text-[24px] font-bold text-blue-600 mb-[4px]">
                        {totalClicks?.toLocaleString() || '0'}
                      </Text>
                      <Text className="text-[12px] text-[#666666] uppercase tracking-wide">
                        Total Clicks
                      </Text>
                    </td>
                    <td className="text-center p-[16px] bg-[#f7fafc] rounded-lg w-1/2">
                      <Text className="text-[24px] font-bold text-blue-600 mb-[4px]">
                        {uniqueVisitors?.toLocaleString() || '0'}
                      </Text>
                      <Text className="text-[12px] text-[#666666] uppercase tracking-wide">
                        Unique Visitors
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-center p-[16px] bg-[#f7fafc] rounded-lg w-1/2">
                      <Text className="text-[24px] font-bold text-blue-600 mb-[4px]">
                        {totalActiveLinks || 0}
                      </Text>
                      <Text className="text-[12px] text-[#666666] uppercase tracking-wide">
                        Active Links
                      </Text>
                    </td>
                    <td className="text-center p-[16px] bg-[#f7fafc] rounded-lg w-1/2">
                      <Text className="text-[24px] font-bold text-blue-600 mb-[4px]">
                        {linksCreatedThisMonth || 0}
                      </Text>
                      <Text className="text-[12px] text-[#666666] uppercase tracking-wide">
                        New Links
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Growth Indicator */}
            {growthPercentage !== undefined && (
              <Section className="text-center mt-[12px]">
                <Text className={`text-[16px] font-semibold ${growthColor}`}>
                  {formatGrowth(growthPercentage)} vs last month
                </Text>
              </Section>
            )}

            {/* Best Day */}
            {bestDay && (
              <Section className="text-center mt-[16px] bg-amber-50 p-[12px] rounded-lg">
                <Text className="text-[14px] text-amber-800 m-0">
                  🏆 Best day: <strong>{bestDay.date || 'N/A'}</strong> with{' '}
                  <strong>{bestDay.clicks?.toLocaleString() || '0'}</strong>{' '}
                  clicks
                </Text>
              </Section>
            )}

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            {/* Top Links */}
            {topLinks && topLinks.length > 0 && (
              <Section className="mb-[16px]">
                <Text className="text-[14px] text-black leading-[24px] font-semibold">
                  🔗 Top Performing Links
                </Text>
                {topLinks.slice(0, 5).map((link, index) => (
                  <Section
                    key={link.shortCode}
                    className="py-[10px] border-b border-[#eaeaea]"
                  >
                    <Text className="text-[14px] text-blue-600 font-bold m-0">
                      #{index + 1}
                    </Text>
                    <Text className="text-[14px] text-black font-semibold m-0">
                      {link.title || link.shortCode}
                    </Text>
                    <Text className="text-[12px] text-[#666666] m-0">
                      minifi.link/{link.shortCode} •{' '}
                      {link.clicks?.toLocaleString() || '0'} clicks
                    </Text>
                  </Section>
                ))}
              </Section>
            )}

            {/* Top Countries */}
            {topCountries && topCountries.length > 0 && (
              <>
                <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />
                <Section className="mb-[16px]">
                  <Text className="text-[14px] text-black leading-[24px] font-semibold">
                    🌍 Top Countries
                  </Text>
                  <Text className="text-[14px] text-black leading-[24px]">
                    {topCountries
                      .slice(0, 5)
                      .map(
                        (c) =>
                          `${c.country || 'Unknown'} (${c.clicks?.toLocaleString() || '0'})`,
                      )
                      .join(' • ')}
                  </Text>
                </Section>
              </>
            )}

            {/* Device Breakdown */}
            {topDevices && topDevices.length > 0 && (
              <>
                <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />
                <Section className="mb-[16px]">
                  <Text className="text-[14px] text-black leading-[24px] font-semibold">
                    📱 Device Breakdown
                  </Text>
                  {topDevices.map((d) => (
                    <Text
                      key={d.device}
                      className="text-[14px] text-black leading-[24px]"
                    >
                      {d.device === 'mobile'
                        ? '📱'
                        : d.device === 'tablet'
                          ? '📟'
                          : '💻'}{' '}
                      {d.device.charAt(0).toUpperCase() + d.device.slice(1)}:{' '}
                      {d.percentage}%
                    </Text>
                  ))}
                </Section>
              </>
            )}

            {/* Top Referrers */}
            {topReferrers && topReferrers.length > 0 && (
              <>
                <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />
                <Section className="mb-[16px]">
                  <Text className="text-[14px] text-black leading-[24px] font-semibold">
                    🔀 Top Traffic Sources
                  </Text>
                  <Text className="text-[14px] text-black leading-[24px]">
                    {topReferrers
                      .slice(0, 5)
                      .map(
                        (r) => `${r.referrer} (${r.clicks.toLocaleString()})`,
                      )
                      .join(' • ')}
                  </Text>
                </Section>
              </>
            )}

            {/* Empty State */}
            {(!topLinks || topLinks.length === 0) && (
              <Section className="text-center py-[30px]">
                <Text className="text-[15px] text-[#666666]">
                  No link activity this month. Create some links to start
                  tracking!
                </Text>
              </Section>
            )}

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-blue-600 px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={dashboardUrl}
              >
                View Full Analytics
              </Button>
            </Section>

            <Text className="text-[14px] text-black leading-[24px]">
              This report is sent monthly to PRO subscribers. Manage your email
              preferences in your dashboard settings.
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Section>
              <Img
                src={LOGO_URL}
                width="24"
                height="24"
                alt="Minifi"
                className="my-0"
              />
              <Text className="text-[#666666] text-[12px] leading-[20px] mt-[16px]">
                Minifi - Links made simple.
              </Text>
              <Text className="text-[#999999] text-[11px] leading-[16px] mt-[8px]">
                © {new Date().getFullYear()} Minifi. All rights reserved.
              </Text>
              <Text className="text-[#999999] text-[11px] leading-[16px]">
                <Link
                  href="https://minifi.link"
                  className="text-[#666666] underline"
                >
                  minifi.link
                </Link>{' '}
                &bull;{' '}
                <Link
                  href="https://minifi.link/privacy"
                  className="text-[#666666] underline"
                >
                  Privacy
                </Link>{' '}
                &bull;{' '}
                <Link
                  href="https://minifi.link/terms"
                  className="text-[#666666] underline"
                >
                  Terms
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

MonthlyReportEmailTemplate.PreviewProps = {
  firstName: 'Sarah',
  month: 'November',
  year: 2025,
  totalClicks: 5432,
  uniqueVisitors: 3210,
  totalActiveLinks: 25,
  linksCreatedThisMonth: 8,
  growthPercentage: 15,
  topLinks: [
    {
      shortCode: 'abc1234',
      title: 'Product Launch',
      clicks: 1234,
      uniqueClicks: 856,
    },
    {
      shortCode: 'xyz5678',
      title: 'Blog Post',
      clicks: 890,
      uniqueClicks: 654,
    },
    { shortCode: 'def9012', clicks: 567, uniqueClicks: 432 },
  ],
  topCountries: [
    { country: 'United States', clicks: 2345 },
    { country: 'United Kingdom', clicks: 1234 },
    { country: 'Canada', clicks: 567 },
  ],
  topDevices: [
    { device: 'mobile', clicks: 3200, percentage: 59 },
    { device: 'desktop', clicks: 1800, percentage: 33 },
    { device: 'tablet', clicks: 432, percentage: 8 },
  ],
  topReferrers: [
    { referrer: 'Twitter', clicks: 1234 },
    { referrer: 'Direct', clicks: 890 },
    { referrer: 'Email', clicks: 567 },
  ],
  bestDay: { date: 'November 15', clicks: 456 },
  dashboardUrl: 'https://minifi.link/dashboard/analytics',
} as MonthlyReportEmailProps;

export default MonthlyReportEmailTemplate;
