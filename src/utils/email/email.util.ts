import { render } from '@react-email/components';
import { TestEmailTemplate } from '@/shared/mail/templates/test-email';
import { ChatUnreadDigestTemplate } from '@/shared/mail/templates/chat-unread-digest';
import {
  TestEmailTemplateProps,
  ChatUnreadDigestProps,
} from '@/common/interfaces/email.interface';

export class EmailRenderer {
  /**
   * Renders the TestEmail template
   * @param data - Optional data to pass to the template
   * @returns Rendered HTML string
   */
  static async renderTestEmail(data?: TestEmailTemplateProps): Promise<string> {
    return await render(TestEmailTemplate(data));
  }

  /**
   * Renders the ChatUnreadDigest template
   * @param data - Data to pass to the template
   * @returns Rendered HTML string
   */
  static async renderChatUnreadDigest(
    data: ChatUnreadDigestProps,
  ): Promise<string> {
    return await render(ChatUnreadDigestTemplate(data));
  }

  /**
   * Generic method to render any email template
   * @param templateName - Name of the template to render
   * @param data - Data to pass to the template
   * @returns Rendered HTML string
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
      default:
        throw new Error(`Unknown email template: ${templateName}`);
    }
  }
}
