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
import { WelcomeEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

/**
 * Welcome Email Template
 * Sent when a new user first logs in (sync-on-demand user creation)
 */
export const WelcomeEmailTemplate = (props: WelcomeEmailProps) => {
  const { firstName, dashboardUrl } = props;

  return (
    <Html>
      <Head />
      <Preview>Welcome to Minifi - Start shortening your links!</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Welcome to Minifi! 🎉</Heading>

          <Text style={styles.intro}>
            {firstName ? `Hey ${firstName},` : 'Hey there,'} thanks for joining
            Minifi! We're excited to have you on board.
          </Text>

          <Text style={styles.paragraph}>
            Minifi helps you create short, memorable links that are easy to
            share. Whether you're a marketer tracking campaigns or just want
            cleaner URLs, we've got you covered.
          </Text>

          <Hr style={styles.divider} />

          <Section style={styles.featuresSection}>
            <Text style={styles.subheading}>What you can do:</Text>

            <Text style={styles.featureItem}>
              🔗 <strong>Shorten URLs</strong> - Create clean, shareable links
            </Text>
            <Text style={styles.featureItem}>
              📊 <strong>Track Clicks</strong> - See who's clicking your links
            </Text>
            <Text style={styles.featureItem}>
              🏷️ <strong>Organize with Tags</strong> - Keep your links tidy
            </Text>
            <Text style={styles.featureItem}>
              🔒 <strong>Password Protection</strong> - Secure sensitive links
            </Text>
            <Text style={styles.featureItem}>
              ⏰ <strong>Schedule Links</strong> - Set start and end dates
            </Text>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.ctaSection}>
            <Link href={dashboardUrl} style={styles.ctaButton}>
              Go to Dashboard
            </Link>
          </Section>

          <Text style={styles.footer}>
            Need help? Reply to this email or check out our docs.
            <br />
            Happy linking! 🚀
          </Text>
        </Container>
      </Body>
    </Html>
  );
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
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '20px',
    textAlign: 'center' as const,
  },
  intro: {
    fontSize: '18px',
    color: '#2d3748',
    marginBottom: '16px',
    lineHeight: '1.6',
  },
  paragraph: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '24px',
    lineHeight: '1.6',
  },
  subheading: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '16px',
  },
  featuresSection: {
    marginBottom: '16px',
  },
  featureItem: {
    fontSize: '15px',
    color: '#4a5568',
    marginBottom: '12px',
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
