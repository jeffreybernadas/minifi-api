import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for chat member information with user details
 */
export class ChatMemberDto {
  @ApiProperty({
    description: 'Chat member ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Keycloak user ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Timestamp when user joined the chat',
    example: '2025-10-05T12:00:00.000Z',
  })
  joinedAt: Date;

  @ApiPropertyOptional({
    description: 'Display name of the user (firstName + lastName or username)',
    example: 'John Doe',
  })
  displayName?: string | null;

  @ApiPropertyOptional({
    description: 'User email',
    example: 'john@example.com',
  })
  email?: string | null;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string | null;
}
