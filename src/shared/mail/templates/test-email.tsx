import { TestEmailTemplateProps } from '@/common/interfaces/email.interface';
import {
  Button,
  Html,
  Head,
  Body,
  Container,
  Text,
} from '@react-email/components';
import * as React from 'react';

export const TestEmailTemplate = (props?: TestEmailTemplateProps) => {
  const {
    name = 'User',
    buttonText = 'Click me',
    buttonUrl = 'https://example.com',
  } = props || {};

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ padding: '20px' }}>
          <Text style={{ fontSize: '16px', marginBottom: '20px' }}>
            Hello {name}!
          </Text>
          <Text style={{ fontSize: '14px', marginBottom: '20px' }}>
            This is a test email from your NestJS application.
          </Text>
          <Button
            href={buttonUrl}
            style={{
              background: '#000',
              color: '#fff',
              padding: '12px 20px',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            {buttonText}
          </Button>
        </Container>
      </Body>
    </Html>
  );
};
