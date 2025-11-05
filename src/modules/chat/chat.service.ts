import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/database/database.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ChatType } from '@prisma/client';
import {
  CursorPageOptionsDto,
  CursorPaginatedDto,
} from '@/common/dto/cursor-pagination';
import { cursorPaginateWithPrisma } from '@/utils/pagination/prisma-pagination.util';
import { Order } from '@/constants/app.constant';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a new chat (GROUP or DIRECT)
   * @param creatorId - Keycloak user ID of the creator
   * @param dto - Chat creation data
   * @returns Created chat with members
   */
  async createChat(
    creatorId: string,
    dto: CreateChatDto,
  ): Promise<ChatResponseDto> {
    // Validate GROUP chat has a name
    if (dto.type === ChatType.GROUP && !dto.name) {
      throw new BadRequestException('Group chats must have a name');
    }

    // Validate DIRECT chat has exactly 1 other member
    if (dto.type === ChatType.DIRECT && dto.memberIds.length !== 1) {
      throw new BadRequestException(
        'Direct chats must have exactly 1 other member',
      );
    }

    // Remove duplicates and ensure creator is not in memberIds
    const uniqueMemberIds = Array.from(
      new Set(dto.memberIds.filter((id) => id !== creatorId)),
    );

    // Validate we still have the right number of members after deduplication
    if (dto.type === ChatType.DIRECT && uniqueMemberIds.length !== 1) {
      throw new BadRequestException(
        'Direct chats must have exactly 1 other member (excluding creator)',
      );
    }

    if (uniqueMemberIds.length === 0) {
      throw new BadRequestException('Chat must have at least one other member');
    }

    // Create chat and members in a transaction
    const chat = await this.prisma.$transaction(async (tx) => {
      // Create the chat
      const newChat = await tx.chat.create({
        data: {
          name: dto.name,
          type: dto.type,
          creatorId,
        },
      });

      // Prepare member data: creator + other members
      const memberData = [
        { chatId: newChat.id, userId: creatorId },
        ...uniqueMemberIds.map((userId) => ({
          chatId: newChat.id,
          userId,
        })),
      ];

      // Create all members
      await tx.chatMember.createMany({
        data: memberData,
      });

      // Fetch the created chat with members
      const chatWithMembers = await tx.chat.findUnique({
        where: { id: newChat.id },
        include: {
          members: {
            orderBy: { joinedAt: 'asc' },
          },
        },
      });

      return chatWithMembers;
    });

    this.logger.log(`Chat created: ${chat!.id}`, 'ChatService', {
      chatId: chat!.id,
      type: chat!.type,
      creatorId,
      memberCount: chat!.members.length,
    });

    return {
      id: chat!.id,
      name: chat!.name,
      type: chat!.type,
      creatorId: chat!.creatorId,
      createdAt: chat!.createdAt,
      updatedAt: chat!.updatedAt,
      members: chat!.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        joinedAt: member.joinedAt,
      })),
    };
  }

  /**
   * Get all chats the user belongs to
   * @param userId - Keycloak user ID
   * @returns List of chats the user is a member of
   */
  async getUserChats(userId: string): Promise<ChatResponseDto[]> {
    // Find all chats where the user is a member
    const chatMembers = await this.prisma.chatMember.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            members: {
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
      },
      orderBy: {
        chat: {
          updatedAt: 'desc',
        },
      },
    });

    this.logger.log(
      `Retrieved ${chatMembers.length} chats for user`,
      'ChatService',
      {
        userId,
        chatCount: chatMembers.length,
      },
    );

    return chatMembers.map((chatMember) => ({
      id: chatMember.chat.id,
      name: chatMember.chat.name,
      type: chatMember.chat.type,
      creatorId: chatMember.chat.creatorId,
      createdAt: chatMember.chat.createdAt,
      updatedAt: chatMember.chat.updatedAt,
      members: chatMember.chat.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        joinedAt: member.joinedAt,
      })),
    }));
  }

  /**
   * Get detailed information about a specific chat
   * @param chatId - Chat ID
   * @param userId - Keycloak user ID of the requesting user
   * @returns Chat details with all members
   */
  async getChatById(chatId: string, userId: string): Promise<ChatResponseDto> {
    // Check if chat exists
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    // Check if user is a member of the chat
    const isMember = chat.members.some((member) => member.userId === userId);

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    this.logger.log(`Retrieved chat details: ${chatId}`, 'ChatService', {
      chatId,
      userId,
      type: chat.type,
      memberCount: chat.members.length,
    });

    return {
      id: chat.id,
      name: chat.name,
      type: chat.type,
      creatorId: chat.creatorId,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      members: chat.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        joinedAt: member.joinedAt,
      })),
    };
  }

  /**
   * Send a message to a chat
   * @param chatId - Chat ID
   * @param senderId - Keycloak user ID of the sender
   * @param dto - Message content
   * @returns Created message
   */
  async sendMessage(
    chatId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    // Verify chat exists and get members
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: true,
      },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    // Verify sender is a member of the chat
    const isMember = chat.members.some((member) => member.userId === senderId);

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    // Create the message and update chat's updatedAt in a transaction
    const message = await this.prisma.$transaction(async (tx) => {
      // Create message
      const newMessage = await tx.message.create({
        data: {
          chatId,
          senderId,
          content: dto.content,
        },
      });

      // Update chat's updatedAt timestamp (for sorting in chat list)
      await tx.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      return newMessage;
    });

    this.logger.log(`Message sent to chat: ${chatId}`, 'ChatService', {
      messageId: message.id,
      chatId,
      senderId,
    });

    return {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      content: message.content,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Add a member to a group chat
   * @param chatId - Chat ID
   * @param requesterId - Keycloak user ID of the user making the request
   * @param dto - User ID to add
   * @returns Updated chat with all members
   */
  async addMemberToChat(
    chatId: string,
    requesterId: string,
    dto: AddMemberDto,
  ): Promise<ChatResponseDto> {
    // Verify chat exists and get details
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: true,
      },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    // Verify chat is a GROUP chat (not DIRECT)
    if (chat.type !== ChatType.GROUP) {
      throw new BadRequestException('Can only add members to group chats');
    }

    // Verify requester is a member of the chat
    const isRequesterMember = chat.members.some(
      (member) => member.userId === requesterId,
    );

    if (!isRequesterMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    // Verify user to add is not already a member
    const isAlreadyMember = chat.members.some(
      (member) => member.userId === dto.userId,
    );

    if (isAlreadyMember) {
      throw new BadRequestException('User is already a member of this chat');
    }

    // Add the new member
    await this.prisma.chatMember.create({
      data: {
        chatId,
        userId: dto.userId,
      },
    });

    // Fetch updated chat with all members
    const updatedChat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    this.logger.log(`Member added to chat: ${chatId}`, 'ChatService', {
      chatId,
      newMemberId: dto.userId,
      requesterId,
    });

    return {
      id: updatedChat!.id,
      name: updatedChat!.name,
      type: updatedChat!.type,
      creatorId: updatedChat!.creatorId,
      createdAt: updatedChat!.createdAt,
      updatedAt: updatedChat!.updatedAt,
      members: updatedChat!.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        joinedAt: member.joinedAt,
      })),
    };
  }

  /**
   * Get chat messages with cursor-based pagination
   * @param chatId - Chat ID
   * @param userId - Keycloak user ID of the requesting user
   * @param cursorPageOptionsDto - Cursor pagination options
   * @returns Paginated list of messages
   */
  async getChatMessages(
    chatId: string,
    userId: string,
    cursorPageOptionsDto: CursorPageOptionsDto,
  ): Promise<CursorPaginatedDto<MessageResponseDto>> {
    // Verify chat exists and get members
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: true,
      },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    // Verify user is a member of the chat
    const isMember = chat.members.some((member) => member.userId === userId);

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    // Build orderBy - messages should be ordered by createdAt
    // Default to DESC (newest first) for chat messages
    const orderBy = {
      createdAt: cursorPageOptionsDto.order === Order.Asc ? 'asc' : 'desc',
    } as const;

    // Build where clause
    const where: {
      chatId: string;
      isDeleted: boolean;
      content?: { contains: string; mode: 'insensitive' };
    } = {
      chatId,
      isDeleted: false, // Only return non-deleted messages
    };

    // Add search filter if provided
    if (cursorPageOptionsDto.search) {
      where.content = {
        contains: cursorPageOptionsDto.search,
        mode: 'insensitive' as const,
      };
    }

    // Use cursor pagination utility
    const paginatedMessages = await cursorPaginateWithPrisma<
      MessageResponseDto,
      NonNullable<Parameters<typeof this.prisma.message.findMany>[0]>
    >(
      this.prisma.message,
      cursorPageOptionsDto,
      {
        where,
        orderBy,
      },
      'id', // Use 'id' as cursor field
    );

    // Automatically mark fetched messages as read (convenience feature)
    // This ensures messages are marked as read when user opens/scrolls through chat
    if (paginatedMessages.data.length > 0) {
      const messageIds = paginatedMessages.data.map((msg) => msg.id);
      // Fire and forget - don't await to avoid slowing down the response
      this.markMessagesAsRead(messageIds, userId).catch((error) => {
        this.logger.error(
          'Failed to auto-mark messages as read',
          'ChatService',
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            chatId,
            userId,
            messageCount: messageIds.length,
          },
        );
      });
    }

    this.logger.log(
      `Retrieved ${paginatedMessages.data.length} messages for chat: ${chatId}`,
      'ChatService',
      {
        chatId,
        userId,
        messageCount: paginatedMessages.data.length,
        hasNextPage: paginatedMessages.meta.hasNextPage,
        search: cursorPageOptionsDto.search,
      },
    );

    return paginatedMessages;
  }

  /**
   * Update (edit) a message
   * @param chatId - Chat ID
   * @param messageId - Message ID
   * @param userId - Keycloak user ID of the requesting user
   * @param dto - Updated message content
   * @returns Updated message
   */
  async updateMessage(
    chatId: string,
    messageId: string,
    userId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    // Verify chat exists and user is a member
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: true,
      },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    // Verify user is a member of the chat
    const isMember = chat.members.some((member) => member.userId === userId);

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    // Fetch the message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Verify message belongs to the chat
    if (message.chatId !== chatId) {
      throw new NotFoundException(
        `Message with ID ${messageId} not found in this chat`,
      );
    }

    // Verify message is not deleted
    if (message.isDeleted) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Verify user is the sender
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Check if message was created within the last 10 minutes
    const now = new Date();
    const createdAt = new Date(message.createdAt);
    const minutesSinceCreation =
      (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (minutesSinceCreation > 10) {
      throw new BadRequestException(
        'Messages can only be edited within 10 minutes of creation',
      );
    }

    // Update the message
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: dto.content,
        isEdited: true,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Message updated: ${messageId}`, 'ChatService', {
      messageId,
      chatId,
      userId,
      minutesSinceCreation: minutesSinceCreation.toFixed(2),
    });

    return {
      id: updatedMessage.id,
      chatId: updatedMessage.chatId,
      senderId: updatedMessage.senderId,
      content: updatedMessage.content,
      isEdited: updatedMessage.isEdited,
      isDeleted: updatedMessage.isDeleted,
      createdAt: updatedMessage.createdAt,
      updatedAt: updatedMessage.updatedAt,
    };
  }

  /**
   * Delete (soft delete) a message
   * @param chatId - Chat ID
   * @param messageId - Message ID
   * @param userId - Keycloak user ID of the requesting user
   * @returns Soft-deleted message
   */
  async deleteMessage(
    chatId: string,
    messageId: string,
    userId: string,
  ): Promise<MessageResponseDto> {
    // Verify chat exists and user is a member
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: true,
      },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    // Verify user is a member of the chat
    const isMember = chat.members.some((member) => member.userId === userId);

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    // Fetch the message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Verify message belongs to the chat
    if (message.chatId !== chatId) {
      throw new NotFoundException(
        `Message with ID ${messageId} not found in this chat`,
      );
    }

    // Verify message is not already deleted
    if (message.isDeleted) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Verify user is the sender
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Check if message was created within the last 10 minutes
    const now = new Date();
    const createdAt = new Date(message.createdAt);
    const minutesSinceCreation =
      (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (minutesSinceCreation > 10) {
      throw new BadRequestException(
        'Messages can only be deleted within 10 minutes of creation',
      );
    }

    // Soft delete the message
    const deletedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Message deleted: ${messageId}`, 'ChatService', {
      messageId,
      chatId,
      userId,
      minutesSinceCreation: minutesSinceCreation.toFixed(2),
    });

    return {
      id: deletedMessage.id,
      chatId: deletedMessage.chatId,
      senderId: deletedMessage.senderId,
      content: deletedMessage.content,
      isEdited: deletedMessage.isEdited,
      isDeleted: deletedMessage.isDeleted,
      createdAt: deletedMessage.createdAt,
      updatedAt: deletedMessage.updatedAt,
    };
  }

  /**
   * Mark a single message as read by a user
   * @param messageId - Message ID
   * @param userId - Keycloak user ID of the user marking the message as read
   * @returns void
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    // Verify message exists
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        chat: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Verify user is a member of the chat
    const isMember = message.chat.members.some(
      (member) => member.userId === userId,
    );

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    // Don't mark own messages as read
    if (message.senderId === userId) {
      return;
    }

    // Create MessageRead record (upsert to handle duplicate calls)
    await this.prisma.messageRead.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      create: {
        messageId,
        userId,
      },
      update: {
        readAt: new Date(),
      },
    });

    this.logger.log(`Message marked as read: ${messageId}`, 'ChatService', {
      messageId,
      userId,
      chatId: message.chatId,
    });
  }

  /**
   * Mark multiple messages as read by a user (bulk operation)
   * @param messageIds - Array of message IDs
   * @param userId - Keycloak user ID of the user marking messages as read
   * @returns void
   */
  async markMessagesAsRead(
    messageIds: string[],
    userId: string,
  ): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }

    // Fetch all messages to verify they exist and user is a member
    const messages = await this.prisma.message.findMany({
      where: {
        id: { in: messageIds },
      },
      include: {
        chat: {
          include: {
            members: true,
          },
        },
      },
    });

    if (messages.length === 0) {
      throw new NotFoundException('No messages found with the provided IDs');
    }

    // Verify user is a member of all chats
    const unauthorizedMessages = messages.filter(
      (message) =>
        !message.chat.members.some((member) => member.userId === userId),
    );

    if (unauthorizedMessages.length > 0) {
      throw new ForbiddenException('You are not a member of one or more chats');
    }

    // Filter out messages sent by the user (don't mark own messages as read)
    const messagesToMark = messages.filter(
      (message) => message.senderId !== userId,
    );

    if (messagesToMark.length === 0) {
      return;
    }

    // Create MessageRead records for all messages
    // Use createMany with skipDuplicates to handle already-read messages
    await this.prisma.messageRead.createMany({
      data: messagesToMark.map((message) => ({
        messageId: message.id,
        userId,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      `Marked ${messagesToMark.length} messages as read`,
      'ChatService',
      {
        userId,
        messageCount: messagesToMark.length,
        chatIds: [...new Set(messagesToMark.map((m) => m.chatId))],
      },
    );
  }
}
