import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { SubscriptionEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

/**
 * Subscription Email Template
 * Sent when a user upgrades, cancels, or has a subscription renewing
 */
export const SubscriptionEmailTemplate = (props: SubscriptionEmailProps) => {
  const { firstName, action, tier, periodEnd, dashboardUrl } = props;

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
      <Preview>{content.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            {content.emoji} {content.title}
          </Heading>

          <Text style={styles.intro}>{content.intro}</Text>

          <Text style={styles.message}>{content.message}</Text>

          {content.features.length > 0 && (
            <>
              <Hr style={styles.divider} />
              <Section style={styles.featuresSection}>
                {action === 'upgraded' && (
                  <Text style={styles.subheading}>What's included:</Text>
                )}
                {action === 'cancelled' && (
                  <Text style={styles.subheading}>What happens next:</Text>
                )}
                {content.features.map((feature, index) => (
                  <Text key={index} style={styles.featureItem}>
                    {feature}
                  </Text>
                ))}
              </Section>
            </>
          )}

          <Hr style={styles.divider} />

          <Section style={styles.ctaSection}>
            <Link href={dashboardUrl} style={styles.ctaButton}>
              {action === 'upgraded' ? 'Start Exploring' : 'Go to Dashboard'}
            </Link>
          </Section>

          <Text style={styles.footer}>
            {action === 'cancelled' && (
              <>
                Changed your mind?{' '}
                <Link href={`${dashboardUrl}/settings/subscription`}>
                  Resubscribe anytime
                </Link>
                .
                <br />
              </>
            )}
            Questions? Reply to this email and we'll help you out.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '40px auto',
    padding: '40px',
    borderRadius: '8px',
    maxWidth: '600px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '20px',
    textAlign: 'center' as const,
  },
  intro: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  message: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  subheading: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '12px',
  },
  featuresSection: {
    marginBottom: '16px',
  },
  featureItem: {
    fontSize: '15px',
    color: '#4a5568',
    marginBottom: '10px',
    lineHeight: '1.5',
  },
  divider: {
    borderColor: '#e2e8f0',
    marginTop: '24px',
    marginBottom: '24px',
  },
  ctaSection: {
    textAlign: 'center' as const,
    margin: '30px 0',
  },
  ctaButton: {
    display: 'inline-block',
    backgroundColor: '#3182ce',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    padding: '14px 28px',
    borderRadius: '6px',
    textDecoration: 'none',
  },
  footer: {
    fontSize: '14px',
    color: '#a0aec0',
    marginTop: '20px',
    textAlign: 'center' as const,
    lineHeight: '1.6',
  },
};
