import { Module } from '@nestjs/common';
import { EmailQueueService } from './email.service';
import { EmailProducer } from './email.producer';
import { EmailConsumer } from './email.consumer';

/**
 * Email Queue Module
 * Provides email queue functionality for both main backend and worker
 * - Producer: Used by main backend to publish email jobs
 * - Consumer: Used by worker to process email jobs
 * - Service: Business logic for sending emails
 *
 * Note: Requires RabbitMQModule to be configured globally in the root module
 * (WorkerModule or AppModule) to provide AmqpConnection
 */
@Module({
  providers: [EmailQueueService, EmailProducer, EmailConsumer],
  exports: [EmailQueueService, EmailProducer],
})
export class EmailQueueModule {}
