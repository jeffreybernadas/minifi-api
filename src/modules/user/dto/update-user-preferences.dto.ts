import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating user preferences
 * Only app-specific fields can be updated (Keycloak fields are read-only)
 */
export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({
    description: 'Whether to receive email notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  emailNotificationsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'URL to user avatar image',
    example: 'https://example.com/avatar.jpg',
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'User address',
    example: '123 Main St, City, Country',
  })
  @IsString()
  @IsOptional()
  address?: string;
}
