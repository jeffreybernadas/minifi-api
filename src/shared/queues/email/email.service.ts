import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendService } from '@/shared/mail/resend.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { PrismaService } from '@/database/database.service';
import { SendEmailJobDto } from './dto/email-job.dto';
import { GlobalConfig } from '@/config/config.type';

/**
 * Email Queue Service
 * Handles email sending with user opt-out checks.
 */
@Injectable()
export class EmailQueueService {
  constructor(
    private readonly resendService: ResendService,
    private readonly configService: ConfigService<GlobalConfig>,
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Send an email using Resend service
   *
   * If userId is provided:
   * - Checks user's emailNotificationsEnabled preference
   * - Uses canonical email from database
   * - Skips send if user opted out
   *
   * @param emailJob - Email job data from queue
   */
  async sendEmail(emailJob: SendEmailJobDto): Promise<void> {
    const defaultSender = this.configService.getOrThrow('resend.sender', {
      infer: true,
    });

    // Check user opt-out preference if userId provided
    if (emailJob.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: emailJob.userId },
        select: { email: true, emailNotificationsEnabled: true },
      });

      if (!user) {
        return;
      }

      if (!user.emailNotificationsEnabled) {
        this.logger.log(
          'User opted out of emails, skipping',
          'EmailQueueService',
          { userId: emailJob.userId, subject: emailJob.subject },
        );
        return;
      }

      // Use canonical email from database
      emailJob.to = user.email;
    }

    try {
      await this.resendService.send({
        from: emailJob.from ?? defaultSender ?? 'noreply@example.com',
        to: emailJob.to,
        subject: emailJob.subject,
        html: emailJob.html,
      });

      this.logger.log('Email sent successfully', 'EmailQueueService', {
        to: emailJob.to,
        subject: emailJob.subject,
      });
    } catch (error) {
      this.logger.error('Failed to send email', 'EmailQueueService', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: emailJob.to,
        subject: emailJob.subject,
      });
      throw error;
    }
  }
}
