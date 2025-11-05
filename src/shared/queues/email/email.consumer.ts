import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { LoggerService } from '@/shared/logger/logger.service';
import { EmailQueueService } from './email.service';
import { SendEmailJobDto } from './dto/email-job.dto';
import {
  QUEUE_EXCHANGES,
  QUEUE_NAMES,
  QUEUE_ROUTING_KEYS,
} from '@/shared/queues/constants/queue.constant';

/**
 * Email Consumer
 * Consumes email jobs from RabbitMQ queue and processes them
 * Runs ONLY in the worker process
 */
@Injectable()
export class EmailConsumer {
  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Handle email sending jobs from the queue
   * @param emailJob - Email job data from queue
   * @returns void
   */
  @RabbitSubscribe({
    exchange: QUEUE_EXCHANGES.EMAIL,
    routingKey: QUEUE_ROUTING_KEYS.EMAIL_SEND,
    queue: QUEUE_NAMES.EMAIL_SEND,
    queueOptions: {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000, // 1 hour TTL for messages
        'x-max-length': 10000, // Max 10k messages in queue
      },
    },
  })
  async handleSendEmail(emailJob: SendEmailJobDto): Promise<void> {
    this.logger.log('Processing email job from queue', 'EmailConsumer', {
      to: emailJob.to,
      subject: emailJob.subject,
    });

    try {
      await this.emailQueueService.sendEmail(emailJob);
    } catch (error) {
      this.logger.error('Failed to process email job', 'EmailConsumer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: emailJob.to,
        subject: emailJob.subject,
      });
      // Re-throw to trigger RabbitMQ retry mechanism
      throw error;
    }
  }
}
