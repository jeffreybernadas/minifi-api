import { ApiProperty } from '@nestjs/swagger';
import { ChatType } from '@/generated/prisma/client';
import { ChatMemberDto } from './chat-member.dto';

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

  @ApiProperty({
    description: 'List of chat members',
    type: [ChatMemberDto],
    required: false,
  })
  members?: ChatMemberDto[];
}
