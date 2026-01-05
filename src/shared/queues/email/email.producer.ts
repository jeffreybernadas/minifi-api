import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { LoggerService } from '@/shared/logger/logger.service';
import { SendEmailJobDto } from './dto/email-job.dto';
import {
  QUEUE_EXCHANGES,
  QUEUE_ROUTING_KEYS,
} from '@/shared/queues/constants/queue.constant';

/**
 * Email Producer
 * Publishes email jobs to RabbitMQ queue
 * Used by main backend or worker to queue email sending tasks
 */
@Injectable()
export class EmailProducer {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Publish an email job to the queue
   * @param emailJob - Email job data
   * @returns void
   */
  async publishSendEmail(emailJob: SendEmailJobDto): Promise<void> {
    try {
      await this.amqpConnection.publish(
        QUEUE_EXCHANGES.EMAIL,
        QUEUE_ROUTING_KEYS.EMAIL_SEND,
        emailJob,
      );
    } catch (error) {
      this.logger.error('Failed to publish email job', 'EmailProducer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: emailJob.to,
        subject: emailJob.subject,
      });
      throw error;
    }
  }
}
