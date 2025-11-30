import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendService } from '@/shared/mail/resend.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { SendEmailJobDto } from './dto/email-job.dto';
import { GlobalConfig } from '@/config/config.type';
import { PrismaService } from '@/database/database.service';

/**
 * Email Queue Service
 * Handles business logic for sending emails
 * Used by the email consumer to process email jobs from the queue
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
   * @param emailJob - Email job data from queue
   * @returns void
   */
  async sendEmail(emailJob: SendEmailJobDto): Promise<void> {
    const defaultSender = this.configService.get('resend.sender', {
      infer: true,
    });

    // Resolve user preference (if userId provided)
    if (emailJob.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: emailJob.userId },
      });

      if (!user) {
        this.logger.warn(
          'User not found, skipping email send',
          'EmailQueueService',
          { userId: emailJob.userId, subject: emailJob.subject },
        );
        return;
      }

      if (!user.emailNotificationsEnabled) {
        this.logger.log(
          'User opted out of email notifications, skipping send',
          'EmailQueueService',
          { userId: emailJob.userId, subject: emailJob.subject },
        );
        return;
      }

      // Prefer canonical email from DB
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
