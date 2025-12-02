import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateLinkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  customAlias?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Password to protect link. Set to null to remove password protection.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.password !== null)
  @IsString()
  @MinLength(6)
  password?: string | null;

  @ApiPropertyOptional({
    description: 'Scheduled activation date. Set to null to remove scheduling.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.scheduledAt !== null)
  @IsDateString()
  scheduledAt?: string | null;

  @ApiPropertyOptional({
    description: 'Expiration date. Set to null to remove expiration.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.expiresAt !== null)
  @IsDateString()
  expiresAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  clickLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOneTime?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tagIds?: string[];
}
