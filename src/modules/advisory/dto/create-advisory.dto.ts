import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { AdvisoryType } from '@/generated/prisma/client';

export class CreateAdvisoryDto {
  @ApiProperty({
    description: 'Advisory title',
    example: 'Scheduled Maintenance',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'HTML content from rich text editor',
    example:
      '<p>We will be performing maintenance on <strong>January 1st</strong>.</p>',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Advisory type for styling',
    enum: AdvisoryType,
    default: AdvisoryType.INFO,
    example: AdvisoryType.INFO,
  })
  @IsOptional()
  @IsEnum(AdvisoryType)
  type?: AdvisoryType;

  @ApiPropertyOptional({
    description: 'When the advisory should expire (ISO 8601)',
    example: '2025-01-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
