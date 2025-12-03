import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
  ApiCursorPaginatedResponse,
} from '@/decorators/swagger.decorator';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { WebSocketService } from '@/shared/websocket/websocket.service';
import { WEBSOCKET_EVENTS } from '@/constants/websocket.constant';
import {
  CursorPageOptionsDto,
  CursorPaginatedDto,
} from '@/common/dto/cursor-pagination';
import { KeycloakJWT } from '../user/interfaces/keycloak-jwt.interface';
import { ProTierGuard } from '@/shared/guards/pro-tier.guard';

/**
 * Chat Controller
 *
 * PRO-to-Admin Direct Chat feature:
 * - All endpoints require PRO subscription (ProTierGuard)
 * - Only DIRECT chats are allowed (GROUP blocked in service)
 * - Admin is auto-assigned when creating chat
 */
@ApiTags('chat')
@ApiBearerAuth('JWT')
@UseGuards(ProTierGuard)
@Controller({
  path: 'chat',
  version: '1',
})
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly websocketService: WebSocketService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a direct chat with admin',
    description:
      'Creates a new DIRECT chat with the platform admin. PRO subscription required. The admin is automatically assigned as the other member. If a chat with admin already exists, returns the existing chat instead of creating a duplicate.',
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Chat created successfully (or existing chat returned)',
    type: ChatResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Validation Error - GROUP type not allowed',
    errorCode: 'VALIDATION_ERROR',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - PRO subscription required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Admin user not found',
    errorCode: 'NOT_FOUND',
  })
  async createChat(
    @AuthenticatedUser() user: KeycloakJWT,
    @Body() dto: CreateChatDto,
  ): Promise<ChatResponseDto> {
    const creatorId = user.sub;
    const chat = await this.chatService.createChat(creatorId, dto);

    // Emit WebSocket event to notify all members about the new chat
    // Each member should be listening to their personal notification room
    if (chat.members) {
      chat.members.forEach((member) => {
        this.websocketService.emitToRoom(
          `user:${member.userId}`,
          WEBSOCKET_EVENTS.USER_JOINED_CHAT,
          {
            chatId: chat.id,
            chatName: chat.name,
            chatType: chat.type,
            creatorId: chat.creatorId,
          },
          { userId: member.userId },
        );
      });
    }

    return chat;
  }

  @Get()
  @ApiOperation({
    summary: 'List all chats user belongs to',
    description:
      'Retrieves all chats where the authenticated PRO user is a member. Returns chats ordered by most recently updated first. PRO subscription required.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Chats retrieved successfully',
    type: ChatResponseDto,
    isArray: true,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - PRO subscription required',
    errorCode: 'FORBIDDEN',
  })
  getUserChats(
    @AuthenticatedUser() user: KeycloakJWT,
  ): Promise<ChatResponseDto[]> {
    const userId = user.sub;
    return this.chatService.getUserChats(userId);
  }

  @Get(':chatId')
  @ApiOperation({
    summary: 'Get chat details',
    description:
      'Retrieves detailed information about a specific chat including all members. User must be a member of the chat to access this information.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Chat details retrieved successfully',
    type: ChatResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - User is not a member of this chat',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Chat does not exist',
    errorCode: 'NOT_FOUND',
  })
  getChatById(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('chatId') chatId: string,
  ): Promise<ChatResponseDto> {
    const userId = user.sub;
    return this.chatService.getChatById(chatId, userId);
  }

  @Get(':chatId/messages')
  @ApiOperation({
    summary: 'Fetch chat message history',
    description:
      'Retrieves paginated message history for a chat using cursor-based pagination. User must be a member of the chat. Only non-deleted messages are returned. Supports optional search filtering by message content.',
  })
  @ApiCursorPaginatedResponse(MessageResponseDto)
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - User is not a member of this chat',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Chat does not exist',
    errorCode: 'NOT_FOUND',
  })
  async getChatMessages(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('chatId') chatId: string,
    @Query() cursorPageOptionsDto: CursorPageOptionsDto,
  ): Promise<CursorPaginatedDto<MessageResponseDto>> {
    const userId = user.sub;
    return await this.chatService.getChatMessages(
      chatId,
      userId,
      cursorPageOptionsDto,
    );
  }

  @Post(':chatId/messages')
  @ApiOperation({
    summary: 'Send a message to a chat',
    description:
      'Sends a new message to the specified chat. User must be a member of the chat. The message is saved to the database and broadcast to other chat members via WebSocket in real-time.',
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Validation Error',
    errorCode: 'VALIDATION_ERROR',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - User is not a member of this chat',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Chat does not exist',
    errorCode: 'NOT_FOUND',
  })
  async sendMessage(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('chatId') chatId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const senderId = user.sub;

    // Send message via service (saves to DB)
    const message = await this.chatService.sendMessage(chatId, senderId, dto);

    // Emit WebSocket event to chat room (real-time notification)
    // Room name format: chat:${chatId}
    this.websocketService.emitToRoom(
      `chat:${chatId}`,
      WEBSOCKET_EVENTS.NEW_MESSAGE,
      message,
      {
        senderId,
        chatId,
      },
    );

    return message;
  }

  @Put(':chatId/messages/:messageId')
  @ApiOperation({
    summary: 'Update (edit) a message',
    description:
      'Updates the content of an existing message. Only the original sender can edit their message, and only within 10 minutes of creation. The message must not be deleted. Sets isEdited flag to true.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Message updated successfully',
    type: MessageResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Bad Request - Message is older than 10 minutes',
    errorCode: 'BAD_REQUEST',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description:
      'Forbidden - User is not the sender or not a member of the chat',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description:
      'Not Found - Chat or message does not exist, or message is deleted',
    errorCode: 'NOT_FOUND',
  })
  async updateMessage(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const userId = user.sub;

    // Update message via service
    const updatedMessage = await this.chatService.updateMessage(
      chatId,
      messageId,
      userId,
      dto,
    );

    // Emit WebSocket event to chat room (notify other members)
    this.websocketService.emitToRoom(
      `chat:${chatId}`,
      WEBSOCKET_EVENTS.MESSAGE_UPDATED,
      updatedMessage,
      {
        chatId,
        messageId,
        userId,
      },
    );

    return updatedMessage;
  }

  @Delete(':chatId/messages/:messageId')
  @ApiOperation({
    summary: 'Delete (soft delete) a message',
    description:
      'Soft deletes a message by setting isDeleted flag to true. Only the original sender can delete their message, and only within 10 minutes of creation. The message content is preserved for audit purposes.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Message deleted successfully',
    type: MessageResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Bad Request - Message is older than 10 minutes',
    errorCode: 'BAD_REQUEST',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description:
      'Forbidden - User is not the sender or not a member of the chat',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description:
      'Not Found - Chat or message does not exist, or message is already deleted',
    errorCode: 'NOT_FOUND',
  })
  async deleteMessage(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
  ): Promise<MessageResponseDto> {
    const userId = user.sub;

    // Delete message via service (soft delete)
    const deletedMessage = await this.chatService.deleteMessage(
      chatId,
      messageId,
      userId,
    );

    // Emit WebSocket event to chat room (notify other members)
    this.websocketService.emitToRoom(
      `chat:${chatId}`,
      WEBSOCKET_EVENTS.MESSAGE_DELETED,
      deletedMessage,
      {
        chatId,
        messageId,
        userId,
      },
    );

    return deletedMessage;
  }
}
