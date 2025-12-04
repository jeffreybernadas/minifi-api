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
import { LinkDeletionWarningEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

const LOGO_URL = 'https://cdn-icons-png.flaticon.com/128/7347/7347153.png';

/**
 * Link Deletion Warning Email Template
 * Sent to FREE users 7 days before their links are auto-deleted (>90 days old)
 */
export const LinkDeletionWarningEmailTemplate = (
  props: LinkDeletionWarningEmailProps,
) => {
  const { firstName, deletingLinks, totalCount, upgradeUrl, dashboardUrl } =
    props;

  const previewText = `${totalCount?.toString() || '1'} link${totalCount && totalCount > 1 ? 's' : ''} will be deleted soon`;

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

            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-red-600">
              Your Links Will Be Deleted Soon
            </Heading>

            <Text className="text-[14px] text-black leading-[24px]">
              {firstName ? `Hey ${firstName},` : 'Hey there,'} as a FREE tier
              user, your links are automatically deleted after 90 days.{' '}
              {totalCount === 1
                ? 'One of your links is scheduled for deletion.'
                : `${totalCount || 0} of your links are scheduled for deletion.`}
            </Text>

            <Section className="bg-amber-50 border border-amber-500 rounded-lg p-[20px] my-[24px] text-center">
              <Text className="text-[15px] text-amber-800 leading-[24px] m-0 mb-[16px]">
                🔔 <strong>Upgrade to PRO</strong> to keep your links for up to
                2 years and unlock unlimited links, custom aliases, and detailed
                analytics.
              </Text>
              <Button
                className="rounded bg-amber-500 px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={upgradeUrl}
              >
                Upgrade to PRO
              </Button>
            </Section>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Text className="text-[14px] text-black leading-[24px] font-semibold">
              Links Scheduled for Deletion
            </Text>

            {deletingLinks && deletingLinks.length > 0 ? (
              deletingLinks.map((link, index) => (
                <Section key={link.shortCode} className="mb-[16px]">
                  <Text className="text-[16px] text-black leading-[24px] font-semibold m-0">
                    {link.title || link.shortCode}
                    <span className="inline-block ml-[12px] text-[12px] font-medium text-white bg-red-600 px-[10px] py-[4px] rounded-full">
                      {link.daysUntilDeletion === 0
                        ? 'Deletes today'
                        : link.daysUntilDeletion === 1
                          ? 'Deletes tomorrow'
                          : `${link.daysUntilDeletion || 0} days left`}
                    </span>
                  </Text>

                  <Text className="text-[14px] text-blue-600 font-medium m-0 mt-[4px]">
                    minifi.link/{link.shortCode}
                  </Text>

                  <Text className="text-[14px] text-[#666666] leading-[24px] break-all m-0 mt-[4px]">
                    {link.originalUrl}
                  </Text>

                  <Text className="text-[13px] text-[#999999] m-0 mt-[4px]">
                    📊 {link.totalClicks?.toLocaleString() || '0'} total clicks
                  </Text>

                  {index < (deletingLinks?.length || 0) - 1 && (
                    <Hr className="mx-0 my-[16px] w-full border border-[#eaeaea] border-solid" />
                  )}
                </Section>
              ))
            ) : (
              <Text className="text-[14px] text-black leading-[24px]">
                No links scheduled for deletion.
              </Text>
            )}

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-blue-600 px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={dashboardUrl}
              >
                View Your Links
              </Button>
            </Section>

            <Text className="text-[14px] text-black leading-[24px]">
              FREE tier links are deleted after 90 days. Upgrade to PRO for
              2-year retention and unlimited links.
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

LinkDeletionWarningEmailTemplate.PreviewProps = {
  firstName: 'John',
  deletingLinks: [
    {
      shortCode: 'abc1234',
      title: 'My Important Link',
      originalUrl: 'https://example.com/very/long/url/path',
      createdAt: new Date(),
      daysUntilDeletion: 3,
      totalClicks: 42,
    },
    {
      shortCode: 'xyz5678',
      originalUrl: 'https://another-example.com/page',
      createdAt: new Date(),
      daysUntilDeletion: 5,
      totalClicks: 15,
    },
  ],
  totalCount: 2,
  upgradeUrl: 'https://minifi.link/pricing',
  dashboardUrl: 'https://minifi.link/dashboard/links',
} as LinkDeletionWarningEmailProps;

export default LinkDeletionWarningEmailTemplate;
