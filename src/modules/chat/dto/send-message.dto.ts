import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

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
}
