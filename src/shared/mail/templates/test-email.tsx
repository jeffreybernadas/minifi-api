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
import { TestEmailTemplateProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

const LOGO_URL = 'https://cdn-icons-png.flaticon.com/128/7347/7347153.png';

export const TestEmailTemplate = (props?: TestEmailTemplateProps) => {
  const {
    name = 'User',
    buttonText = 'Click me',
    buttonUrl = 'https://example.com',
  } = props || {};

  const previewText = 'Test email from Minifi';

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
              Test Email
            </Heading>

            <Text className="text-[14px] text-black leading-[24px]">
              Hello {name}!
            </Text>

            <Text className="text-[14px] text-black leading-[24px]">
              This is a test email from your NestJS application.
            </Text>

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-blue-600 px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={buttonUrl}
              >
                {buttonText}
              </Button>
            </Section>

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

TestEmailTemplate.PreviewProps = {
  name: 'Test User',
  buttonText: 'Visit Dashboard',
  buttonUrl: 'http://localhost:3000/dashboard',
} as TestEmailTemplateProps;

export default TestEmailTemplate;
