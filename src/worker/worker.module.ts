import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import redisStore from 'cache-manager-redis-store';

// Config imports
import appConfig from '@/config/app/app.config';
import redisConfig from '@/config/redis/redis.config';
import elasticsearchConfig from '@/config/elasticsearch/elasticsearch.config';
import rabbitmqConfig from '@/config/rabbitmq/rabbitmq.config';
import resendConfig from '@/config/resend/resend.config';
import openaiConfig from '@/config/openai/openai.config';

// Shared modules
import { DatabaseModule } from '@/database/database.module';
import { LoggerModule } from '@/shared/logger/logger.module';
import { ResendModule } from '@/shared/mail/resend.module';

// Queue modules
import { EmailQueueModule } from '@/shared/queues/email/email.module';
import { ChatQueueModule } from '@/shared/queues/chat/chat.module';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { QUEUE_EXCHANGES } from '@/shared/queues/constants/queue.constant';
import { LinkSchedulerCron } from '@/shared/queues/link/link-scheduler.cron';
import { ScanQueueModule } from '@/shared/queues/scan/scan.module';
import { ScanConsumer } from '@/shared/queues/scan/scan.consumer';
import { UrlScanService } from '@/shared/scan/url-scan.service';

/**
 * Worker Module
 * Root module for the worker process that handles background tasks
 * - Consumes messages from RabbitMQ queues
 * - Runs scheduled cron jobs
 * - Does NOT expose HTTP endpoints or WebSocket connections
 *
 * Architecture Note:
 * - This is a separate Node.js process from the main backend (AppModule)
 * - RabbitMQModule.forRootAsync() automatically registers AmqpConnection globally
 * - The @Global() decorator + exports makes RabbitMQModule available to child modules
 *   (EmailQueueModule, ChatQueueModule) that need AmqpConnection for consumers/producers
 * - This pattern is necessary because child modules don't import RabbitMQModule directly
 */
@Global()
@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [
        appConfig,
        redisConfig,
        elasticsearchConfig,
        rabbitmqConfig,
        resendConfig,
        openaiConfig,
      ],
    }),

    // Scheduling for cron jobs
    ScheduleModule.forRoot(),

    // Cache module (Redis)
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          store: redisStore,
          host: config.get('redis.host'),
          port: config.get('redis.port'),
          username: config.get('redis.username'),
          password: config.get('redis.password'),
          ttl: 60000,
          no_read_check: true,
        };
      },
    }),

    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get('rabbitmq.uri') as string,
        exchanges: [
          {
            name: QUEUE_EXCHANGES.EMAIL,
            type: 'topic',
          },
          {
            name: QUEUE_EXCHANGES.CHAT,
            type: 'topic',
          },
          {
            name: QUEUE_EXCHANGES.SCAN,
            type: 'topic',
          },
        ],
        connectionInitOptions: { wait: false },
      }),
    }),

    // Resend email service
    ResendModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        apiKey: config.get('resend.apiKey') as string,
      }),
    }),

    // Shared modules
    DatabaseModule,
    LoggerModule,

    // Queue modules (contain consumers and cron jobs)
    EmailQueueModule,
    ChatQueueModule,
    ScanQueueModule,
  ],
  providers: [LinkSchedulerCron, ScanConsumer, UrlScanService],
  exports: [RabbitMQModule],
})
export class WorkerModule {}
