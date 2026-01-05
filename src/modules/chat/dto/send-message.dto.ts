import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
} from 'class-validator';

/**
 * DTO for sending a message to a chat
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello, team! How is everyone doing?',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    description: 'ID of the message being replied to (optional)',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}
