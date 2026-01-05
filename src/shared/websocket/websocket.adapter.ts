import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalConfig } from '@/config/config.type';

/**
 * WebSocket adapter with Redis support for horizontal scaling
 * Extends IoAdapter to use Redis pub/sub for multi-instance communication
 */
export class WebSocketRedisAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;
  private pubClient: RedisClientType | undefined;
  private subClient: RedisClientType | undefined;

  constructor(
    app: INestApplicationContext,
    private readonly configService: ConfigService<GlobalConfig>,
  ) {
    super(app);
  }

  /**
   * Connect to Redis and create adapter
   */
  async connectToRedis(): Promise<void> {
    const redisHost = this.configService.getOrThrow('redis.host', {
      infer: true,
    });
    const redisPort = this.configService.getOrThrow('redis.port', {
      infer: true,
    });
    const redisPassword = this.configService.getOrThrow('redis.password', {
      infer: true,
    });
    const redisUsername = this.configService.getOrThrow('redis.username', {
      infer: true,
    });

    // Create Redis clients for pub/sub with reconnect strategy and keepAlive
    this.pubClient = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
        // Enable TCP keepalive to prevent connection timeouts during idle periods
        keepAlive: true,
        keepAliveInitialDelay: 30000, // Send keepalive probe every 30 seconds
        connectTimeout: 10000, // 10 second connection timeout
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return new Error('Redis pub client max retries reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
      username: redisUsername,
      password: redisPassword,
    });

    this.subClient = this.pubClient.duplicate();

    // Attach error handlers to prevent "missing error handler" warnings
    this.pubClient.on('error', () => {});
    this.subClient.on('error', () => {});

    // Connect both clients
    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

    // Create adapter constructor
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
  }

  /**
   * Disconnect Redis clients on shutdown
   */
  async disconnect(): Promise<void> {
    if (this.pubClient?.isOpen) {
      await this.pubClient.quit();
    }
    if (this.subClient?.isOpen) {
      await this.subClient.quit();
    }
  }

  /**
   * Create IO server with Redis adapter
   */
  createIOServer(
    port: number,
    options?: ServerOptions,
  ): ReturnType<IoAdapter['createIOServer']> {
    const server = super.createIOServer(port, options);

    // Apply Redis adapter if connected
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
