import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for message sender info
 */
export class MessageSenderDto {
  @ApiProperty({
    description: 'Keycloak user ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  firstName?: string | null;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  lastName?: string | null;

  @ApiPropertyOptional({
    description: 'Username',
    example: 'johndoe',
  })
  username?: string | null;

  @ApiProperty({
    description: 'User email',
    example: 'john@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string | null;
}

/**
 * DTO for reply-to message context
 */
export class ReplyToDto {
  @ApiProperty({
    description: 'Original message ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  id: string;

  @ApiProperty({
    description: 'Original message content',
    example: 'Hello, team!',
  })
  content: string;

  @ApiProperty({
    description: 'Original message sender ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  senderId: string;

  @ApiProperty({
    description: 'Whether the original message was deleted',
    example: false,
  })
  isDeleted: boolean;
}

/**
 * DTO for message response
 */
export class MessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Chat ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  chatId: string;

  @ApiProperty({
    description: 'Sender Keycloak user ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  senderId: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, team!',
  })
  content: string;

  @ApiProperty({
    description: 'Whether message has been edited',
    example: false,
  })
  isEdited: boolean;

  @ApiProperty({
    description: 'Whether message has been deleted',
    example: false,
  })
  isDeleted: boolean;

  @ApiProperty({
    description: 'Timestamp when message was created',
    example: '2025-10-05T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when message was last updated',
    example: '2025-10-05T12:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'ID of the message this is replying to',
    example: '123e4567-e89b-12d3-a456-426614174003',
    nullable: true,
  })
  replyToId?: string | null;

  @ApiPropertyOptional({
    description: 'Reply-to message context (populated when fetching messages)',
    type: ReplyToDto,
    nullable: true,
  })
  replyTo?: ReplyToDto | null;

  @ApiPropertyOptional({
    description: 'Sender user details (populated when fetching messages)',
    type: MessageSenderDto,
    nullable: true,
  })
  sender?: MessageSenderDto | null;
}
