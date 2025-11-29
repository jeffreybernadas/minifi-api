import { Global, Module } from '@nestjs/common';
import { ApiModule } from '@/modules/api.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GracefulShutdownModule } from 'nestjs-graceful-shutdown';
import appConfig from '@/config/app/app.config';
import { DatabaseModule } from '@/database/database.module';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { CacheService } from '@/shared/cache/cache.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { APP_INTERCEPTOR, APP_GUARD, APP_FILTER } from '@nestjs/core';
import redisConfig from '@/config/redis/redis.config';
import elasticsearchConfig from '@/config/elasticsearch/elasticsearch.config';
import { ApmInit } from '@/utils/apm/apm.util';
import { ElasticInit } from '@/utils/elasticsearch/elasticsearch.util';
import { LoggerModule } from '@/shared/logger/logger.module';
import { ResendModule } from '@/shared/mail/resend.module';
import resendConfig from '@/config/resend/resend.config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ExceptionsFilter } from '@/filters/exceptions.filter';
import { TransformResponseInterceptor } from '@/interceptors/transform-response.interceptor';
import minioConfig from '@/config/minio/minio.config';
import { NestMinioModule } from '@/shared/storage/minio.module';
import websocketConfig from '@/config/websocket/websocket.config';
import { WebSocketModule } from '@/shared/websocket/websocket.module';
import { UnifiedThrottlerGuard } from '@/shared/guards/unified-throttler.guard';
import {
  AuthGuard,
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard,
} from 'nest-keycloak-connect';
import { KeycloakConfigService } from '@/shared/keycloak/keycloak.service';
import { KeycloakModule } from '@/shared/keycloak/keycloak.module';
import keycloakConfig from '@/config/keycloak/keycloak.config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import rabbitmqConfig from '@/config/rabbitmq/rabbitmq.config';
import { QUEUE_EXCHANGES } from '@/shared/queues/constants/queue.constant';
import { StripeModule } from '@golevelup/nestjs-stripe';
import stripeConfig from '@/config/stripe/stripe.config';
import sentryConfig from '@/config/sentry/sentry.config';
import { SentryModule } from '@sentry/nestjs/setup';
import { ScheduleModule } from '@nestjs/schedule';
import openaiConfig from '@/config/openai/openai.config';

/**
 * App Module
 * Root module for the main backend application
 * - Handles HTTP REST API requests
 * - Manages WebSocket connections
 * - Publishes messages to RabbitMQ queues (consumed by worker process)
 *
 * Architecture Note:
 * - This is a separate Node.js process from the worker (WorkerModule)
 * - Marked as @Global() to make RabbitMQModule available to all child modules
 * - Any module that needs to publish messages to queues can inject AmqpConnection
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [
        appConfig,
        redisConfig,
        elasticsearchConfig,
        resendConfig,
        minioConfig,
        websocketConfig,
        keycloakConfig,
        rabbitmqConfig,
        stripeConfig,
        sentryConfig,
        openaiConfig,
      ],
    }),
    DatabaseModule,
    ApiModule,
    LoggerModule,
    SentryModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          throttlers: [
            {
              ttl: 60000,
              limit: 150,
            },
          ],
          storage: new ThrottlerStorageRedisService(config.get('redis.url')),
        };
      },
    }),
    GracefulShutdownModule.forRoot({
      cleanup: (...args) => {
        console.log('App shutting down...', args);
      },
    }),
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
    ResendModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        apiKey: config.get('resend.apiKey') as string,
      }),
    }),
    NestMinioModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        endPoint: config.get('minio.url') as string,
        port: 443,
        useSSL: true,
        accessKey: config.get('minio.accessKey') as string,
        secretKey: config.get('minio.secretKey') as string,
      }),
    }),
    KeycloakConnectModule.registerAsync({
      useExisting: KeycloakConfigService,
      imports: [KeycloakModule],
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
    StripeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        apiKey: config.get('stripe.apiKey')!,
        // Webhook handled manually in SubscriptionController with @Public() decorator
        // to work with Keycloak AuthGuard
      }),
    }),
    WebSocketModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        port: config.get('websocket.port') as number,
        path: config.get('websocket.path') as string,
        cors: config.get('websocket.cors') as {
          origin: string | string[];
          credentials: boolean;
        },
        redis: {
          host: config.get('redis.host') as string,
          port: config.get('redis.port') as number,
          password: config.get('redis.password') as string,
          username: config.get('redis.username') as string,
        },
        pingTimeout: config.get('websocket.pingTimeout') as number,
        pingInterval: config.get('websocket.pingInterval') as number,
        maxHttpBufferSize: config.get('websocket.maxHttpBufferSize') as number,
        transports: config.get('websocket.transports') as string[],
      }),
    }),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: UnifiedThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ResourceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
    CacheService,
    LoggerService,
    ApmInit,
    ElasticInit,
  ],
  exports: [CacheService, LoggerService, RabbitMQModule, StripeModule],
})
export class AppModule {}
