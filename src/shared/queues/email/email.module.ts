import { Module } from '@nestjs/common';
import { EmailQueueService } from './email.service';
import { EmailProducer } from './email.producer';
import { EmailConsumer } from './email.consumer';
import { DatabaseModule } from '@/database/database.module';

/**
 * Email Queue Module
 * Handles async email sending via RabbitMQ.
 *
 * Features:
 * - Async email delivery via queue
 * - User opt-out check (if userId provided)
 * - Retry on failure
 *
 * Usage:
 * 1. Render template using EmailRenderer utility
 * 2. Publish via EmailProducer.publishSendEmail()
 */
@Module({
  imports: [DatabaseModule],
  providers: [EmailQueueService, EmailProducer, EmailConsumer],
  exports: [EmailQueueService, EmailProducer],
})
export class EmailQueueModule {}
