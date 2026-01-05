import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatType } from '@/generated/prisma/client';
import { ChatMemberDto } from './chat-member.dto';

/**
 * DTO for last message preview in chat list
 */
export class LastMessageDto {
  @ApiProperty({
    description: 'Message ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Message content preview',
    example: 'Hello, how can I help you?',
  })
  content: string;

  @ApiProperty({
    description: 'Sender user ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  senderId: string;

  @ApiProperty({
    description: 'Whether the message was deleted',
    example: false,
  })
  isDeleted: boolean;

  @ApiProperty({
    description: 'Timestamp when message was created',
    example: '2025-10-05T12:00:00.000Z',
  })
  createdAt: Date;
}

/**
 * DTO for chat response
 */
export class ChatResponseDto {
  @ApiProperty({
    description: 'Chat ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Chat name',
    example: 'Project Team Chat',
    required: false,
  })
  name?: string | null;

  @ApiProperty({
    description: 'Type of chat',
    enum: ChatType,
    example: ChatType.GROUP,
  })
  type: ChatType;

  @ApiProperty({
    description: 'Keycloak user ID of the chat creator',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  creatorId: string;

  @ApiProperty({
    description: 'Timestamp when chat was created',
    example: '2025-10-05T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when chat was last updated',
    example: '2025-10-05T12:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'List of chat members with user details',
    type: [ChatMemberDto],
  })
  members?: ChatMemberDto[];

  @ApiPropertyOptional({
    description: 'Last message in the chat (for preview in chat list)',
    type: LastMessageDto,
  })
  lastMessage?: LastMessageDto | null;

  @ApiPropertyOptional({
    description: 'Number of unread messages for the current user',
    example: 3,
  })
  unreadCount?: number;
}
