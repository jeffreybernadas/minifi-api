import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';
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
    description: 'User phone number in E.164 format',
    example: '+1234567890',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +1234567890)',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'URL to user avatar image',
    example: 'https://example.com/avatar.jpg',
  })
  @IsUrl(
    { require_protocol: true },
    {
      message:
        'Avatar URL must be a valid URL with protocol (http:// or https://)',
    },
  )
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
