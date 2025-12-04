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
import { FreeMonthlyReportEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

const LOGO_URL = 'https://cdn-icons-png.flaticon.com/128/7347/7347153.png';

/**
 * FREE User Monthly Report Email Template
 * Simplified stats with upgrade CTA
 */
export const FreeMonthlyReportEmailTemplate = (
  props: FreeMonthlyReportEmailProps,
) => {
  const {
    firstName,
    month,
    year,
    totalClicks,
    uniqueVisitors,
    totalActiveLinks,
    linksCreatedThisMonth,
    upgradeUrl,
    dashboardUrl,
  } = props;

  const previewText = `Your Minifi Report for ${month} ${year?.toString() || new Date().getFullYear().toString()}`;

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
              Your {month} {year} Report
            </Heading>

            <Text className="text-[14px] text-black leading-[24px]">
              {firstName ? `Hey ${firstName},` : 'Hey there,'} here's a quick
              snapshot of your link performance last month.
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

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            {/* Upgrade CTA */}
            <Section className="bg-blue-50 border border-blue-600 rounded-lg p-[24px] text-center">
              <Text className="text-[18px] font-bold text-blue-700 m-0 mb-[8px]">
                Want More Insights?
              </Text>
              <Text className="text-[15px] text-blue-600 m-0 mb-[16px]">
                Upgrade to PRO to unlock:
              </Text>
              <Text className="text-[14px] text-blue-600 leading-[24px] m-0">
                📍 Geographic breakdown by country
              </Text>
              <Text className="text-[14px] text-blue-600 leading-[24px] m-0">
                📱 Device & browser analytics
              </Text>
              <Text className="text-[14px] text-blue-600 leading-[24px] m-0">
                🔗 Top performing links
              </Text>
              <Text className="text-[14px] text-blue-600 leading-[24px] m-0">
                🔀 Traffic source analysis
              </Text>
              <Text className="text-[14px] text-blue-600 leading-[24px] m-0">
                📈 Month-over-month growth
              </Text>
              <Text className="text-[14px] text-blue-600 leading-[24px] m-0 mb-[20px]">
                ♾️ Unlimited links
              </Text>
              <Button
                className="rounded bg-blue-600 px-8 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={upgradeUrl}
              >
                Upgrade to PRO
              </Button>
            </Section>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#666666] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={dashboardUrl}
              >
                View Dashboard
              </Button>
            </Section>

            <Text className="text-[14px] text-black leading-[24px]">
              This is a basic report for FREE tier users. Upgrade to PRO for
              detailed analytics and insights.
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

FreeMonthlyReportEmailTemplate.PreviewProps = {
  firstName: 'Sarah',
  month: 'November',
  year: 2025,
  totalClicks: 1234,
  uniqueVisitors: 856,
  totalActiveLinks: 12,
  linksCreatedThisMonth: 3,
  upgradeUrl: 'https://minifi.link/pricing',
  dashboardUrl: 'https://minifi.link/dashboard',
} as FreeMonthlyReportEmailProps;

export default FreeMonthlyReportEmailTemplate;
