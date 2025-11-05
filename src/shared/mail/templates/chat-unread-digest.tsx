import { ChatUnreadDigestProps } from '@/common/interfaces/email.interface';
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Section,
  Heading,
  Hr,
} from '@react-email/components';
import * as React from 'react';

export const ChatUnreadDigestTemplate = (props: ChatUnreadDigestProps) => {
  const { unreadChats, totalUnreadCount } = props;

  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            You have {totalUnreadCount} unread message
            {totalUnreadCount > 1 ? 's' : ''}
          </Heading>

          <Text style={styles.intro}>
            Here's a summary of your unread messages from today:
          </Text>

          {unreadChats.map((chat, index) => (
            <Section key={chat.chatId} style={styles.chatSection}>
              <Text style={styles.chatName}>
                {chat.chatName}
                <span style={styles.unreadBadge}>
                  {chat.unreadCount} unread
                </span>
              </Text>

              <Text style={styles.lastMessage}>
                "{chat.lastMessageContent.substring(0, 100)}
                {chat.lastMessageContent.length > 100 ? '...' : ''}"
              </Text>

              {index < unreadChats.length - 1 && <Hr style={styles.divider} />}
            </Section>
          ))}

          <Text style={styles.footer}>
            Open your chat app to read and respond to these messages.
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
  chatSection: {
    marginBottom: '20px',
  },
  chatName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
  },
  unreadBadge: {
    display: 'inline-block',
    marginLeft: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#3182ce',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  lastMessage: {
    fontSize: '14px',
    color: '#718096',
    fontStyle: 'italic',
    marginTop: '8px',
    lineHeight: '1.5',
  },
  divider: {
    borderColor: '#e2e8f0',
    marginTop: '20px',
    marginBottom: '20px',
  },
  footer: {
    fontSize: '14px',
    color: '#a0aec0',
    marginTop: '40px',
    textAlign: 'center' as const,
  },
};
