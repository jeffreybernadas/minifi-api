import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UseFilters } from '@nestjs/common';
import { ExceptionsFilter } from '@/filters/exceptions.filter';
import { WEBSOCKET_EVENTS } from '@/constants/websocket.constant';
import { LoggerService } from '@/shared/logger/logger.service';
import { ChatService } from './chat.service';

/**
 * Chat-specific WebSocket gateway
 * Handles real-time chat events like typing indicators, read receipts, and online status
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UseFilters(ExceptionsFilter)
export class ChatGateway {
  constructor(
    private readonly logger: LoggerService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * Handle user typing event
   * Broadcasts to all other users in the chat room
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.USER_TYPING)
  handleUserTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string; userId: string },
  ): void {
    const { chatId, userId } = payload;

    if (!chatId || !userId) {
      return;
    }

    // Broadcast to all users in the chat room except the sender
    client.to(`chat:${chatId}`).emit(WEBSOCKET_EVENTS.USER_TYPING, {
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: { chatId, userId },
    });
  }

  /**
   * Handle user stopped typing event
   * Broadcasts to all other users in the chat room
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.USER_STOPPED_TYPING)
  handleUserStoppedTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string; userId: string },
  ): void {
    const { chatId, userId } = payload;

    if (!chatId || !userId) {
      return;
    }

    // Broadcast to all users in the chat room except the sender
    client.to(`chat:${chatId}`).emit(WEBSOCKET_EVENTS.USER_STOPPED_TYPING, {
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: { chatId, userId },
    });
  }

  /**
   * Handle message read event
   * Persists read status to database and broadcasts to all other users in the chat room
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.MESSAGE_READ)
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { chatId: string; messageId: string; userId: string },
  ): Promise<void> {
    const { chatId, messageId, userId } = payload;

    if (!chatId || !messageId || !userId) {
      return;
    }

    try {
      // Persist read status to database
      await this.chatService.markMessageAsRead(messageId, userId);

      // Broadcast to all users in the chat room except the sender
      client.to(`chat:${chatId}`).emit(WEBSOCKET_EVENTS.MESSAGE_READ, {
        success: true,
        statusCode: 200,
        timestamp: new Date().toISOString(),
        data: { chatId, messageId, userId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to mark message as read: ${messageId}`,
        'ChatGateway',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          chatId,
          messageId,
          userId,
        },
      );
    }
  }

  /**
   * Handle bulk messages read event
   * Persists read status to database and broadcasts to all other users in the chat room
   */
  @SubscribeMessage(WEBSOCKET_EVENTS.MESSAGES_READ)
  async handleMessagesRead(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { chatId: string; messageIds: string[]; userId: string },
  ): Promise<void> {
    const { chatId, messageIds, userId } = payload;

    if (!chatId || !messageIds || !Array.isArray(messageIds) || !userId) {
      this.logger.warn(
        'Invalid messages read event payload',
        'ChatGateway',
        payload,
      );
      return;
    }

    try {
      // Persist read status to database (bulk operation)
      await this.chatService.markMessagesAsRead(messageIds, userId);

      // Broadcast to all users in the chat room except the sender
      client.to(`chat:${chatId}`).emit(WEBSOCKET_EVENTS.MESSAGES_READ, {
        success: true,
        statusCode: 200,
        timestamp: new Date().toISOString(),
        data: { chatId, messageIds, userId, count: messageIds.length },
      });
    } catch (error) {
      this.logger.error(
        `Failed to mark messages as read in chat: ${chatId}`,
        'ChatGateway',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          chatId,
          userId,
          messageCount: messageIds.length,
        },
      );
    }
  }
}
