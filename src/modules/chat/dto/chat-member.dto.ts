import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for chat member information
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
}
