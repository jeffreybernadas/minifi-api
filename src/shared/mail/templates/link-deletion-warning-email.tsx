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
import { LinkDeletionWarningEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

/**
 * Link Deletion Warning Email Template
 * Sent to FREE users 7 days before their links are auto-deleted (>90 days old)
 */
export const LinkDeletionWarningEmailTemplate = (
  props: LinkDeletionWarningEmailProps,
) => {
  const { firstName, deletingLinks, totalCount, upgradeUrl, dashboardUrl } =
    props;

  return (
    <Html>
      <Head />
      <Preview>
        ⚠️ {totalCount.toString()} link{totalCount > 1 ? 's' : ''} will be
        deleted soon
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            ⚠️ Your Links Will Be Deleted Soon
          </Heading>

          <Text style={styles.intro}>
            {firstName ? `Hey ${firstName},` : 'Hey there,'} as a FREE tier
            user, your links are automatically deleted after 90 days.{' '}
            {totalCount === 1
              ? 'One of your links is scheduled for deletion.'
              : `${totalCount} of your links are scheduled for deletion.`}
          </Text>

          <Section style={styles.warningBox}>
            <Text style={styles.warningText}>
              🔔 <strong>Upgrade to PRO</strong> to keep your links for up to 2
              years and unlock unlimited links, custom aliases, and detailed
              analytics.
            </Text>
            <Link href={upgradeUrl} style={styles.upgradeButton}>
              Upgrade to PRO
            </Link>
          </Section>

          <Hr style={styles.divider} />

          <Text style={styles.sectionTitle}>Links Scheduled for Deletion</Text>

          {deletingLinks.map((link, index) => (
            <Section key={link.shortCode} style={styles.linkSection}>
              <Text style={styles.linkTitle}>
                {link.title || link.shortCode}
                <span style={styles.deletionBadge}>
                  {link.daysUntilDeletion === 0
                    ? 'Deletes today'
                    : link.daysUntilDeletion === 1
                      ? 'Deletes tomorrow'
                      : `${link.daysUntilDeletion} days left`}
                </span>
              </Text>

              <Text style={styles.shortCode}>minifi.link/{link.shortCode}</Text>

              <Text style={styles.originalUrl}>{link.originalUrl}</Text>

              <Text style={styles.statsText}>
                📊 {link.totalClicks.toLocaleString()} total clicks
              </Text>

              {index < deletingLinks.length - 1 && (
                <Hr style={styles.linkDivider} />
              )}
            </Section>
          ))}

          <Hr style={styles.divider} />

          <Section style={styles.ctaSection}>
            <Link href={dashboardUrl} style={styles.ctaButton}>
              View Your Links
            </Link>
          </Section>

          <Text style={styles.footer}>
            FREE tier links are deleted after 90 days.
            <br />
            Upgrade to PRO for 2-year retention and unlimited links.
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
    color: '#c53030',
    marginBottom: '20px',
  },
  intro: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  warningBox: {
    backgroundColor: '#fffaf0',
    border: '1px solid #ed8936',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  warningText: {
    fontSize: '15px',
    color: '#744210',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  upgradeButton: {
    display: 'inline-block',
    backgroundColor: '#ed8936',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '16px',
  },
  linkSection: {
    marginBottom: '16px',
  },
  linkTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
  },
  deletionBadge: {
    display: 'inline-block',
    marginLeft: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#c53030',
    padding: '4px 10px',
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
    marginBottom: '4px',
  },
  statsText: {
    fontSize: '13px',
    color: '#a0aec0',
    marginTop: '4px',
  },
  linkDivider: {
    borderColor: '#e2e8f0',
    marginTop: '16px',
    marginBottom: '16px',
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
