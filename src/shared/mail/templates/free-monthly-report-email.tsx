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
import { FreeMonthlyReportEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

/**
 * FREE User Monthly Report Email Template
 * Simplified stats with upgrade CTA
 */
export const FreeMonthlyReportEmailTemplate = (
  props: FreeMonthlyReportEmailProps,
) => {
  const {
    firstName,
    month,
    year,
    totalClicks,
    uniqueVisitors,
    totalActiveLinks,
    linksCreatedThisMonth,
    upgradeUrl,
    dashboardUrl,
  } = props;

  return (
    <Html>
      <Head />
      <Preview>
        Your Minifi Report for {month} {year.toString()}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            📊 Your {month} {year} Report
          </Heading>

          <Text style={styles.intro}>
            {firstName ? `Hey ${firstName},` : 'Hey there,'} here's a quick
            snapshot of your link performance last month.
          </Text>

          <Hr style={styles.divider} />

          {/* Summary Stats */}
          <Section style={styles.statsGrid}>
            <table style={styles.statsTable}>
              <tbody>
                <tr>
                  <td style={styles.statCell}>
                    <Text style={styles.statValue}>
                      {totalClicks.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Total Clicks</Text>
                  </td>
                  <td style={styles.statCell}>
                    <Text style={styles.statValue}>
                      {uniqueVisitors.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Unique Visitors</Text>
                  </td>
                </tr>
                <tr>
                  <td style={styles.statCell}>
                    <Text style={styles.statValue}>{totalActiveLinks}</Text>
                    <Text style={styles.statLabel}>Active Links</Text>
                  </td>
                  <td style={styles.statCell}>
                    <Text style={styles.statValue}>
                      {linksCreatedThisMonth}
                    </Text>
                    <Text style={styles.statLabel}>New Links</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={styles.divider} />

          {/* Upgrade CTA */}
          <Section style={styles.upgradeBox}>
            <Text style={styles.upgradeTitle}>🚀 Want More Insights?</Text>
            <Text style={styles.upgradeText}>Upgrade to PRO to unlock:</Text>
            <ul style={styles.featureList}>
              <li style={styles.featureItem}>
                📍 Geographic breakdown by country
              </li>
              <li style={styles.featureItem}>📱 Device & browser analytics</li>
              <li style={styles.featureItem}>🔗 Top performing links</li>
              <li style={styles.featureItem}>🔀 Traffic source analysis</li>
              <li style={styles.featureItem}>📈 Month-over-month growth</li>
              <li style={styles.featureItem}>♾️ Unlimited links</li>
            </ul>
            <Link href={upgradeUrl} style={styles.upgradeButton}>
              Upgrade to PRO
            </Link>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.ctaSection}>
            <Link href={dashboardUrl} style={styles.ctaButton}>
              View Dashboard
            </Link>
          </Section>

          <Text style={styles.footer}>
            This is a basic report for FREE tier users.
            <br />
            Upgrade to PRO for detailed analytics and insights.
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
    textAlign: 'center' as const,
  },
  intro: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  statsGrid: {
    margin: '20px 0',
  },
  statsTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  statCell: {
    textAlign: 'center' as const,
    padding: '16px 8px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    width: '50%',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#3182ce',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#718096',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  upgradeBox: {
    backgroundColor: '#ebf8ff',
    border: '1px solid #3182ce',
    borderRadius: '8px',
    padding: '24px',
    textAlign: 'center' as const,
  },
  upgradeTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2b6cb0',
    marginBottom: '8px',
  },
  upgradeText: {
    fontSize: '15px',
    color: '#2c5282',
    marginBottom: '16px',
  },
  featureList: {
    textAlign: 'left' as const,
    margin: '0 auto 20px',
    padding: '0 0 0 20px',
    maxWidth: '280px',
  },
  featureItem: {
    fontSize: '14px',
    color: '#2c5282',
    marginBottom: '8px',
    lineHeight: '1.4',
  },
  upgradeButton: {
    display: 'inline-block',
    backgroundColor: '#3182ce',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    padding: '12px 32px',
    borderRadius: '6px',
    textDecoration: 'none',
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
    backgroundColor: '#718096',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    padding: '10px 20px',
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
