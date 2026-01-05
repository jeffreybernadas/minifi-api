import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsArray,
  IsOptional,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { ChatType } from '@/generated/prisma/client';

/**
 * DTO for creating a new chat
 *
 * For PRO-to-Admin chat:
 * - type: DIRECT (GROUP is blocked by GroupChatBlockerGuard)
 * - memberIds: Optional - admin is auto-injected by backend
 * - name: Optional - not used for DIRECT chats
 */
export class CreateChatDto {
  @ApiProperty({
    description: 'Chat name (optional, not used for DIRECT chats with admin)',
    example: 'Support Chat',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Type of chat. Only DIRECT is allowed (GROUP is blocked).',
    enum: ChatType,
    example: ChatType.DIRECT,
    default: ChatType.DIRECT,
  })
  @IsEnum(ChatType)
  type: ChatType;

  @ApiProperty({
    description:
      'Optional array of member IDs. For PRO-to-admin chat, this is ignored - admin is auto-assigned.',
    example: [],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  memberIds?: string[];
}
