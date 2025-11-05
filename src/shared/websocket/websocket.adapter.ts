import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalConfig } from '@/config/config.type';

/**
 * WebSocket adapter with Redis support for horizontal scaling
 * Extends IoAdapter to use Redis pub/sub for multi-instance communication
 */
export class WebSocketRedisAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;

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
    const redisHost = this.configService.get('redis.host', { infer: true });
    const redisPort = this.configService.get('redis.port', { infer: true });
    const redisPassword = this.configService.get('redis.password', {
      infer: true,
    });
    const redisUsername = this.configService.get('redis.username', {
      infer: true,
    });

    // Create Redis clients for pub/sub
    const pubClient = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
      },
      username: redisUsername,
      password: redisPassword,
    });

    const subClient = pubClient.duplicate();

    // Connect both clients
    await Promise.all([pubClient.connect(), subClient.connect()]);

    // Create adapter constructor
    this.adapterConstructor = createAdapter(pubClient, subClient);
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
