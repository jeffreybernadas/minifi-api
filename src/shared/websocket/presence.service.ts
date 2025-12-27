import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { GlobalConfig } from '@/config/config.type';
import { LoggerService } from '@/shared/logger/logger.service';

/**
 * Presence tracking service using Redis
 * Tracks which users are online (connected via WebSocket)
 *
 * Redis key patterns:
 * - presence:socket:{socketId} -> JSON { userId, isAdmin } (for disconnect lookup)
 * - presence:user:{userId} -> SET of socketIds
 * - presence:admins -> SET of admin userIds currently online
 *
 * All keys have TTL as safety net for ungraceful shutdowns.
 * Keys are refreshed on each heartbeat (Socket.IO ping/pong).
 */
@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  private redis: RedisClientType;
  private pingInterval: NodeJS.Timeout | null = null;

  // TTL for presence keys (5 minutes) - refreshed by Socket.IO ping/pong
  private readonly PRESENCE_TTL_SECONDS = 300;
  // Ping interval to keep Redis connection alive (30 seconds)
  private readonly PING_INTERVAL_MS = 30000;

  constructor(
    private readonly configService: ConfigService<GlobalConfig>,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisHost = this.configService.get('redis.host', { infer: true });
    const redisPort = this.configService.get('redis.port', { infer: true });
    const redisPassword = this.configService.get('redis.password', {
      infer: true,
    });
    const redisUsername = this.configService.get('redis.username', {
      infer: true,
    });

    this.redis = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
        keepAlive: true,
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
          if (retries > 20) {
            this.logger.error(
              'Presence Redis max retries reached, giving up',
              'PresenceService',
            );
            return new Error('Presence Redis client max retries reached');
          }
          const delay = Math.min(retries * 500, 5000);
          this.logger.warn(
            `Presence Redis reconnecting in ${delay}ms (attempt ${retries})`,
            'PresenceService',
          );
          return delay;
        },
      },
      username: redisUsername,
      password: redisPassword,
    });

    this.redis.on('error', (err) => {
      this.logger.error('Presence Redis error', 'PresenceService', {
        error: err?.message || String(err),
      });
    });

    this.redis.on('reconnecting', () => {
      this.logger.warn('Presence Redis reconnecting...', 'PresenceService');
    });

    this.redis.on('ready', () => {
      this.logger.log('Presence Redis ready', 'PresenceService');
    });

    await this.redis.connect();
    this.logger.log('Presence Redis connected', 'PresenceService');

    // Start ping interval to keep connection alive
    this.startPingInterval();

    // Clean up stale presence data from previous server runs
    // Socket connections don't survive restarts, but Redis data does
    await this.clearAllPresenceData();
  }

  /**
   * Start a periodic ping to keep the Redis connection alive
   * This prevents idle timeout disconnections
   */
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.redis?.isOpen) {
        this.redis.ping().catch((error) => {
          this.logger.warn('Presence Redis ping failed', 'PresenceService', {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }, this.PING_INTERVAL_MS);
  }

  /**
   * Clear all presence data - used on server startup
   * This ensures we start fresh since socket connections don't persist across restarts
   */
  private async clearAllPresenceData(): Promise<void> {
    try {
      // Find and delete all presence keys
      const socketKeys = await this.redis.keys('presence:socket:*');
      const userKeys = await this.redis.keys('presence:user:*');

      const keysToDelete = [...socketKeys, ...userKeys, 'presence:admins'];

      if (keysToDelete.length > 0) {
        await this.redis.del(keysToDelete);
        this.logger.log(
          `Cleared ${keysToDelete.length} stale presence keys on startup`,
          'PresenceService',
        );
      }
    } catch (error) {
      this.logger.warn(
        'Failed to clear presence data on startup',
        'PresenceService',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.redis?.isOpen) {
      await this.redis.quit();
      this.logger.log('Presence Redis disconnected', 'PresenceService');
    }
  }

  /**
   * Track user connection
   * Returns true if user was offline before (first connection)
   */
  async userConnected(
    userId: string,
    socketId: string,
    isAdmin: boolean,
  ): Promise<boolean> {
    const userKey = `presence:user:${userId}`;
    const socketKey = `presence:socket:${socketId}`;

    // Check if user was offline (no existing sockets)
    const existingSockets = await this.redis.sCard(userKey);
    const wasOffline = existingSockets === 0;

    // Store socket -> user mapping with TTL (for disconnect lookup)
    await this.redis.set(socketKey, JSON.stringify({ userId, isAdmin }), {
      EX: this.PRESENCE_TTL_SECONDS,
    });

    // Add socket to user's socket set
    await this.redis.sAdd(userKey, socketId);
    await this.redis.expire(userKey, this.PRESENCE_TTL_SECONDS);

    // Track admin in admins set
    if (isAdmin) {
      await this.redis.sAdd('presence:admins', userId);
      await this.redis.expire('presence:admins', this.PRESENCE_TTL_SECONDS);
    }

    this.logger.log(
      `User connected: ${userId} (socket: ${socketId}, admin: ${isAdmin}, wasOffline: ${wasOffline})`,
      'PresenceService',
    );

    return wasOffline;
  }

  /**
   * Refresh presence TTL - called on ping/pong
   * Keeps presence data alive for connected sockets
   */
  async refreshPresence(socketId: string): Promise<void> {
    const socketKey = `presence:socket:${socketId}`;
    const socketData = await this.redis.get(socketKey);

    if (!socketData) return;

    const { userId, isAdmin } = JSON.parse(socketData) as {
      userId: string;
      isAdmin: boolean;
    };

    const userKey = `presence:user:${userId}`;

    // Refresh TTLs
    await this.redis.expire(socketKey, this.PRESENCE_TTL_SECONDS);
    await this.redis.expire(userKey, this.PRESENCE_TTL_SECONDS);

    if (isAdmin) {
      await this.redis.expire('presence:admins', this.PRESENCE_TTL_SECONDS);
    }
  }

  /**
   * Track user disconnection
   * Returns user info and whether they are now fully offline
   */
  async userDisconnected(
    socketId: string,
  ): Promise<{ userId: string; isAdmin: boolean; nowOffline: boolean } | null> {
    const socketKey = `presence:socket:${socketId}`;

    // Get user info from socket mapping
    const socketData = await this.redis.get(socketKey);
    if (!socketData) {
      return null;
    }

    const { userId, isAdmin } = JSON.parse(socketData) as {
      userId: string;
      isAdmin: boolean;
    };

    const userKey = `presence:user:${userId}`;

    // Remove socket from user's socket set
    await this.redis.sRem(userKey, socketId);

    // Delete socket mapping
    await this.redis.del(socketKey);

    // Check if user has any remaining sockets
    const remainingSockets = await this.redis.sCard(userKey);
    const nowOffline = remainingSockets === 0;

    // Remove from admins set if admin is now offline
    if (isAdmin && nowOffline) {
      await this.redis.sRem('presence:admins', userId);
    }

    this.logger.log(
      `User disconnected: ${userId} (socket: ${socketId}, nowOffline: ${nowOffline})`,
      'PresenceService',
    );

    return { userId, isAdmin, nowOffline };
  }

  /**
   * Check if any admin is online
   */
  async isAnyAdminOnline(): Promise<boolean> {
    const adminCount = await this.redis.sCard('presence:admins');
    return adminCount > 0;
  }

  /**
   * Get which users from a list are currently online
   * Uses Redis pipeline to batch all SCARD commands in a single round trip
   */
  async getOnlineUserIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];

    // Use pipeline to batch all SCARD commands
    const pipeline = this.redis.multi();
    for (const userId of userIds) {
      pipeline.sCard(`presence:user:${userId}`);
    }

    const results = await pipeline.exec();

    // Filter users who have at least one socket connected
    return userIds.filter((_, index) => {
      const count = Number(results[index]) || 0;
      return count > 0;
    });
  }

  /**
   * Get all online admin user IDs
   */
  async getOnlineAdminIds(): Promise<string[]> {
    const adminIds = await this.redis.sMembers('presence:admins');
    return adminIds;
  }
}
