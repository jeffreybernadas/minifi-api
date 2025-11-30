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
import { MonthlyReportEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

/**
 * Monthly Report Email Template
 * Sent to PRO users on the 1st of each month with analytics summary
 */
export const MonthlyReportEmailTemplate = (props: MonthlyReportEmailProps) => {
  const {
    firstName,
    month,
    year,
    totalClicks,
    uniqueVisitors,
    totalActiveLinks,
    linksCreatedThisMonth,
    growthPercentage,
    topLinks,
    topCountries,
    topDevices,
    topReferrers,
    bestDay,
    dashboardUrl,
  } = props;

  const formatGrowth = (growth?: number) => {
    if (growth === undefined) return null;
    if (growth === 0) return '0%';
    const sign = growth > 0 ? '+' : '';
    return `${sign}${growth.toFixed(0)}%`;
  };

  const growthColor =
    growthPercentage !== undefined && growthPercentage > 0
      ? '#38a169'
      : growthPercentage !== undefined && growthPercentage < 0
        ? '#e53e3e'
        : '#718096';

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
            {firstName ? `Hey ${firstName},` : 'Hey there,'} here's how your
            links performed last month.
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

          {/* Growth Indicator */}
          {growthPercentage !== undefined && (
            <Section style={styles.growthSection}>
              <Text style={{ ...styles.growthText, color: growthColor }}>
                {formatGrowth(growthPercentage)} vs last month
              </Text>
            </Section>
          )}

          {/* Best Day */}
          {bestDay && (
            <Section style={styles.bestDaySection}>
              <Text style={styles.bestDayText}>
                🏆 Best day: <strong>{bestDay.date}</strong> with{' '}
                <strong>{bestDay.clicks.toLocaleString()}</strong> clicks
              </Text>
            </Section>
          )}

          <Hr style={styles.divider} />

          {/* Top Links */}
          {topLinks.length > 0 && (
            <Section style={styles.section}>
              <Text style={styles.sectionTitle}>🔗 Top Performing Links</Text>
              {topLinks.slice(0, 5).map((link, index) => (
                <Section key={link.shortCode} style={styles.linkRow}>
                  <Text style={styles.linkRank}>#{index + 1}</Text>
                  <Section style={styles.linkInfo}>
                    <Text style={styles.linkTitle}>
                      {link.title || link.shortCode}
                    </Text>
                    <Text style={styles.linkCode}>
                      minifi.link/{link.shortCode}
                    </Text>
                  </Section>
                  <Text style={styles.linkClicks}>
                    {link.clicks.toLocaleString()}
                  </Text>
                </Section>
              ))}
            </Section>
          )}

          {/* Top Countries */}
          {topCountries.length > 0 && (
            <>
              <Hr style={styles.divider} />
              <Section style={styles.section}>
                <Text style={styles.sectionTitle}>🌍 Top Countries</Text>
                <Section style={styles.inlineList}>
                  {topCountries.slice(0, 5).map((c, i) => (
                    <Text key={c.country} style={styles.inlineItem}>
                      {c.country} ({c.clicks.toLocaleString()})
                      {i < topCountries.length - 1 && i < 4 ? ' • ' : ''}
                    </Text>
                  ))}
                </Section>
              </Section>
            </>
          )}

          {/* Device Breakdown */}
          {topDevices.length > 0 && (
            <>
              <Hr style={styles.divider} />
              <Section style={styles.section}>
                <Text style={styles.sectionTitle}>📱 Device Breakdown</Text>
                <Section style={styles.deviceGrid}>
                  {topDevices.map((d) => (
                    <Text key={d.device} style={styles.deviceItem}>
                      {d.device === 'mobile'
                        ? '📱'
                        : d.device === 'tablet'
                          ? '📟'
                          : '💻'}{' '}
                      {d.device.charAt(0).toUpperCase() + d.device.slice(1)}:{' '}
                      {d.percentage}%
                    </Text>
                  ))}
                </Section>
              </Section>
            </>
          )}

          {/* Top Referrers */}
          {topReferrers.length > 0 && (
            <>
              <Hr style={styles.divider} />
              <Section style={styles.section}>
                <Text style={styles.sectionTitle}>🔀 Top Traffic Sources</Text>
                <Section style={styles.inlineList}>
                  {topReferrers.slice(0, 5).map((r, i) => (
                    <Text key={r.referrer} style={styles.inlineItem}>
                      {r.referrer} ({r.clicks.toLocaleString()})
                      {i < topReferrers.length - 1 && i < 4 ? ' • ' : ''}
                    </Text>
                  ))}
                </Section>
              </Section>
            </>
          )}

          {/* Empty State */}
          {topLinks.length === 0 && (
            <Section style={styles.emptySection}>
              <Text style={styles.emptyText}>
                No link activity this month. Create some links to start
                tracking!
              </Text>
            </Section>
          )}

          <Hr style={styles.divider} />

          <Section style={styles.ctaSection}>
            <Link href={dashboardUrl} style={styles.ctaButton}>
              View Full Analytics
            </Link>
          </Section>

          <Text style={styles.footer}>
            This report is sent monthly to PRO subscribers.
            <br />
            Manage your email preferences in your dashboard settings.
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
  growthSection: {
    textAlign: 'center' as const,
    marginTop: '12px',
  },
  growthText: {
    fontSize: '16px',
    fontWeight: '600',
  },
  bestDaySection: {
    textAlign: 'center' as const,
    marginTop: '16px',
    backgroundColor: '#fffaf0',
    padding: '12px',
    borderRadius: '8px',
  },
  bestDayText: {
    fontSize: '14px',
    color: '#744210',
    margin: 0,
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '12px',
  },
  linkRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  linkRank: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#3182ce',
    width: '30px',
    margin: 0,
  },
  linkInfo: {
    flex: '1',
  },
  linkTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '2px',
  },
  linkCode: {
    fontSize: '12px',
    color: '#718096',
  },
  linkClicks: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  inlineList: {
    lineHeight: '1.8',
  },
  inlineItem: {
    fontSize: '14px',
    color: '#4a5568',
    display: 'inline',
  },
  deviceGrid: {
    display: 'flex',
    gap: '16px',
  },
  deviceItem: {
    fontSize: '14px',
    color: '#4a5568',
    marginBottom: '4px',
  },
  emptySection: {
    textAlign: 'center' as const,
    padding: '30px',
  },
  emptyText: {
    fontSize: '15px',
    color: '#718096',
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
    lineHeight: '1.6',
  },
};
