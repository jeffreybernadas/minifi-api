import {
  WebSocketGateway as NestWebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LoggerService } from '@/shared/logger/logger.service';
import { WebSocketService } from './websocket.service';
import { PresenceService } from './presence.service';
import { UseFilters } from '@nestjs/common';
import { ExceptionsFilter } from '@/filters/exceptions.filter';
import { WEBSOCKET_EVENTS } from '@/constants/websocket.constant';
import { KeycloakAuthService } from '@/shared/keycloak/keycloak-auth.service';
import { PrismaService } from '@/database/database.service';

/**
 * Main WebSocket gateway handling connections and system events
 * Connection tracking is handled by Socket.IO and Redis adapter
 */
@NestWebSocketGateway({
  cors: {
    origin: '*', // Will be overridden by config in main.ts
    credentials: true,
  },
})
@UseFilters(ExceptionsFilter)
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly logger: LoggerService,
    private readonly websocketService: WebSocketService,
    private readonly presenceService: PresenceService,
    private readonly keycloakAuthService: KeycloakAuthService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Called after the gateway is initialized
   */
  afterInit(server: Server): void {
    this.websocketService.setServer(server);
    this.logger.log('WebSocket Gateway initialized', 'WebSocketGateway');
  }

  /**
   * Handle new client connections
   */
  async handleConnection(client: Socket): Promise<void> {
    const socketId = client.id;
    const clientAddress = client.handshake.address;

    this.logger.log('Client connected', 'WebSocketGateway', {
      socketId,
      clientAddress,
    });

    const token = client.handshake.auth?.token;
    const isAuthenticated = await this.authenticateSocket(client, token);
    if (!isAuthenticated) {
      client.disconnect(true);
      return;
    }

    // Track presence and broadcast status change
    const user = client.data.user;
    if (user?.sub) {
      const userId = user.sub;
      const isAdmin = this.keycloakAuthService.isAdmin(user);

      // Track in Redis
      const wasOffline = await this.presenceService.userConnected(
        userId,
        socketId,
        isAdmin,
      );

      // Auto-join user's personal room
      await client.join(`user:${userId}`);

      // Auto-join admin room if admin
      if (isAdmin) {
        await client.join('room:admins');
      }

      // Broadcast if user came online (was offline before)
      if (wasOffline) {
        if (isAdmin) {
          // Broadcast to ALL connected users that an admin came online
          this.server.emit(WEBSOCKET_EVENTS.PRESENCE_ADMIN_ONLINE, {
            success: true,
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: { userId },
          });
        } else {
          // Broadcast to admin room that this user came online
          this.server
            .to('room:admins')
            .emit(WEBSOCKET_EVENTS.PRESENCE_USER_ONLINE, {
              success: true,
              statusCode: 200,
              timestamp: new Date().toISOString(),
              data: { userId },
            });
        }
      }
    }

    // Emit connection success to client
    client.emit(WEBSOCKET_EVENTS.CONNECTED, {
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: {
        socketId,
        message: 'Connected successfully',
      },
    });
  }

  /**
   * Handle client disconnections
   */
  async handleDisconnect(client: Socket): Promise<void> {
    const socketId = client.id;

    this.logger.log('Client disconnected', 'WebSocketGateway', {
      socketId,
    });

    // Track disconnection and broadcast if user is now fully offline
    const result = await this.presenceService.userDisconnected(socketId);
    if (result?.nowOffline) {
      if (result.isAdmin) {
        // Broadcast to ALL connected users that an admin went offline
        this.server.emit(WEBSOCKET_EVENTS.PRESENCE_ADMIN_OFFLINE, {
          success: true,
          statusCode: 200,
          timestamp: new Date().toISOString(),
          data: { userId: result.userId },
        });
      } else {
        // Broadcast to admin room that this user went offline
        this.server
          .to('room:admins')
          .emit(WEBSOCKET_EVENTS.PRESENCE_USER_OFFLINE, {
            success: true,
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: { userId: result.userId },
          });
      }
    }
  }

  /**
   * Handle ping events from clients
   * Also refreshes presence TTL to keep user online
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.PING)
  async handlePing(@ConnectedSocket() client: Socket): Promise<void> {
    // Refresh presence TTL
    await this.presenceService.refreshPresence(client.id);

    this.websocketService.emitToClient(client, WEBSOCKET_EVENTS.PONG, {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle authentication events (placeholder for future Keycloak integration)
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.AUTHENTICATE)
  async handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { token?: string },
  ): Promise<void> {
    await this.authenticateSocket(client, payload.token);
  }

  private async authenticateSocket(
    client: Socket,
    token?: string,
  ): Promise<boolean> {
    if (!token) {
      this.websocketService.emitToClient(client, WEBSOCKET_EVENTS.ERROR, {
        success: false,
        statusCode: 401,
        timestamp: new Date().toISOString(),
        error: {
          code: 'WS_AUTHENTICATION_REQUIRED',
          message: 'Access token is required for authentication',
        },
      });
      return false;
    }

    try {
      const user = await this.keycloakAuthService.validateToken(token);

      if (!user?.sub) {
        throw new Error('Invalid or expired token');
      }

      client.data.user = user;
      this.websocketService.emitToClient(
        client,
        WEBSOCKET_EVENTS.AUTHENTICATED,
        {
          message: 'Authentication successful',
          userId: user.sub,
        },
      );
      return true;
    } catch (err) {
      this.logger.warn('WebSocket authentication failed', 'WebSocketGateway', {
        socketId: client.id,
        error: err instanceof Error ? err.message : String(err),
      });
      this.websocketService.emitToClient(client, WEBSOCKET_EVENTS.ERROR, {
        success: false,
        statusCode: 401,
        timestamp: new Date().toISOString(),
        error: {
          code: 'WS_AUTHENTICATION_FAILED',
          message: 'Invalid or expired access token',
        },
      });
      return false;
    }
  }

  /**
   * Handle join room events
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.JOIN_ROOM)
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string },
  ): Promise<void> {
    const { room } = payload;
    const userId = client.data.user?.sub;

    if (!room) {
      this.websocketService.emitToClient(client, WEBSOCKET_EVENTS.ERROR, {
        success: false,
        statusCode: 400,
        timestamp: new Date().toISOString(),
        error: {
          code: 'WS_INVALID_EVENT',
          message: 'Room name is required',
        },
      });
      return;
    }

    // Validate chat room membership to prevent unauthorized access
    if (room.startsWith('chat:')) {
      const chatId = room.replace('chat:', '');
      const isMember = await this.prisma.chatMember.findFirst({
        where: { chatId, userId },
      });

      if (!isMember) {
        this.websocketService.emitToClient(client, WEBSOCKET_EVENTS.ERROR, {
          success: false,
          statusCode: 403,
          timestamp: new Date().toISOString(),
          error: {
            code: 'WS_UNAUTHORIZED',
            message: 'Not a member of this chat',
          },
        });
        return;
      }
    }

    await this.websocketService.joinRoom(client, room);
    this.websocketService.emitToClient(client, WEBSOCKET_EVENTS.JOINED_ROOM, {
      room,
      message: `Successfully joined room: ${room}`,
    });
  }

  /**
   * Handle leave room events
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.LEAVE_ROOM)
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string },
  ): Promise<void> {
    const { room } = payload;

    if (!room) {
      this.websocketService.emitToClient(client, WEBSOCKET_EVENTS.ERROR, {
        success: false,
        statusCode: 400,
        timestamp: new Date().toISOString(),
        error: {
          code: 'WS_INVALID_EVENT',
          message: 'Room name is required',
        },
      });
      return;
    }

    await this.websocketService.leaveRoom(client, room);
    this.websocketService.emitToClient(client, WEBSOCKET_EVENTS.LEFT_ROOM, {
      room,
      message: `Successfully left room: ${room}`,
    });
  }

  /**
   * Handle get online users event
   * Returns socket IDs in a room or total connected clients
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.GET_ONLINE_USERS)
  async handleGetOnlineUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room?: string },
  ): Promise<void> {
    const { room } = payload;

    if (room) {
      const socketIds = await this.websocketService.getRoomSockets(room);
      this.websocketService.emitToClient(
        client,
        WEBSOCKET_EVENTS.ONLINE_USERS,
        {
          room,
          socketIds,
          count: socketIds.length,
        },
      );
    } else {
      // Return all connected clients
      const sockets = await this.server.fetchSockets();
      this.websocketService.emitToClient(
        client,
        WEBSOCKET_EVENTS.ONLINE_USERS,
        {
          count: sockets.length,
        },
      );
    }
  }

  /**
   * Handle get presence event
   * Returns online status for admins (for regular users) or specific users (for admins)
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.GET_PRESENCE)
  async handleGetPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userIds?: string[] },
  ): Promise<void> {
    const user = client.data.user;
    if (!user?.sub) return;

    const isAdmin = this.keycloakAuthService.isAdmin(user);

    if (isAdmin && payload.userIds && payload.userIds.length > 0) {
      // Admin requesting status of specific users
      const onlineUserIds = await this.presenceService.getOnlineUserIds(
        payload.userIds,
      );
      client.emit(WEBSOCKET_EVENTS.PRESENCE_STATUS, {
        success: true,
        statusCode: 200,
        timestamp: new Date().toISOString(),
        data: { onlineUserIds },
      });
    } else {
      // Regular user requesting admin status
      const isAdminOnline = await this.presenceService.isAnyAdminOnline();
      client.emit(WEBSOCKET_EVENTS.PRESENCE_STATUS, {
        success: true,
        statusCode: 200,
        timestamp: new Date().toISOString(),
        data: { isAdminOnline },
      });
    }
  }
}
