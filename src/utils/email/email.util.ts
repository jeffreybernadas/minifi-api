import { render } from '@react-email/components';
import { TestEmailTemplate } from '@/shared/mail/templates/test-email';
import { ChatUnreadDigestTemplate } from '@/shared/mail/templates/chat-unread-digest';
import { SecurityAlertEmailTemplate } from '@/shared/mail/templates/security-alert-email';
import { LinkExpiringEmailTemplate } from '@/shared/mail/templates/link-expiring-email';
import {
  TestEmailTemplateProps,
  ChatUnreadDigestProps,
  SecurityAlertEmailProps,
  LinkExpiringEmailProps,
} from '@/common/interfaces/email.interface';

/**
 * Email Renderer Utility
 * Renders React Email templates to HTML strings
 */
export class EmailRenderer {
  /**
   * Renders the TestEmail template
   */
  static async renderTestEmail(data?: TestEmailTemplateProps): Promise<string> {
    return await render(TestEmailTemplate(data));
  }

  /**
   * Renders the ChatUnreadDigest template
   */
  static async renderChatUnreadDigest(
    data: ChatUnreadDigestProps,
  ): Promise<string> {
    return await render(ChatUnreadDigestTemplate(data));
  }

  /**
   * Renders the SecurityAlert template
   */
  static async renderSecurityAlert(
    data: SecurityAlertEmailProps,
  ): Promise<string> {
    return await render(SecurityAlertEmailTemplate(data));
  }

  /**
   * Renders the LinkExpiring template
   */
  static async renderLinkExpiring(
    data: LinkExpiringEmailProps,
  ): Promise<string> {
    return await render(LinkExpiringEmailTemplate(data));
  }

  /**
   * Generic method to render any email template by name
   */
  static async renderTemplate<T>(
    templateName: string,
    data?: T,
  ): Promise<string> {
    switch (templateName) {
      case 'test-email':
        return await this.renderTestEmail(data as TestEmailTemplateProps);
      case 'chat-unread-digest':
        return await this.renderChatUnreadDigest(data as ChatUnreadDigestProps);
      case 'security-alert':
        return await this.renderSecurityAlert(data as SecurityAlertEmailProps);
      default:
        throw new Error(`Unknown email template: ${templateName}`);
    }
  }
}
