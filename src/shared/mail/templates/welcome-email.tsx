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
import { WelcomeEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

const LOGO_URL = 'https://cdn-icons-png.flaticon.com/128/7347/7347153.png';

/**
 * Welcome Email Template
 * Sent when a new user first logs in (sync-on-demand user creation)
 */
export const WelcomeEmailTemplate = (props: WelcomeEmailProps) => {
  const { firstName, dashboardUrl, baseUrl } = props;

  const previewText = 'Welcome to Minifi - Start shortening your links!';

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
              Welcome to <strong>Minifi</strong>! 🎉
            </Heading>

            <Text className="text-[14px] text-black leading-[24px]">
              {firstName ? `Hey ${firstName},` : 'Hey there,'} thanks for
              joining Minifi! We're excited to have you on board.
            </Text>

            <Text className="text-[14px] text-black leading-[24px]">
              Minifi helps you create short, memorable links that are easy to
              share. Whether you're a marketer tracking campaigns or just want
              cleaner URLs, we've got you covered.
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Text className="text-[14px] text-black leading-[24px] font-semibold">
              What you can do:
            </Text>

            <Text className="text-[14px] text-black leading-[24px]">
              🔗 <strong>Shorten URLs</strong> - Create clean, shareable links
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              📊 <strong>Track Clicks</strong> - See who's clicking your links
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              🏷️ <strong>Organize with Tags</strong> - Keep your links tidy
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              🔒 <strong>Password Protection</strong> - Secure sensitive links
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              ⏰ <strong>Schedule Links</strong> - Set start and end dates
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-blue-600 px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={dashboardUrl}
              >
                Go to Dashboard
              </Button>
            </Section>

            <Text className="text-[14px] text-black leading-[24px]">
              Need help? Reply to this email or check out our docs. Happy
              linking! 🚀
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

WelcomeEmailTemplate.PreviewProps = {
  firstName: 'Alex',
  dashboardUrl: 'http://localhost:3000/dashboard',
  baseUrl: 'http://localhost:3000',
} as WelcomeEmailProps;

export default WelcomeEmailTemplate;
