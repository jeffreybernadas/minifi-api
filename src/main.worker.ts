import './instrument';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from '@/worker/worker.module';
import { LoggerService } from '@/shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { GlobalConfig } from '@/config/config.type';

/**
 * Worker Process Bootstrap
 * This is a separate Node.js process that handles background tasks:
 * - Consumes messages from RabbitMQ queues
 * - Runs scheduled cron jobs
 * - Does NOT expose HTTP endpoints or WebSocket connections
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService<GlobalConfig>);
  const logger = app.get(LoggerService);
  const env = configService.getOrThrow('app.nodeEnv', { infer: true });
  const appName = configService.getOrThrow('app.name', { infer: true });

  app.useLogger(logger);

  logger.log('Worker process started', 'WorkerBootstrap', {
    environment: env,
    appName,
    processId: process.pid,
  });

  // Graceful shutdown handlers
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM signal received: closing worker', 'WorkerBootstrap');
    await app.close();
    process.exit(0);
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  process.on('SIGINT', async () => {
    logger.log('SIGINT signal received: closing worker', 'WorkerBootstrap');
    await app.close();
    process.exit(0);
  });

  // Keep the process running
  await app.init();
}

bootstrap().catch((error) => {
  console.error('Failed to start the worker process:', error);
  process.exit(1);
});
