import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendService } from '@/shared/mail/resend.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { SendEmailJobDto } from './dto/email-job.dto';
import { GlobalConfig } from '@/config/config.type';

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
