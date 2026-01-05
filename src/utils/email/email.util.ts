import { render } from '@react-email/components';
import { TestEmailTemplate } from '@/shared/mail/templates/test-email';
import { ChatUnreadDigestTemplate } from '@/shared/mail/templates/chat-unread-digest';
import { SecurityAlertEmailTemplate } from '@/shared/mail/templates/security-alert-email';
import { LinkExpiringEmailTemplate } from '@/shared/mail/templates/link-expiring-email';
import { WelcomeEmailTemplate } from '@/shared/mail/templates/welcome-email';
import { MonthlyReportEmailTemplate } from '@/shared/mail/templates/monthly-report-email';
import { SubscriptionEmailTemplate } from '@/shared/mail/templates/subscription-email';
import { LinkDeletionWarningEmailTemplate } from '@/shared/mail/templates/link-deletion-warning-email';
import { FreeMonthlyReportEmailTemplate } from '@/shared/mail/templates/free-monthly-report-email';
import {
  TestEmailTemplateProps,
  ChatUnreadDigestProps,
  SecurityAlertEmailProps,
  LinkExpiringEmailProps,
  WelcomeEmailProps,
  MonthlyReportEmailProps,
  SubscriptionEmailProps,
  LinkDeletionWarningEmailProps,
  FreeMonthlyReportEmailProps,
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
   * Renders the Welcome template
   */
  static async renderWelcome(data: WelcomeEmailProps): Promise<string> {
    return await render(WelcomeEmailTemplate(data));
  }

  /**
   * Renders the MonthlyReport template
   */
  static async renderMonthlyReport(
    data: MonthlyReportEmailProps,
  ): Promise<string> {
    return await render(MonthlyReportEmailTemplate(data));
  }

  /**
   * Renders the Subscription template
   */
  static async renderSubscription(
    data: SubscriptionEmailProps,
  ): Promise<string> {
    return await render(SubscriptionEmailTemplate(data));
  }

  /**
   * Renders the LinkDeletionWarning template (FREE users)
   */
  static async renderLinkDeletionWarning(
    data: LinkDeletionWarningEmailProps,
  ): Promise<string> {
    return await render(LinkDeletionWarningEmailTemplate(data));
  }

  /**
   * Renders the FreeMonthlyReport template (FREE users)
   */
  static async renderFreeMonthlyReport(
    data: FreeMonthlyReportEmailProps,
  ): Promise<string> {
    return await render(FreeMonthlyReportEmailTemplate(data));
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
