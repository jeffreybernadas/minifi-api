import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for adding a member to a group chat
 */
export class AddMemberDto {
  @ApiProperty({
    description: 'Keycloak user ID of the user to add to the chat',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
