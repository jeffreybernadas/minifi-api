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
import { LinkExpiringEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

/**
 * Link Expiring Email Template
 * Sent to users when their links are about to expire (3 days before)
 */
export const LinkExpiringEmailTemplate = (props: LinkExpiringEmailProps) => {
  const { expiringLinks, totalCount, dashboardUrl } = props;

  return (
    <Html>
      <Head />
      <Preview>
        ⏰ {totalCount} link{totalCount > 1 ? 's' : ''} expiring soon
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            ⏰ Your Links Are Expiring Soon
          </Heading>

          <Text style={styles.intro}>
            {totalCount === 1
              ? 'One of your shortened links is about to expire.'
              : `${totalCount} of your shortened links are about to expire.`}{' '}
            Renew them from your dashboard to keep them active.
          </Text>

          {expiringLinks.map((link, index) => (
            <Section key={link.shortCode} style={styles.linkSection}>
              <Text style={styles.linkTitle}>
                {link.title || link.shortCode}
                <span style={styles.expiryBadge}>
                  {link.daysRemaining === 0
                    ? 'Expires today'
                    : link.daysRemaining === 1
                      ? 'Expires tomorrow'
                      : `${link.daysRemaining} days left`}
                </span>
              </Text>

              <Text style={styles.shortCode}>minifi.link/{link.shortCode}</Text>

              <Text style={styles.originalUrl}>{link.originalUrl}</Text>

              {index < expiringLinks.length - 1 && (
                <Hr style={styles.divider} />
              )}
            </Section>
          ))}

          <Hr style={styles.divider} />

          <Section style={styles.ctaSection}>
            <Link href={dashboardUrl} style={styles.ctaButton}>
              View Dashboard
            </Link>
          </Section>

          <Text style={styles.footer}>
            Links that expire will no longer redirect visitors. You can extend
            the expiration date or create new links from your dashboard.
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
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '20px',
  },
  intro: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '30px',
    lineHeight: '1.5',
  },
  linkSection: {
    marginBottom: '20px',
  },
  linkTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
  },
  expiryBadge: {
    display: 'inline-block',
    marginLeft: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#dd6b20',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  shortCode: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#3182ce',
    marginBottom: '4px',
  },
  originalUrl: {
    fontSize: '14px',
    color: '#718096',
    wordBreak: 'break-all' as const,
    lineHeight: '1.5',
  },
  divider: {
    borderColor: '#e2e8f0',
    marginTop: '20px',
    marginBottom: '20px',
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
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
  },
  footer: {
    fontSize: '14px',
    color: '#a0aec0',
    marginTop: '20px',
    textAlign: 'center' as const,
    lineHeight: '1.5',
  },
};
