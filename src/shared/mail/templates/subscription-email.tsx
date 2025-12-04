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
import { SubscriptionEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

const LOGO_URL = 'https://cdn-icons-png.flaticon.com/128/7347/7347153.png';

/**
 * Subscription Email Template
 * Sent when a user upgrades, cancels, or has a subscription renewing
 */
export const SubscriptionEmailTemplate = (props: SubscriptionEmailProps) => {
  const { firstName, action, periodEnd, dashboardUrl } = props;

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getContent = () => {
    switch (action) {
      case 'upgraded':
        return {
          emoji: '🎉',
          title: 'Welcome to Minifi PRO!',
          preview: 'Your PRO subscription is now active',
          intro: `${firstName ? `Hey ${firstName},` : 'Hey there,'} congratulations! Your upgrade to Minifi PRO is complete.`,
          message:
            "You now have access to all premium features including unlimited links, custom aliases, advanced analytics, and priority support. Let's make the most of it!",
          features: [
            '🔗 Unlimited shortened links',
            '✨ Custom aliases (minifi.link/your-brand)',
            '📊 Advanced analytics & reports',
            '📧 Monthly performance reports',
            '⚡ Priority support',
          ],
        };
      case 'cancelled':
        return {
          emoji: '👋',
          title: 'Subscription Cancelled',
          preview: 'Your Minifi PRO subscription has been cancelled',
          intro: `${firstName ? `Hey ${firstName},` : 'Hey there,'} we're sorry to see you go.`,
          message: periodEnd
            ? `Your PRO features will remain active until ${formatDate(periodEnd)}. After that, your account will revert to the FREE tier.`
            : 'Your PRO features will remain active until the end of your billing period. After that, your account will revert to the FREE tier.',
          features: [
            '✓ Your links will continue to work',
            '✓ Basic analytics still available',
            '✓ Up to 25 active links on FREE tier',
            '✓ You can upgrade again anytime',
          ],
        };
      case 'renewing':
        return {
          emoji: '🔄',
          title: 'Subscription Renewing Soon',
          preview: 'Your Minifi PRO subscription is about to renew',
          intro: `${firstName ? `Hey ${firstName},` : 'Hey there,'} just a heads up!`,
          message: periodEnd
            ? `Your PRO subscription will automatically renew on ${formatDate(periodEnd)}. No action needed - you'll continue enjoying all premium features.`
            : "Your PRO subscription will automatically renew soon. No action needed - you'll continue enjoying all premium features.",
          features: [],
        };
      default:
        return {
          emoji: '📧',
          title: 'Subscription Update',
          preview: 'Your Minifi subscription has been updated',
          intro: `${firstName ? `Hey ${firstName},` : 'Hey there,'}`,
          message: 'Your subscription has been updated.',
          features: [],
        };
    }
  };

  const content = getContent();

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{content.preview}</Preview>
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
              {content.emoji} {content.title}
            </Heading>

            <Text className="text-[14px] text-black leading-[24px]">
              {content.intro}
            </Text>

            <Text className="text-[14px] text-black leading-[24px]">
              {content.message}
            </Text>

            {content.features.length > 0 && (
              <>
                <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

                <Text className="text-[14px] text-black leading-[24px] font-semibold">
                  {action === 'upgraded'
                    ? "What's included:"
                    : 'What happens next:'}
                </Text>

                {content.features.map((feature, index) => (
                  <Text
                    key={index}
                    className="text-[14px] text-black leading-[24px]"
                  >
                    {feature}
                  </Text>
                ))}
              </>
            )}

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-blue-600 px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={dashboardUrl}
              >
                {action === 'upgraded' ? 'Start Exploring' : 'Go to Dashboard'}
              </Button>
            </Section>

            <Text className="text-[14px] text-black leading-[24px]">
              {action === 'cancelled' && (
                <>
                  Changed your mind?{' '}
                  <Link
                    href={`${dashboardUrl}/settings/subscription`}
                    className="text-blue-600 no-underline"
                  >
                    Resubscribe anytime
                  </Link>
                  .{' '}
                </>
              )}
              Questions? Reply to this email and we'll help you out.
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

SubscriptionEmailTemplate.PreviewProps = {
  firstName: 'Alex',
  action: 'upgraded',
  tier: 'PRO',
  periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  dashboardUrl: 'https://minifi.link/dashboard',
} as SubscriptionEmailProps;

export default SubscriptionEmailTemplate;
