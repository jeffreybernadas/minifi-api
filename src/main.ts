import './instrument';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '@/app.module';
import helmet from 'helmet';
import { setupGracefulShutdown } from 'nestjs-graceful-shutdown';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { GlobalConfig } from '@/config/config.type';
import { LoggerService } from '@/shared/logger/logger.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformResponseInterceptor } from '@/interceptors/transform-response.interceptor';
import { WebSocketRedisAdapter } from '@/shared/websocket/websocket.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true, // needed for Stripe webhook signature verification
  });
  const configService = app.get(ConfigService<GlobalConfig>);
  const env = configService.getOrThrow('app.nodeEnv', { infer: true });
  const port = configService.getOrThrow('app.port', { infer: true });

  app.useLogger(app.get(LoggerService));

  // Enable CORS for both HTTP and WebSocket
  const corsOrigin = configService.get('websocket.cors.origin', {
    infer: true,
  });
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.use(helmet());

  // Setup WebSocket adapter with Redis
  const wsAdapter = new WebSocketRedisAdapter(app, configService);
  await wsAdapter.connectToRedis();
  app.useWebSocketAdapter(wsAdapter);

  if (env !== 'local') {
    setupGracefulShutdown({ app });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Setup global interceptors
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Setup global prefix and versioning FIRST
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Setup Swagger documentation AFTER prefix and versioning
  if (env !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NestJS Starter API')
      .setDescription('API documentation for NestJS Starter application')
      .setVersion('1.0')
      .addTag('health', 'Health check endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('upload', 'File management endpoints')
      .addTag('chat', 'Chat management endpoints')
      .addTag('links', 'Link management endpoints')
      .addTag('redirect', 'Public redirect endpoints')
      .addServer(`http://localhost:${port}`, 'Development')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }
  await app.listen(port ?? 3000);
}
bootstrap().catch((error) => {
  console.error('Failed to start the application:', error);
  process.exit(1);
});
