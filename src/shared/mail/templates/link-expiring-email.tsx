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
import { LinkExpiringEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

const LOGO_URL = 'https://cdn-icons-png.flaticon.com/128/7347/7347153.png';

/**
 * Link Expiring Email Template
 * Sent to users when their links are about to expire (3 days before)
 */
export const LinkExpiringEmailTemplate = (props: LinkExpiringEmailProps) => {
  const { expiringLinks, totalCount, dashboardUrl, baseUrl } = props;

  const previewText = `${totalCount?.toString() || '1'} link${totalCount && totalCount > 1 ? 's' : ''} expiring soon`;

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
              Your Links Are Expiring Soon
            </Heading>

            <Text className="text-[14px] text-black leading-[24px]">
              {totalCount === 1
                ? 'One of your shortened links is about to expire.'
                : `${totalCount || 0} of your shortened links are about to expire.`}{' '}
              Extend them from your dashboard to keep them active.
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            {expiringLinks && expiringLinks.length > 0 ? (
              expiringLinks.map((link, index) => (
                <Section key={link.shortCode} className="mb-[20px]">
                  <Text className="text-[16px] text-black leading-[24px] font-semibold m-0">
                    {link.title || link.shortCode}
                    <span className="inline-block ml-[12px] text-[12px] font-medium text-white bg-amber-500 px-[12px] py-[4px] rounded-full">
                      {link.daysRemaining === 0
                        ? 'Expires today'
                        : link.daysRemaining === 1
                          ? 'Expires tomorrow'
                          : `${link.daysRemaining} days left`}
                    </span>
                  </Text>

                  <Text className="text-[14px] text-blue-600 font-medium m-0 mt-[4px]">
                    minifi-url.vercel.app/{link.shortCode}
                  </Text>

                  <Text className="text-[14px] text-[#666666] leading-[24px] break-all m-0 mt-[4px]">
                    {link.originalUrl}
                  </Text>

                  {index < (expiringLinks?.length || 0) - 1 && (
                    <Hr className="mx-0 my-[20px] w-full border border-[#eaeaea] border-solid" />
                  )}
                </Section>
              ))
            ) : (
              <Text className="text-[14px] text-black leading-[24px]">
                No links expiring soon.
              </Text>
            )}

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-blue-600 px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={dashboardUrl}
              >
                View Dashboard
              </Button>
            </Section>

            <Text className="text-[14px] text-black leading-[24px]">
              Links that expire will no longer redirect visitors. You can extend
              the expiration date or create new links from your dashboard.
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
                <Link href={baseUrl} className="text-[#666666] underline">
                  Minifi
                </Link>{' '}
                &bull;{' '}
                <Link
                  href={`${baseUrl}/privacy`}
                  className="text-[#666666] underline"
                >
                  Privacy
                </Link>{' '}
                &bull;{' '}
                <Link
                  href={`${baseUrl}/terms`}
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

LinkExpiringEmailTemplate.PreviewProps = {
  expiringLinks: [
    {
      shortCode: 'abc1234',
      title: 'Product Launch Link',
      originalUrl: 'https://example.com/product/launch',
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      daysRemaining: 2,
    },
    {
      shortCode: 'xyz5678',
      originalUrl: 'https://another-example.com/page',
      expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      daysRemaining: 1,
    },
  ],
  totalCount: 2,
  dashboardUrl: 'http://localhost:3000/dashboard',
  baseUrl: 'http://localhost:3000',
} as LinkExpiringEmailProps;

export default LinkExpiringEmailTemplate;
