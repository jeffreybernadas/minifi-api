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
import { UseFilters } from '@nestjs/common';
import { ExceptionsFilter } from '@/filters/exceptions.filter';
import { WEBSOCKET_EVENTS } from '@/constants/websocket.constant';

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
  handleConnection(client: Socket): void {
    const socketId = client.id;
    const clientAddress = client.handshake.address;

    this.logger.log('Client connected', 'WebSocketGateway', {
      socketId,
      clientAddress,
    });

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
  handleDisconnect(client: Socket): void {
    const socketId = client.id;

    this.logger.log('Client disconnected', 'WebSocketGateway', {
      socketId,
    });
  }

  /**
   * Handle ping events from clients
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.PING)
  handlePing(@ConnectedSocket() client: Socket): void {
    this.websocketService.emitToClient(client, WEBSOCKET_EVENTS.PONG, {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle authentication events (placeholder for future Keycloak integration)
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.AUTHENTICATE)
  handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { token?: string; userId?: string },
  ): void {
    // TODO: Implement Keycloak token validation when auth is added
    if (payload.userId) {
      this.websocketService.emitToClient(
        client,
        WEBSOCKET_EVENTS.AUTHENTICATED,
        {
          message: 'Authentication successful',
          userId: payload.userId,
        },
      );
    } else {
      this.websocketService.emitToClient(client, WEBSOCKET_EVENTS.ERROR, {
        success: false,
        statusCode: 401,
        timestamp: new Date().toISOString(),
        error: {
          code: 'WS_AUTHENTICATION_REQUIRED',
          message: 'User ID is required for authentication',
        },
      });
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
}
