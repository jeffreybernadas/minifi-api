import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { SecurityAlertEmailProps } from '@/common/interfaces/email.interface';
import * as React from 'react';

/**
 * Security Alert Email Template
 * Sent when a user's link is flagged as suspicious/malicious by the scan service
 */
export const SecurityAlertEmailTemplate = (props: SecurityAlertEmailProps) => {
  const {
    originalUrl,
    shortCode,
    status,
    score,
    threats,
    reasoning,
    recommendations,
    scannedAt,
  } = props;

  const readableStatus = status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

  const threatList = threats?.length
    ? threats
    : ['No specific threats identified'];

  const scanDate =
    scannedAt && typeof scannedAt === 'string'
      ? scannedAt
      : scannedAt instanceof Date
        ? scannedAt.toISOString()
        : undefined;

  // Status color based on severity
  const statusColor = status === 'MALICIOUS' ? '#dc2626' : '#b45309';

  return (
    <Html>
      <Head />
      <Preview>⚠️ Security warning for your link {shortCode}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>⚠️ Security Warning</Heading>

          <Text style={styles.intro}>
            We've detected potential security issues with one of your shortened
            links.
          </Text>

          <Section style={styles.linkSection}>
            <Text style={styles.label}>Short Link</Text>
            <Text style={styles.value}>{shortCode}</Text>

            <Text style={styles.label}>Destination URL</Text>
            <Text style={styles.urlValue}>{originalUrl}</Text>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.statusSection}>
            <Text
              style={{ ...styles.statusBadge, backgroundColor: statusColor }}
            >
              {readableStatus}
            </Text>
            {typeof score === 'number' && (
              <Text style={styles.score}>
                Risk Score: {((1 - score) * 100).toFixed(0)}%
              </Text>
            )}
            {scanDate && <Text style={styles.meta}>Scanned: {scanDate}</Text>}
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.threatSection}>
            <Text style={styles.subheading}>Why we flagged this link</Text>
            {threatList.map((threat, idx) => (
              <Text key={idx} style={styles.threatItem}>
                • {threat}
              </Text>
            ))}
            {reasoning && <Text style={styles.reasoning}>{reasoning}</Text>}
          </Section>

          {recommendations && (
            <>
              <Hr style={styles.divider} />
              <Section>
                <Text style={styles.subheading}>Recommended Action</Text>
                <Text style={styles.recommendations}>{recommendations}</Text>
              </Section>
            </>
          )}

          <Hr style={styles.divider} />

          <Text style={styles.footer}>
            If you believe this is a mistake, you can review or rescan the link
            from your dashboard.
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
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  linkSection: {
    marginBottom: '16px',
  },
  label: {
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#6b7280',
    marginBottom: '4px',
    marginTop: '12px',
  },
  value: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
  },
  urlValue: {
    fontSize: '14px',
    color: '#4a5568',
    wordBreak: 'break-all' as const,
    marginBottom: '8px',
  },
  statusSection: {
    textAlign: 'center' as const,
    padding: '16px 0',
  },
  statusBadge: {
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  score: {
    fontSize: '14px',
    color: '#4a5568',
    marginTop: '8px',
  },
  meta: {
    fontSize: '13px',
    color: '#718096',
    marginTop: '4px',
  },
  threatSection: {
    marginBottom: '16px',
  },
  subheading: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '12px',
  },
  threatItem: {
    fontSize: '14px',
    color: '#4a5568',
    marginBottom: '6px',
    lineHeight: '1.5',
  },
  reasoning: {
    fontSize: '14px',
    color: '#718096',
    fontStyle: 'italic',
    marginTop: '12px',
    lineHeight: '1.5',
  },
  recommendations: {
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.5',
    backgroundColor: '#f7fafc',
    padding: '12px',
    borderRadius: '4px',
    borderLeft: '3px solid #3182ce',
  },
  divider: {
    borderColor: '#e2e8f0',
    marginTop: '20px',
    marginBottom: '20px',
  },
  footer: {
    fontSize: '14px',
    color: '#a0aec0',
    textAlign: 'center' as const,
  },
};
