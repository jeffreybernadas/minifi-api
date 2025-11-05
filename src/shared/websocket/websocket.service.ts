import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LoggerService } from '@/shared/logger/logger.service';
import {
  WebSocketResponse,
  WebSocketSuccessResponse,
} from '@/common/interfaces/websocket.interface';

/**
 * WebSocket service for managing Socket.IO operations
 * Handles event emission, broadcasting, and room management
 * User tracking is handled by Socket.IO's built-in room system and Redis adapter
 */
@Injectable()
export class WebSocketService {
  private server: Server | null = null;

  constructor(private readonly logger: LoggerService) {}

  /**
   * Set the Socket.IO server instance
   */
  setServer(server: Server): void {
    this.server = server;
    this.logger.log('WebSocket server instance set', 'WebSocketService');
  }

  /**
   * Get the Socket.IO server instance
   */
  getServer(): Server | null {
    return this.server;
  }

  /**
   * Emit event to a specific client
   */
  emitToClient<T>(
    client: Socket,
    event: string,
    data: T,
    meta?: Record<string, unknown>,
  ): void {
    const response = this.createSuccessResponse(data, meta);
    client.emit(event, response);
    this.logger.log(`Emitted event to client: ${event}`, 'WebSocketService', {
      socketId: client.id,
    });
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast<T>(event: string, data: T, meta?: Record<string, unknown>): void {
    if (!this.server) {
      this.logger.warn(
        'Cannot broadcast: Server not initialized',
        'WebSocketService',
      );
      return;
    }

    const response = this.createSuccessResponse(data, meta);
    this.server.emit(event, response);
    this.logger.log(`Broadcasted event: ${event}`, 'WebSocketService');
  }

  /**
   * Emit event to a specific room
   */
  emitToRoom<T>(
    room: string,
    event: string,
    data: T,
    meta?: Record<string, unknown>,
  ): void {
    if (!this.server) {
      this.logger.warn(
        'Cannot emit to room: Server not initialized',
        'WebSocketService',
      );
      return;
    }

    const response = this.createSuccessResponse(data, meta);
    this.server.to(room).emit(event, response);
    this.logger.log(`Emitted event to room: ${room}`, 'WebSocketService', {
      event,
    });
  }

  /**
   * Join a client to a room
   * Socket.IO handles room membership internally
   */
  async joinRoom(client: Socket, room: string): Promise<void> {
    await client.join(room);
    this.logger.log(`Client joined room: ${room}`, 'WebSocketService', {
      socketId: client.id,
    });
  }

  /**
   * Remove a client from a room
   * Socket.IO handles room membership internally
   */
  async leaveRoom(client: Socket, room: string): Promise<void> {
    await client.leave(room);
    this.logger.log(`Client left room: ${room}`, 'WebSocketService', {
      socketId: client.id,
    });
  }

  /**
   * Get all socket IDs in a specific room
   * Uses Socket.IO's built-in room management
   */
  async getRoomSockets(room: string): Promise<string[]> {
    if (!this.server) {
      this.logger.warn(
        'Cannot get room sockets: Server not initialized',
        'WebSocketService',
      );
      return [];
    }

    const sockets = await this.server.in(room).fetchSockets();
    return sockets.map((socket) => socket.id);
  }

  /**
   * Get count of clients in a room
   */
  async getRoomSize(room: string): Promise<number> {
    const sockets = await this.getRoomSockets(room);
    return sockets.length;
  }

  /**
   * Create standardized success response
   */
  private createSuccessResponse<T>(
    data: T,
    meta?: Record<string, unknown>,
  ): WebSocketSuccessResponse<T> {
    const response: WebSocketSuccessResponse<T> = {
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data,
    };

    if (meta) {
      response.meta = meta;
    }

    return response;
  }

  /**
   * Create standardized response (generic)
   */
  createResponse<T>(
    data: T,
    meta?: Record<string, unknown>,
  ): WebSocketResponse<T> {
    return this.createSuccessResponse(data, meta);
  }
}
