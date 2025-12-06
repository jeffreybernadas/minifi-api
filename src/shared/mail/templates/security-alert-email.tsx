import {
  Body,
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
import { SecurityAlertEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

const LOGO_URL = 'https://cdn-icons-png.flaticon.com/128/7347/7347153.png';

/**
 * Security Alert Email Template
 * Sent when a user's link is flagged as suspicious/malicious by the scan service
 */
export const SecurityAlertEmailTemplate = (props: SecurityAlertEmailProps) => {
  const {
    originalUrl,
    shortCode,
    status,
    score,
    threats,
    reasoning,
    recommendations,
    scannedAt,
  } = props;

  const previewText = `Security warning for your link ${shortCode || 'unknown'}`;

  const readableStatus =
    status
      ?.toLowerCase()
      ?.replace(/_/g, ' ')
      ?.replace(/(^|\s)\S/g, (c) => c.toUpperCase()) || 'Unknown';

  const threatList = threats?.length
    ? threats
    : ['No specific threats identified'];

  const scanDate =
    scannedAt && typeof scannedAt === 'string'
      ? scannedAt
      : scannedAt instanceof Date
        ? scannedAt.toISOString()
        : undefined;

  const statusBgColor = status === 'MALICIOUS' ? 'bg-red-600' : 'bg-amber-600';

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
              Security Warning
            </Heading>

            <Text className="text-[14px] text-black leading-[24px]">
              We've detected potential security issues with one of your
              shortened links.
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Text className="text-[12px] text-[#666666] leading-[20px] uppercase tracking-wide">
              Short Link
            </Text>
            <Text className="text-[14px] text-black leading-[24px] font-semibold mt-[4px]">
              {shortCode}
            </Text>

            <Text className="text-[12px] text-[#666666] leading-[20px] uppercase tracking-wide mt-[16px]">
              Destination URL
            </Text>
            <Text className="text-[14px] text-black leading-[24px] mt-[4px] break-all">
              {originalUrl}
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Section className="text-center py-[16px]">
              <Text
                className={`inline-block text-[14px] font-semibold text-white px-[16px] py-[8px] rounded ${statusBgColor}`}
              >
                {readableStatus}
              </Text>
              {typeof score === 'number' && (
                <Text className="text-[14px] text-black leading-[24px] mt-[8px]">
                  Risk Score: {((1 - score) * 100).toFixed(0)}%
                </Text>
              )}
              {scanDate && (
                <Text className="text-[13px] text-[#666666] leading-[24px] mt-[4px]">
                  Scanned: {scanDate}
                </Text>
              )}
            </Section>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Text className="text-[14px] text-black leading-[24px] font-semibold">
              Why we flagged this link
            </Text>

            {threatList.map((threat, idx) => (
              <Text key={idx} className="text-[14px] text-black leading-[24px]">
                • {threat}
              </Text>
            ))}

            {reasoning && (
              <Text className="text-[14px] text-[#666666] leading-[24px] italic mt-[12px]">
                {reasoning}
              </Text>
            )}

            {recommendations && (
              <>
                <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

                <Text className="text-[14px] text-black leading-[24px] font-semibold">
                  Recommended Action
                </Text>

                <Section className="bg-blue-50 border-l-[3px] border-blue-600 p-[12px] rounded mt-[8px]">
                  <Text className="text-[14px] text-black leading-[24px] m-0">
                    {recommendations}
                  </Text>
                </Section>
              </>
            )}

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Text className="text-[14px] text-black leading-[24px]">
              If you believe this is a mistake, you can review or rescan the
              link from your dashboard.
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
                  href="https://minifi-url.vercel.app"
                  className="text-[#666666] underline"
                >
                  minifi-url.vercel.app
                </Link>{' '}
                &bull;{' '}
                <Link
                  href="https://minifi-url.vercel.app/privacy"
                  className="text-[#666666] underline"
                >
                  Privacy
                </Link>{' '}
                &bull;{' '}
                <Link
                  href="https://minifi-url.vercel.app/terms"
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

SecurityAlertEmailTemplate.PreviewProps = {
  originalUrl: 'https://suspicious-site.com/malware',
  shortCode: 'abc1234',
  status: 'SUSPICIOUS',
  score: 0.75,
  threats: ['Phishing', 'Malware', 'Suspicious redirects'],
  reasoning:
    'This URL has been flagged for suspicious activity including potential phishing attempts and malware distribution.',
  recommendations:
    'Do not visit this link. Report if you received this from an unknown source. Consider blocking this domain.',
  scannedAt: new Date(),
} as SecurityAlertEmailProps;

export default SecurityAlertEmailTemplate;
