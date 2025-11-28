import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsArray,
  IsOptional,
  ArrayMinSize,
  ValidateIf,
  ArrayMaxSize,
} from 'class-validator';
import { ChatType } from '@/generated/prisma/client';

/**
 * DTO for creating a new chat
 */
export class CreateChatDto {
  @ApiProperty({
    description: 'Chat name (required for GROUP chats, optional for DIRECT)',
    example: 'Project Team Chat',
    required: false,
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.type === ChatType.GROUP)
  name?: string;

  @ApiProperty({
    description: 'Type of chat',
    enum: ChatType,
    example: ChatType.GROUP,
    default: ChatType.GROUP,
  })
  @IsEnum(ChatType)
  type: ChatType;

  @ApiProperty({
    description:
      'Array of Keycloak user IDs to add as members (excluding creator who is auto-added). For DIRECT chats, must contain exactly 1 user ID.',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100) // Reasonable limit for group chats
  @IsString({ each: true })
  memberIds: string[];
}
